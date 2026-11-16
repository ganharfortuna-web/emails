import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { prepararHtmlEmail } from '@/lib/email-html'

export const dynamic = 'force-dynamic'
export const maxDuration = 60;

const BATCH_SIZE = 30; 

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: conta } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).limit(1).single()
    if (!conta) return NextResponse.json({ error: 'Sem conta SMTP' }, { status: 400 })

    // ✅ CORREÇÃO AQUI: Busca os IDs das campanhas que estão pausadas
    const { data: pausadas } = await supabase.from('campanhas').select('id').eq('status', 'Pausada')
    const idsPausados = (pausadas || []).map((c: any) => c.id)

    // Monta a query da fila ignorando as campanhas pausadas
    let query = supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
    
    if (idsPausados.length > 0) {
      query = query.not('campaign_id', 'in', `(${idsPausados.join(',')})`)
    }

    const { data: lote } = await query
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    // Se todos os e-mails da fila forem de campanhas pausadas, ele não faz nada
    if (!lote || lote.length === 0) {
      return NextResponse.json({ message: 'Fila vazia ou campanhas pausadas' })
    }

    const transporter = nodemailer.createTransport({
      pool: true, 
      host: conta.host, 
      port: Number(conta.port), 
      secure: Number(conta.port) === 465,
      auth: { user: conta.email, pass: conta.app_password }, 
      tls: { rejectUnauthorized: false },
    })

    let enviados = 0;

    for (const item of lote) {
      try {
        let corpo = (item.body || '').replace(/\{\{email\}\}/gi, item.recipient_email || '').replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')
        corpo = prepararHtmlEmail(corpo)
        
        if (baseUrl) {
          corpo = corpo.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m: string, quote: string, url: string) => `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`) + `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" />`
        }

        await transporter.sendMail({
          from: { name: conta.sender_name || 'Equipe', address: conta.sender_email || conta.email },
          to: item.recipient_email, subject: item.subject, html: corpo,
        })

        await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id)
        await supabase.from('smtp_accounts').update({ sent_today: (conta.sent_today || 0) + 1 }).eq('id', conta.id)
        enviados++;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err: any) {
        await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500) }).eq('id', item.id)
      }
    }

    if (enviados > 0) {
      await supabase.rpc('increment_qstash_counter')
    }

    return NextResponse.json({ success: true, enviados })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
