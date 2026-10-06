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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  try {
    const { data: fila, error: filaError } = await supabase
      .from('email_queue')
      .select('*')
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
    let enviados = 0

    for (const item of fila) {
      const contaAtual = contas[accountIndex % contas.length]
      accountIndex++

      const transporter = nodemailer.createTransport({
        host: contaAtual.host || 'smtp.gmail.com',
        port: contaAtual.port || 587,
        secure: contaAtual.port === 465,
        auth: { user: contaAtual.email, pass: contaAtual.app_password },
      })

      // 1. Reescreve todos os links para rastrear cliques
      const htmlComLinksRastreados = (item.body || '').replace(
        /href="(https?:\/\/[^"]+)"/g,
        (_match: string, url: string) => {
          const urlRastreada = `${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}`
          return `href="${urlRastreada}"`
        }
      )

      // 2. Injeta pixel de rastreamento de abertura
      const trackingPixel = `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" alt="" />`

      // 3. Junta tudo
      const htmlFinal = htmlComLinksRastreados + trackingPixel

      try {
        await transporter.sendMail({
          from: `"${contaAtual.sender_name}" <${contaAtual.email}>`,
          to: item.recipient_email,
          subject: item.subject,
          html: htmlFinal,
        })

        // Marca como enviado
        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id)

        // Incrementa contador diário da conta
        await supabase
          .from('smtp_accounts')
          .update({ sent_today: (contaAtual.sent_today || 0) + 1 })
          .eq('id', contaAtual.id)

        enviados++
      } catch (sendError: any) {
        await supabase
          .from('email_queue')
          .update({ status: 'failed', error_log: sendError.message })
          .eq('id', item.id)
      }
    }

    // Atualiza status das campanhas envolvidas (marca como "Enviada" se não houver mais pendentes)
    const campaignIds = [...new Set(fila.map(f => f.campaign_id))]
    for (const cid of campaignIds) {
      const { count } = await supabase
        .from('email_queue')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', cid)
        .eq('status', 'pending')

      if (count === 0) {
        await supabase
          .from('campanhas')
          .update({ status: 'Enviada' })
          .eq('id', cid)
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: fila.length, 
      enviados,
      falharam: fila.length - enviados,
    })
  } catch (error: any) {
    console.error('ERRO /api/cron/send-emails:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}