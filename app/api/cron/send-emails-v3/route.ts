import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { prepararHtmlEmail } from '@/lib/email-html'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || searchParams.get('token')
  if (token !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ganharfortuna-web.vercel.app'
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: settings } = await supabase.from('system_settings').select('active_provider').eq('id', 1).single()
    if (settings?.active_provider !== 'qstash') return NextResponse.json({ message: 'Ignorado: Inngest ativo.' })

    const { data: conta } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).limit(1).single()
    if (!conta) return NextResponse.json({ error: 'Sem conta SMTP' }, { status: 400 })

    const { data: suprimidos } = await supabase.from('suppression_list').select('email')
    const emailsSuprimidos = new Set((suprimidos || []).map((s: any) => (s.email || '').toLowerCase()))

    const { data: loteRaw } = await supabase.from('email_queue').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(100)
    const lote = (loteRaw || []).filter(i => !emailsSuprimidos.has((i.recipient_email || '').toLowerCase())).slice(0, 30)

    if (lote.length === 0) return NextResponse.json({ message: 'Fila vazia' })

    const transporter = nodemailer.createTransport({
      pool: true, host: conta.host, port: Number(conta.port), secure: Number(conta.port) === 465,
      auth: { user: conta.email, pass: conta.app_password }, tls: { rejectUnauthorized: false },
    })

    let enviados = 0

    for (const item of lote) {
      try {
        const unsubUrl = `${baseUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.recipient_email || '')}`
        const mailtoUnsub = `mailto:${conta.sender_email || conta.email}?subject=SAIR`

        let corpo = (item.body || '')
          .replace(/\{\{email\}\}/gi, item.recipient_email || '')
          .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')
          .replace(/\{\{unsubscribe_link\}\}/gi, unsubUrl)

        corpo = prepararHtmlEmail(corpo)
        
        // 🛑 AQUI ESTAVA O ERRO: Adicionado ': string' nos parâmetros
        corpo = corpo.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m: string, _q: string, url: string) => {
          if (url.includes('/api/unsubscribe')) return _m
          return `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`
        })

        if (!corpo.includes(unsubUrl)) {
          corpo += `
            <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;line-height:1.6;">
              <p style="margin:0 0 8px 0;">Este e-mail foi enviado para: <strong style="color:#64748b;">${item.recipient_email}</strong></p>
              <p style="margin:0 0 8px 0;">Não quer mais receber nossos e-mails? <a href="${unsubUrl}" style="color:#64748b;text-decoration:underline;">Clique aqui para descadastrar</a>.</p>
              <p style="margin:0;font-size:10px;color:#cbd5e1;">Ou simplesmente responda este e-mail com a palavra <strong>SAIR</strong>.</p>
            </div>
          `
        }

        corpo += `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" alt="" />`

        const htmlFinal = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.5;">${corpo}</body></html>`

        await transporter.sendMail({
          from: { name: conta.sender_name || 'Equipe', address: conta.sender_email || conta.email },
          to: item.recipient_email, subject: item.subject, html: htmlFinal,
          headers: {
            'List-Unsubscribe': `<${mailtoUnsub}>, <${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })

        await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id)
        await supabase.from('smtp_accounts').update({ sent_today: (conta.sent_today || 0) + 1 }).eq('id', conta.id)
        enviados++
        await new Promise(r => setTimeout(r, 200))
      } catch (err: any) {
        await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500) }).eq('id', item.id)
      }
    }

    return NextResponse.json({ success: true, enviados })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
