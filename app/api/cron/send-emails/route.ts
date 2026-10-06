import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenQuery = searchParams.get('token')
  const tokenHeader = request.headers.get('authorization')?.replace('Bearer ', '')

  const tokenRecebido = tokenHeader || tokenQuery
  if (tokenRecebido !== process.env.CRON_SECRET) {
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
    // 1. Ativa campanhas agendadas cujo horário já passou
    await supabase
      .from('campanhas')
      .update({ status: 'Em Fila' })
      .eq('status', 'Agendada')
      .lte('scheduled_at', new Date().toISOString())

    // 2. Pega contas ativas
    const { data: contas } = await supabase
      .from('smtp_accounts')
      .select('*')
      .eq('is_active', true)
      .lt('sent_today', 450)

    if (!contas || contas.length === 0) {
      return NextResponse.json({ message: 'Sem contas disponíveis.' })
    }

    // 3. Pega lote de pendentes (30 por rodada)
    const { data: fila, error: filaError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(30)

    if (filaError || !fila || fila.length === 0) {
      return NextResponse.json({ message: 'Nada pendente.' })
    }

    let enviados = 0
    let accountIndex = 0
    const campaignIds = new Set<string | number>()

    for (const item of fila) {
      const contaAtual = contas[accountIndex % contas.length]
      accountIndex++

      const transporter = nodemailer.createTransport({
        host: contaAtual.host || 'smtp.gmail.com',
        port: contaAtual.port || 587,
        secure: contaAtual.port === 465,
        auth: { user: contaAtual.email, pass: contaAtual.app_password },
      })

      // Reescreve links para rastreio
      const htmlComLinks = (item.body || '').replace(
        /href="(https?:\/\/[^"]+)"/g,
        (_m: string, url: string) =>
          `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`
      )
      // Pixel de abertura
      const pixel = `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" alt="" />`
      const htmlFinal = htmlComLinks + pixel

      try {
        await transporter.sendMail({
          from: `"${contaAtual.sender_name}" <${contaAtual.email}>`,
          to: item.recipient_email,
          subject: item.subject,
          html: htmlFinal,
        })

        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id)

        await supabase
          .from('smtp_accounts')
          .update({ sent_today: (contaAtual.sent_today || 0) + 1 })
          .eq('id', contaAtual.id)

        contaAtual.sent_today = (contaAtual.sent_today || 0) + 1
        enviados++
        if (item.campaign_id) campaignIds.add(item.campaign_id)
      } catch (err: any) {
        await supabase
          .from('email_queue')
          .update({ status: 'failed', error_log: err.message })
          .eq('id', item.id)
      }
    }

    // 4. Atualiza status das campanhas processadas
    for (const cid of campaignIds) {
      const { count } = await supabase
        .from('email_queue')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', cid)
        .eq('status', 'pending')

      await supabase
        .from('campanhas')
        .update({ status: (count || 0) === 0 ? 'Enviada' : 'Enviando...' })
        .eq('id', cid)
    }

    return NextResponse.json({ success: true, processed: fila.length, enviados })
  } catch (error: any) {
    console.error('ERRO cron:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}