import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { classificarErro, calcularProximaTentativa } from '@/lib/bounce'
import { prepararHtmlEmail } from '@/lib/email-html'

export const dynamic = 'force-dynamic'
const BATCH_SIZE = 30

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ganharfortuna-web.vercel.app'
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: settings } = await supabase.from('system_settings').select('active_provider').eq('id', 1).single()
    if (settings?.active_provider !== 'inngest') {
      return NextResponse.json({ error: 'Ignorado: QStash está ativo.' }, { status: 400 })
    }

    const { campanhaId } = await request.json().catch(() => ({}))

    if (campanhaId) {
      const { data: camp } = await supabase.from('campanhas').select('status').eq('id', campanhaId).single()
      if (camp?.status === 'Pausada') return NextResponse.json({ success: true, processed: 0, enviados: 0, restantes: 0, done: false, pausada: true })
    }

    const { data: pausadas } = await supabase.from('campanhas').select('id').eq('status', 'Pausada')
    const idsPausados = (pausadas || []).map((c: any) => c.id)

    const { data: suprimidos } = await supabase.from('suppression_list').select('email')
    const emailsSuprimidos = new Set((suprimidos || []).map((s: any) => (s.email || '').toLowerCase()))

    const { data: contaUnica, error: contaError } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).limit(1).single()
    if (contaError || !contaUnica) return NextResponse.json({ error: 'Nenhuma conta ativa.', done: true, restantes: 0, enviados: 0 }, { status: 400 })

    if ((contaUnica.sent_today || 0) >= (contaUnica.daily_limit || 80000)) {
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
      const { count: restantes } = await countQuery
      return NextResponse.json({ success: true, processed: 0, enviados: 0, restantes: restantes || 0, done: (restantes || 0) === 0 })
    }

    let enviados = 0
    const campaignIds = new Set<string | number>()

    const transporter = nodemailer.createTransport({
      pool: true, maxConnections: 5, maxMessages: 100,
      host: contaUnica.host || 'smtp.gmail.com', port: contaUnica.port || 587, secure: contaUnica.port === 465,
      auth: { user: contaUnica.email, pass: contaUnica.app_password }, tls: { rejectUnauthorized: false },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
    })

    for (const item of fila) {
      const unsubUrl = `${baseUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.recipient_email || '')}`;
      let corpoPersonalizado = (item.body || '')
        .replace(/\{\{email\}\}/gi, item.recipient_email || '')
        .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')
        .replace(/\{\{unsubscribe_link\}\}/gi, unsubUrl);
        
      corpoPersonalizado = prepararHtmlEmail(corpoPersonalizado)

      let htmlFinal = corpoPersonalizado
      if (baseUrl) {
        htmlFinal = htmlFinal.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m: string, quote: string, url: string) => {
          if (url.includes('/api/unsubscribe')) return _m;
          return `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`;
        });
        
        if (!/(descadastr|unsubscribe)/i.test(htmlFinal)) {
          htmlFinal += `<hr style="margin:32px 0 16px;border:none;border-top:1px solid #e2e8f0;" /><p style="font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;margin:0 0 8px 0;">Este e-mail foi enviado para <strong style="color:#64748b;">${item.recipient_email}</strong></p><p style="font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;margin:0;">Não quer mais receber? <a href="${unsubUrl}" clicktracking="off" data-msys-clicktrack="0" style="color:#64748b;text-decoration:underline;">Clique aqui para descadastrar</a>.</p>`;
        }
        htmlFinal += `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" alt="" />`
      }

      // ENVELOPA O HTML PARA NÃO QUEBRAR O LINK
      const htmlEnvelopado = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body>${htmlFinal}</body>
        </html>
      `;

      try {
        await transporter.sendMail({
          from: { name: (contaUnica.sender_name || 'Equipe').replace(/[^\x00-\x7F]/g, ''), address: contaUnica.sender_email || contaUnica.email },
          to: item.recipient_email, subject: item.subject, html: htmlEnvelopado,
          headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
        })

        await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString(), retry_count: 0, smtp_account_id: contaUnica.id }).eq('id', item.id)
        await supabase.from('smtp_accounts').update({ sent_today: (contaUnica.sent_today || 0) + 1 }).eq('id', contaUnica.id)
        contaUnica.sent_today = (contaUnica.sent_today || 0) + 1
        enviados++
        if (item.campaign_id) campaignIds.add(item.campaign_id)
      } catch (err: any) {
        const classificacao = classificarErro(err.message, err.response)
        await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500), bounce_type: classificacao.type }).eq('id', item.id)
      }
    }

    let countQuery = supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    if (campanhaId) countQuery = countQuery.eq('campaign_id', campanhaId)
    const { count: restantesRaw } = await countQuery

    return NextResponse.json({ success: true, processed: fila.length, enviados, restantes: restantesRaw || 0, done: (restantesRaw || 0) === 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
