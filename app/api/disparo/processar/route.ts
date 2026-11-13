import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { classificarErro, calcularProximaTentativa } from '@/lib/bounce'
import { prepararHtmlEmail } from '@/lib/email-html'

export const dynamic = 'force-dynamic'

// Lote seguro para não estourar o tempo da Vercel
const BATCH_SIZE = 30

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { campanhaId } = await request.json().catch(() => ({}))

    if (campanhaId) {
      const { data: camp } = await supabase.from('campanhas').select('status').eq('id', campanhaId).single()
      if (camp?.status === 'Pausada') {
        return NextResponse.json({ success: true, processed: 0, enviados: 0, restantes: 0, done: false, pausada: true })
      }
    }

    const { data: pausadas } = await supabase.from('campanhas').select('id').eq('status', 'Pausada')
    const idsPausados = (pausadas || []).map((c: any) => c.id)

    const { data: suprimidos } = await supabase.from('suppression_list').select('email')
    const emailsSuprimidos = new Set((suprimidos || []).map((s: any) => (s.email || '').toLowerCase()))

    const { data: contaUnica, error: contaError } = await supabase
      .from('smtp_accounts').select('*').eq('is_active', true).limit(1).single()

    if (contaError || !contaUnica) {
      return NextResponse.json({ error: 'Nenhuma conta ativa.', done: true, restantes: 0, enviados: 0 }, { status: 400 })
    }

    if ((contaUnica.sent_today || 0) >= (contaUnica.daily_limit || 450)) {
      return NextResponse.json({ error: 'Limite diário atingido.', done: true, restantes: 0, enviados: 0 }, { status: 200 })
    }

    let query = supabase.from('email_queue').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(100)
    if (campanhaId) query = query.eq('campaign_id', campanhaId)
    if (idsPausados.length > 0) query = query.not('campaign_id', 'in', `(${idsPausados.join(',')})`)

    const { data: filaRaw, error: filaError } = await query
    if (filaError) return NextResponse.json({ error: filaError.message }, { status: 500 })

    const fila: any[] = []
    for (const item of (filaRaw || [])) {
      if (emailsSuprimidos.has((item.recipient_email || '').toLowerCase())) {
        await supabase.from('email_queue').update({ status: 'failed', error_log: 'Ignorado: Suprimido.' }).eq('id', item.id)
        continue
      }
      fila.push(item)
      if (fila.length >= BATCH_SIZE) break
    }

    if (fila.length === 0) {
      let countQuery = supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      if (campanhaId) countQuery = countQuery.eq('campaign_id', campanhaId)
      if (idsPausados.length > 0) countQuery = countQuery.not('campaign_id', 'in', `(${idsPausados.join(',')})`)

      const { count: restantes } = await countQuery
      const totalRestante = restantes || 0
      const done = totalRestante === 0

      if (done && campanhaId) {
        await supabase.from('campanhas').update({ status: 'Enviada' }).eq('id', campanhaId)
      }
      return NextResponse.json({ success: true, processed: 0, enviados: 0, restantes: totalRestante, done })
    }

    let enviados = 0
    const campaignIds = new Set<string | number>()

    const transporter = nodemailer.createTransport({
      host: contaUnica.host || 'smtp.gmail.com',
      port: contaUnica.port || 587,
      secure: contaUnica.port === 465,
      auth: { user: contaUnica.email, pass: contaUnica.app_password },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
    })

    for (const item of fila) {
      let corpoPersonalizado = item.body || ''
      corpoPersonalizado = corpoPersonalizado
        .replace(/\{\{email\}\}/gi, item.recipient_email || '')
        .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')

      corpoPersonalizado = prepararHtmlEmail(corpoPersonalizado)

      let htmlFinal = corpoPersonalizado
      if (baseUrl) {
        // ✅ AQUI ESTÁ A CORREÇÃO DO TYPESCRIPT: os parâmetros agora são :string
        htmlFinal = htmlFinal.replace(
          /href=(["'])(https?:\/\/[^"']+)\1/gi, 
          (_m: string, quote: string, url: string) =>
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
  Não quer mais receber? <a href="${unsubUrl}" style="color:#64748b;text-decoration:underline;">Clique aqui para descadastrar</a>.
</p>`

        htmlFinal += footer + pixel
      }

      try {
        await transporter.sendMail({
          from: { name: (contaUnica.sender_name || 'Equipe').replace(/[^\x00-\x7F]/g, ''), address: contaUnica.sender_email || contaUnica.email },
          to: item.recipient_email, subject: item.subject, html: htmlFinal, encoding: 'utf-8',
          headers: { 'Content-Type': 'text/html; charset=UTF-8' },
        })

        await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString(), retry_count: 0, smtp_account_id: contaUnica.id }).eq('id', item.id)
        await supabase.from('smtp_accounts').update({ sent_today: (contaUnica.sent_today || 0) + 1 }).eq('id', contaUnica.id)

        contaUnica.sent_today = (contaUnica.sent_today || 0) + 1
        enviados++
        if (item.campaign_id) campaignIds.add(item.campaign_id)
      } catch (err: any) {
        const classificacao = classificarErro(err.message, err.response)
        const retryCount = (item.retry_count || 0) + 1
        const podeRetentar = classificacao.retryable && retryCount < 3

        await supabase.from('bounce_log').insert([{
          email_queue_id: item.id, campaign_id: item.campaign_id, recipient_email: item.recipient_email,
          bounce_type: classificacao.type, error_code: classificacao.code, error_message: err.message?.slice(0, 500), smtp_account_id: contaUnica.id,
        }])

        if (podeRetentar) {
          await supabase.from('email_queue').update({
              status: 'pending', error_log: err.message?.slice(0, 500), bounce_type: classificacao.type,
              retry_count: retryCount, next_retry_at: calcularProximaTentativa(retryCount).toISOString(),
            }).eq('id', item.id)
        } else {
          await supabase.from('email_queue').update({
              status: 'failed', error_log: err.message?.slice(0, 500), bounce_type: classificacao.type, retry_count: retryCount,
            }).eq('id', item.id)

          if (classificacao.action === 'block_contact') {
            await supabase.from('contatos').update({ status: 'bounced', last_bounce_at: new Date().toISOString(), last_bounce_reason: err.message?.slice(0, 300) }).eq('email', (item.recipient_email || '').toLowerCase())
            await supabase.from('suppression_list').upsert([{ email: (item.recipient_email || '').toLowerCase(), reason: classificacao.type === 'complaint' ? 'complaint' : 'hard_bounce', original_error: err.message?.slice(0, 300) }], { onConflict: 'email' })
          }
          if (classificacao.type === 'soft' || classificacao.type === 'unknown') {
            const { data: contato } = await supabase.from('contatos').select('bounce_count').eq('email', (item.recipient_email || '').toLowerCase()).single()
            await supabase.from('contatos').update({ bounce_count: (contato?.bounce_count || 0) + 1, last_bounce_at: new Date().toISOString() }).eq('email', (item.recipient_email || '').toLowerCase())
          }
          if (classificacao.action === 'disable_account') {
            await supabase.from('smtp_accounts').update({ is_active: false }).eq('id', contaUnica.id)
          }
        }
      }
    }

    let countQuery = supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    if (campanhaId) countQuery = countQuery.eq('campaign_id', campanhaId)
    if (idsPausados.length > 0) countQuery = countQuery.not('campaign_id', 'in', `(${idsPausados.join(',')})`)

    const { count: restantesRaw } = await countQuery
    const restantes = restantesRaw || 0
    const done = restantes === 0

    const campanhasParaAtualizar = new Set<string | number>(campaignIds)
    if (campanhaId) campanhasParaAtualizar.add(campanhaId)

    for (const cid of campanhasParaAtualizar) {
      if (idsPausados.includes(cid)) continue
      const { count: pendentesDaCampanha } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', cid).eq('status', 'pending')
      await supabase.from('campanhas').update({ status: (pendentesDaCampanha || 0) === 0 ? 'Enviada' : 'Enviando...' }).eq('id', cid)
    }

    return NextResponse.json({ success: true, processed: fila.length, enviados, restantes, done })
  } catch (error: any) {
    console.error('ERRO /api/disparo/processar:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
