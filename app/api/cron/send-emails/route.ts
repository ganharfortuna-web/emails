import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: fila, error: filaError } = await supabase
      .from('email_queue')
      .select('*, campaign:campaigns(*)')
      .eq('status', 'pending')
      .limit(20)

    if (filaError || !fila || fila.length === 0) {
      return NextResponse.json({ message: 'Nenhum e-mail pendente na fila.' })
    }

    const { data: contas, error: contasError } = await supabase
      .from('smtp_accounts')
      .select('*')
      .eq('is_active', true)
      .lt('sent_today', 450)

    if (contasError || !contas || contas.length === 0) {
      return NextResponse.json({ error: 'Sem contas disponíveis.' }, { status: 400 })
    }

    let accountIndex = 0

    for (const item of fila) {
      const contaAtual = contas[accountIndex % contas.length]
      accountIndex++

      const transporter = nodemailer.createTransport({
        host: contaAtual.host || 'smtp.gmail.com',
        port: contaAtual.port || 587,
        secure: contaAtual.port === 465,
        auth: { user: contaAtual.email, pass: contaAtual.app_password },
      })

      const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" />`
      const htmlComRastreio = item.body + trackingPixel

      try {
        await transporter.sendMail({
          from: `"${contaAtual.sender_name}" <${contaAtual.email}>`,
          to: item.recipient_email,
          subject: item.subject,
          html: htmlComRastreio,
        })

        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id)

        await supabase
          .from('smtp_accounts')
          .update({ sent_today: contaAtual.sent_today + 1 })
          .eq('id', contaAtual.id)

      } catch (sendError: any) {
        await supabase
          .from('email_queue')
          .update({ status: 'failed', error_log: sendError.message })
          .eq('id', item.id)
      }
    }

    return NextResponse.json({ success: true, processed: fila.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
