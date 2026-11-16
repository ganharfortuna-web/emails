import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { prepararHtmlEmail } from '@/lib/email-html'

export const dynamic = 'force-dynamic'
export const maxDuration = 60;

const BATCH_SIZE = 30; 

export async function POST(request: Request) {
  // Validação básica (opcional se usar QStash signature, mas recomendável)
  const authHeader = request.headers.get('authorization')
  if (process.env.QSTASH_CURRENT_SIGNING_KEY && authHeader !== `Bearer ${process.env.QSTASH_CURRENT_SIGNING_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  const { data: conta } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).limit(1).single()
  if (!conta) return NextResponse.json({ error: 'Sem conta SMTP' }, { status: 400 })

  const { data: lote } = await supabase.from('email_queue').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(BATCH_SIZE)
  if (!lote || lote.length === 0) return NextResponse.json({ message: 'Fila vazia' })

  const transporter = nodemailer.createTransport({
    pool: true, host: conta.host, port: Number(conta.port), secure: Number(conta.port) === 465,
    auth: { user: conta.email, pass: conta.app_password }, tls: { rejectUnauthorized: false },
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
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa de 1s
    } catch (err: any) {
      await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500) }).eq('id', item.id)
    }
  }
  return NextResponse.json({ success: true, enviados })
}
