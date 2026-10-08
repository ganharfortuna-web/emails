import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { classificarErro, calcularProximaTentativa } from '@/lib/bounce'

export const dynamic = 'force-dynamic'

const BATCH_SIZE = 8

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { campanhaId } = await request.json().catch(() => ({}))

    // 1. Se veio campanha específica, verifica se está pausada
    if (campanhaId) {
      const { data: camp } = await supabase
        .from('campanhas')
        .select('status')
        .eq('id', campanhaId)
        .single()

      if (camp?.status === 'Pausada') {
        return NextResponse.json({
          success: true, processed: 0, enviados: 0, restantes: 0, done: false, pausada: true,
        })
      }
    }

    // 2. Campanhas pausadas
    const { data: pausadas } = await supabase
      .from('campanhas').select('id').eq('status', 'Pausada')
    const idsPausados = (pausadas || []).map((c: any) => c.id)

    // 3. Emails suprimidos
    const { data: suprimidos } = await supabase
      .from('suppression_list').select('email')
    const emailsSuprimidos = new Set(
      (suprimidos || []).map(s => (s.email || '').toLowerCase())
    )

    // 4. Contas ativas ordenadas pela menos usada
    const { data: contas } = await supabase
      .from('smtp_accounts')
      .select('*')
      .eq('is_active', true)
      .lt('sent_today', 450)
      .order('sent_today', { ascending: true })

    if (!contas || contas.length === 0) {
      return NextResponse.json(
        { error: 'Limite diário de todas as contas atingido.', done: true, restantes: 0, enviados: 0 },
        { status: 200 }
      )
    }

    // 5. Próximo lote (respeitando next_retry_at)
    const agora = new Date().toISOString()
    let query = supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .or(`next_retry_at.is.null,next_retry_at.lte.${agora}`)
      .order('created_at', { ascending: true })
      .limit(30)

    if (campanhaId) query = query.eq('campaign_id', campanhaId)

    const { data: filaRaw, error: filaError } = await query

    if (filaError) {
      return NextResponse.json({ error: filaError.message }, { status: 500 })
    }

    // 6. Filtra pausadas + suprimidas
    const fila = (filaRaw || [])
      .filter(item => !idsPausados.includes(item.campaign_id))
      .filter(item => !emailsSuprimidos.has((item.recipient_email || '').toLowerCase()))
      .slice(0, BATCH_SIZE)

    if (fila.length === 0) {
      if (campanhaId && !idsPausados.includes(campanhaId)) {
        await supabase.from('campanhas').update({ status: 'Enviada' }).eq('id', campanhaId)
      }
      return NextResponse.json({ success: true, processed: 0, enviados: 0, restantes: 0, done: true })
    }

    let enviados = 0
    const campaignIds = new Set<string | number>()

    for (const item of fila) {
      const contaAtual = contas[enviados % contas.length]
      if (!contaAtual) continue

      const transporter = nodemailer.createTransport({
        host: contaAtual.host || 'smtp.gmail.com',
        port: contaAtual.port || 587,
        secure: contaAtual.port === 465,
        auth: { user: contaAtual.email, pass: contaAtual.app_password },
      })

      // ===== PERSONALIZAÇÃO POR DESTINATÁRIO =====
      let corpoPersonalizado = item.body || ''
      corpoPersonalizado = corpoPersonalizado
        .replace(/\{\{email\}\}/gi, item.recipient_email || '')
        .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')

      // ===== REESCREVE LINKS + PIXEL + FOOTER =====
      let htmlFinal = corpoPersonalizado
      if (baseUrl) {
        htmlFinal = htmlFinal.replace(
          /href="(https?:\/\/[^"]+)"/g,
          (_m: string, url: string) =>
            `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`
        )

        const pixel = `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" alt="" />`
        const unsubUrl = `${baseUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.recipient_email)}`

        const footer = `
<hr style="margin:32px 0 16px;border:none;border-top:1px solid #e2e8f0;" />
<p style="font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;margin:0 0 8px 0;">
  Este e-mail foi enviado para <strong style="color:#64748b;">${item.recipient_email}</strong>
</p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;margin:0;">
  <br/>
  Não quer mais receber? <a href="${unsubUrl}" style="color:#64748b;text-decoration:underline;">Clique aqui para descadastrar</a>.
</p>`

        htmlFinal += footer + pixel
      }

      try {
        await transporter.sendMail({
          from: `"${contaAtual.sender_name}" <${contaAtual.email}>`,
          to: item.recipient_email,
          subject: item.subject,
          html: htmlFinal,
        })

        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString(), retry_count: 0 })
          .eq('id', item.id)

        await supabase
          .from('smtp_accounts')
          .update({ sent_today: (contaAtual.sent_today || 0) + 1 })
          .eq('id', contaAtual.id)

        contaAtual.sent_today = (contaAtual.sent_today || 0) + 1
        enviados++
        if (item.campaign_id) campaignIds.add(item.campaign_id)
      } catch (err: any) {
        const classificacao = classificarErro(err.message, err.response)
        const retryCount = (item.retry_count || 0) + 1
        const podeRetentar = classificacao.retryable && retryCount < 3

        console.error(`Bounce ${classificacao.type} para ${item.recipient_email}:`, err.message)

        await supabase.from('bounce_log').insert([{
          email_queue_id: item.id,
          campaign_id: item.campaign_id,
          recipient_email: item.recipient_email,
          bounce_type: classificacao.type,
          error_code: classificacao.code,
          error_message: err.message?.slice(0, 500),
          smtp_account_id: contaAtual.id,
        }])

        if (podeRetentar) {
          await supabase
            .from('email_queue')
            .update({
              status: 'pending',
              error_log: err.message?.slice(0, 500),
              bounce_type: classificacao.type,
              retry_count: retryCount,
              next_retry_at: calcularProximaTentativa(retryCount).toISOString(),
            })
            .eq('id', item.id)
        } else {
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              error_log: err.message?.slice(0, 500),
              bounce_type: classificacao.type,
              retry_count: retryCount,
            })
            .eq('id', item.id)

          if (classificacao.action === 'block_contact') {
            await supabase
              .from('contatos')
              .update({
                status: 'bounced',
                last_bounce_at: new Date().toISOString(),
                last_bounce_reason: err.message?.slice(0, 300),
              })
              .eq('email', (item.recipient_email || '').toLowerCase())

            await supabase
              .from('suppression_list')
              .upsert([{
                email: (item.recipient_email || '').toLowerCase(),
                reason: classificacao.type === 'complaint' ? 'complaint' : 'hard_bounce',
                original_error: err.message?.slice(0, 300),
              }], { onConflict: 'email' })
          }

          if (classificacao.type === 'soft' || classificacao.type === 'unknown') {
            const { data: contato } = await supabase
              .from('contatos')
              .select('bounce_count')
              .eq('email', (item.recipient_email || '').toLowerCase())
              .single()

            await supabase
              .from('contatos')
              .update({
                bounce_count: (contato?.bounce_count || 0) + 1,
                last_bounce_at: new Date().toISOString(),
              })
              .eq('email', (item.recipient_email || '').toLowerCase())
          }

          if (classificacao.action === 'disable_account') {
            await supabase
              .from('smtp_accounts')
              .update({ is_active: false })
              .eq('id', contaAtual.id)
            console.error(`🚫 Conta ${contaAtual.email} desativada (auth error)`)
          }
        }
      }
    }

    // 7. Conta restantes
    const agoraContagem = new Date().toISOString()
    let countQuery = supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .or(`next_retry_at.is.null,next_retry_at.lte.${agoraContagem}`)
    if (campanhaId) countQuery = countQuery.eq('campaign_id', campanhaId)

    const { count: restantesRaw } = await countQuery
    const restantes = restantesRaw || 0
    const done = restantes === 0

    // 8. Atualiza status das campanhas
    for (const cid of campaignIds) {
      if (idsPausados.includes(cid)) continue
      await supabase
        .from('campanhas')
        .update({ status: done ? 'Enviada' : 'Enviando...' })
        .eq('id', cid)
    }

    if (campanhaId && !campaignIds.has(campanhaId) && !idsPausados.includes(campanhaId)) {
      await supabase
        .from('campanhas')
        .update({ status: done ? 'Enviada' : 'Enviando...' })
        .eq('id', campanhaId)
    }

    return NextResponse.json({
      success: true, processed: fila.length, enviados, restantes, done,
    })
  } catch (error: any) {
    console.error('ERRO /api/disparo/processar:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
