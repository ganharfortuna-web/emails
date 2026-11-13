import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { classificarErro, calcularProximaTentativa } from '@/lib/bounce'
import { prepararHtmlEmail } from '@/lib/email-html'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) { return handleCron(request) }
export async function POST(request: Request) { return handleCron(request) }

async function handleCron(request: Request) {
  // 1. Segurança: Valida o Token
  const { searchParams } = new URL(request.url)
  const tokenQuery = searchParams.get('token')
  const tokenHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if ((tokenHeader || tokenQuery) !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 2. Ativa campanhas agendadas que já chegaram na hora
    await supabase.from('campanhas').update({ status: 'Em Fila' })
      .eq('status', 'Agendada').lte('scheduled_at', new Date().toISOString())

    // 3. Busca campanhas pausadas para ignorar
    const { data: pausadas } = await supabase.from('campanhas').select('id').eq('status', 'Pausada')
    const idsPausados = (pausadas || []).map((c: any) => c.id)

    // 4. Busca e-mails suprimidos
    const { data: suprimidos } = await supabase.from('suppression_list').select('email')
    const emailsSuprimidos = new Set((suprimidos || []).map(s => (s.email || '').toLowerCase()))

    // 5. Busca conta ativa e verifica limite
    const { data: contas } = await supabase.from('smtp_accounts').select('*')
      .eq('is_active', true).order('sent_today', { ascending: true }).limit(1)

    if (!contas || contas.length === 0) {
      return NextResponse.json({ message: 'Sem contas ativas.' })
    }

    const conta = contas[0]
    if ((conta.sent_today || 0) >= (conta.daily_limit || 450)) {
      return NextResponse.json({ message: 'Limite diário atingido.' })
    }

    // 6. Busca a fila (BATCH_SIZE = 5)
    const { data: filaRaw } = await supabase.from('email_queue').select('*')
      .eq('status', 'pending').order('created_at', { ascending: true }).limit(50) // Pega 50 p/ filtrar e sobrar 5

    if (!filaRaw || filaRaw.length === 0) {
      return NextResponse.json({ message: 'Fila vazia.' })
    }

    // 7. Filtra e limpa a fila (remove pausados e suprimidos)
    const filaFiltrada: any[] = []
    for (const item of filaRaw) {
      if (idsPausados.includes(item.campaign_id)) continue
      
      if (emailsSuprimidos.has((item.recipient_email || '').toLowerCase())) {
        await supabase.from('email_queue').update({ 
          status: 'failed', 
          error_log: 'Ignorado: E-mail suprimido/descadastrado.' 
        }).eq('id', item.id)
        continue
      }
      
      filaFiltrada.push(item)
      if (filaFiltrada.length >= 5) break
    }

    if (filaFiltrada.length === 0) {
      return NextResponse.json({ message: 'Sem e-mails elegíveis nesta rodada.' })
    }

    // 8. Configura o Transporter (Timeouts curtos para não estourar a Vercel)
    const transporter = nodemailer.createTransport({
      host: conta.host || 'smtp.gmail.com',
      port: Number(conta.port) || 587,
      secure: Number(conta.port) === 465,
      auth: { user: conta.email, pass: conta.app_password },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    })

    let enviados = 0
    const campaignIds = new Set<string | number>()

    // 9. Loop de envio com tratamento completo de Bounce
    for (const item of filaFiltrada) {
      try {
        // Personalização
        let corpoPersonalizado = item.body || ''
        corpoPersonalizado = corpoPersonalizado
          .replace(/\{\{email\}\}/gi, item.recipient_email || '')
          .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')
        
        corpoPersonalizado = prepararHtmlEmail(corpoPersonalizado)

        // Tracking e Footer
        let htmlFinal = corpoPersonalizado
        if (baseUrl) {
          htmlFinal = htmlFinal.replace(/href="(https?:\/\/[^"]+)"/g, (_m: string, url: string) => 
            `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`)
          
          const pixel = `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" alt="" />`
          const unsubUrl = `${baseUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.recipient_email)}`
          const footer = `<hr style="margin:32px 0 16px;border:none;border-top:1px solid #e2e8f0;" /><p style="font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;text-align:center;">Este e-mail foi enviado para <strong>${item.recipient_email}</strong><br/>Não quer mais receber? <a href="${unsubUrl}" style="color:#64748b;">Clique aqui para descadastrar</a>.</p>`
          
          htmlFinal += footer + pixel
        }

        // Envio
        await transporter.sendMail({
          from: {
            name: (conta.sender_name || 'Equipe').replace(/[^\x00-\x7F]/g, ''),
            address: conta.sender_email || conta.email,
          },
          to: item.recipient_email,
          subject: item.subject,
          html: htmlFinal,
          encoding: 'utf-8',
        })

        // Atualiza Fila
        await supabase.from('email_queue').update({ 
          status: 'sent', 
          sent_at: new Date().toISOString(), 
          retry_count: 0,
          smtp_account_id: conta.id 
        }).eq('id', item.id)

        conta.sent_today = (conta.sent_today || 0) + 1
        enviados++
        if (item.campaign_id) campaignIds.add(item.campaign_id)
        
      } catch (err: any) {
        const classificacao = classificarErro(err.message, err.response)
        const retryCount = (item.retry_count || 0) + 1
        const podeRetentar = classificacao.retryable && retryCount < 3

        console.error(`Bounce ${classificacao.type} para ${item.recipient_email}:`, err.message)

        // Salva no Log de Bounces
        await supabase.from('bounce_log').insert([{
          email_queue_id: item.id,
          campaign_id: item.campaign_id,
          recipient_email: item.recipient_email,
          bounce_type: classificacao.type,
          error_code: classificacao.code,
          error_message: err.message?.slice(0, 500),
          smtp_account_id: conta.id,
        }])

        if (podeRetentar) {
          await supabase.from('email_queue').update({
            status: 'pending',
            error_log: err.message?.slice(0, 500),
            bounce_type: classificacao.type,
            retry_count: retryCount,
            next_retry_at: calcularProximaTentativa(retryCount).toISOString(),
          }).eq('id', item.id)
        } else {
          await supabase.from('email_queue').update({
            status: 'failed',
            error_log: err.message?.slice(0, 500),
            bounce_type: classificacao.type,
            retry_count: retryCount,
          }).eq('id', item.id)

          // Ações de Hard Bounce / Bloqueio
          if (classificacao.action === 'block_contact') {
            await supabase.from('contatos').update({
              status: 'bounced',
              last_bounce_at: new Date().toISOString(),
              last_bounce_reason: err.message?.slice(0, 300),
            }).eq('email', (item.recipient_email || '').toLowerCase())

            await supabase.from('suppression_list').upsert([{
              email: (item.recipient_email || '').toLowerCase(),
              reason: classificacao.type === 'complaint' ? 'complaint' : 'hard_bounce',
              original_error: err.message?.slice(0, 300),
            }], { onConflict: 'email' })
          }

          // Desativa conta se for erro de Auth
          if (classificacao.action === 'disable_account') {
            await supabase.from('smtp_accounts').update({ is_active: false }).eq('id', conta.id)
            console.error(`🚫 Conta ${conta.email} desativada (auth error)`)
          }
        }
      }
    }

    // 10. Atualiza o contador da conta
    if (enviados > 0) {
      await supabase.from('smtp_accounts')
        .update({ sent_today: (conta.sent_today || 0) }) // Valor já atualizado no loop
        .eq('id', conta.id)
    }

    // 11. Atualiza o status das campanhas afetadas
    for (const cid of campaignIds) {
      const { count } = await supabase.from('email_queue')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', cid).eq('status', 'pending')
      await supabase.from('campanhas')
        .update({ status: (count || 0) === 0 ? 'Enviada' : 'Enviando...' })
        .eq('id', cid)
    }

    console.log(`✅ Cron finalizado: ${enviados} e-mails enviados.`)
    return NextResponse.json({ success: true, enviados })

  } catch (error: any) {
    console.error('ERRO CRON:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}