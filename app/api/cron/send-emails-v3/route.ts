import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { classificarErro, calcularProximaTentativa } from '@/lib/bounce'
import { prepararHtmlEmail } from '@/lib/email-html'

export const dynamic = 'force-dynamic'
export const maxDuration = 60; // Permite a Vercel rodar por até 60s

// ✅ Lote seguro de 15 e-mails
const BATCH_SIZE = 15

export async function GET(request: Request) { return handleCron(request) }

async function handleCron(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenQuery = searchParams.get('token')
  const tokenHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if ((tokenHeader || tokenQuery) !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

  const supabase = createClient(supabaseUrl!, supabaseKey!)

  try {
    // 1. Verifica se a conta SMTP está ativa e qual o limite
    const { data: contas } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).order('sent_today', { ascending: true }).limit(1)
    if (!contas || contas.length === 0) return NextResponse.json({ message: 'Sem contas ativas.' })
    
    const conta = contas[0]
    // Respeita o limite dinâmico configurado (80.000)
    if ((conta.sent_today || 0) >= (conta.daily_limit || 80000)) {
      return NextResponse.json({ message: 'Limite diário atingido.' })
    }

    // 2. Busca e-mails pendentes na fila
    const { data: filaRaw } = await supabase.from('email_queue').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(50)
    if (!filaRaw || filaRaw.length === 0) return NextResponse.json({ message: 'Fila vazia.' })

    // 3. Filtra descadastrados
    const { data: suprimidos } = await supabase.from('suppression_list').select('email')
    const emailsSuprimidos = new Set((suprimidos || []).map(s => (s.email || '').toLowerCase()))

    const filaFiltrada = filaRaw.filter(i => !emailsSuprimidos.has((i.recipient_email || '').toLowerCase())).slice(0, BATCH_SIZE)
    if (filaFiltrada.length === 0) return NextResponse.json({ message: 'Sem elegíveis.' })

    // 4. Configura o envio
    const transporter = nodemailer.createTransport({
      host: conta.host || 'smtp.gmail.com', 
      port: Number(conta.port) || 587,
      secure: Number(conta.port) === 465,
      auth: { user: conta.email, pass: conta.app_password }, 
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    })

    let enviados = 0
    const campaignIds = new Set<string | number>()

    // 5. Loop de envio
    for (const item of filaFiltrada) {
      try {
        let corpo = (item.body || '').replace(/\{\{email\}\}/gi, item.recipient_email || '').replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')
        corpo = prepararHtmlEmail(corpo)

        let htmlFinal = corpo
        if (baseUrl) {
          htmlFinal = htmlFinal.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m: string, quote: string, url: string) => 
            `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`
          )
          htmlFinal += `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" />`
        }

        await transporter.sendMail({
          from: { name: conta.sender_name || 'Equipe', address: conta.sender_email || conta.email },
          to: item.recipient_email, subject: item.subject, html: htmlFinal,
        })

        await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id)
        conta.sent_today++
        enviados++
        if (item.campaign_id) campaignIds.add(item.campaign_id)
      } catch (err: any) {
        const classificacao = classificarErro(err.message, err.response)
        const retryCount = (item.retry_count || 0) + 1
        
        if (classificacao.retryable && retryCount < 3) {
          await supabase.from('email_queue').update({
            status: 'pending', error_log: err.message?.slice(0, 500),
            retry_count: retryCount, next_retry_at: calcularProximaTentativa(retryCount).toISOString(),
          }).eq('id', item.id)
        } else {
          await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500) }).eq('id', item.id)
        }
      }
    }

    // 6. Atualiza o contador e o status da campanha
    if (enviados > 0) await supabase.from('smtp_accounts').update({ sent_today: conta.sent_today }).eq('id', conta.id)
    
    for (const cid of campaignIds) {
      const { count } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', cid).eq('status', 'pending')
      await supabase.from('campanhas').update({ status: (count || 0) === 0 ? 'Enviada' : 'Enviando...' }).eq('id', cid)
    }

    return NextResponse.json({ success: true, enviados })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
