import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenQuery = searchParams.get('token')
  const tokenHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  if ((tokenHeader || tokenQuery) !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  try {
    await supabase.from('campanhas').update({ status: 'Em Fila' })
      .eq('status', 'Agendada').lte('scheduled_at', new Date().toISOString())

    const { data: pausadas } = await supabase.from('campanhas').select('id').eq('status', 'Pausada')
    const idsPausados = (pausadas || []).map((c: any) => c.id)

    const { data: contas } = await supabase.from('smtp_accounts').select('*')
      .eq('is_active', true).order('sent_today', { ascending: true }).limit(1)

    if (!contas || contas.length === 0) {
      return NextResponse.json({ message: 'Sem contas ativas.' })
    }

    const conta = contas[0]
    if ((conta.sent_today || 0) >= (conta.daily_limit || 11500)) {
      return NextResponse.json({ message: `Limite atingido: ${conta.sent_today}/${conta.daily_limit}` })
    }

    const transporter = nodemailer.createTransport({
      host: conta.host,
      port: Number(conta.port),
      secure: Number(conta.port) === 465,
      auth: { user: conta.email, pass: conta.app_password },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 3000,
      socketTimeout: 5000,
    })

    const { data: fila } = await supabase.from('email_queue').select('*')
      .eq('status', 'pending').order('created_at', { ascending: true }).limit(5)

    if (!fila || fila.length === 0) {
      return NextResponse.json({ message: 'Fila vazia.' })
    }

    const filaFiltrada = fila.filter((i: any) => !idsPausados.includes(i.campaign_id))
    if (filaFiltrada.length === 0) {
      return NextResponse.json({ message: 'Sem e-mails elegíveis.' })
    }

    const fromEmail = conta.sender_email || conta.email
    const fromNome = (conta.sender_name || 'Equipe').replace(/[^\x00-\x7F]/g, '').trim() || 'Equipe'

    const resultados = await Promise.all(filaFiltrada.map(async (item: any) => {
      try {
        const corpo = (item.body || '')
          .replace(/\{\{email\}\}/gi, item.recipient_email || '')
          .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')

        const unsubUrl = `${baseUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.recipient_email)}`
        const htmlFinal = `<div style="font-family:Arial,sans-serif;color:#333;">${corpo}<hr style="margin:30px 0;border:none;border-top:1px solid #e2e8f0;" /><p style="font-size:11px;color:#94a3b8;text-align:center;">Este e-mail foi enviado para ${item.recipient_email}.<br/><a href="${unsubUrl}" style="color:#64748b;">Descadastrar</a></p>${baseUrl ? `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" />` : ''}</div>`

        await transporter.sendMail({
          from: `"${fromNome}" <${fromEmail}>`,
          to: item.recipient_email,
          subject: item.subject,
          html: htmlFinal,
        })

        await supabase.from('email_queue').update({
          status: 'sent', sent_at: new Date().toISOString(), smtp_account_id: conta.id,
        }).eq('id', item.id)

        return { ok: true, campaign_id: item.campaign_id }
      } catch (err: any) {
        await supabase.from('email_queue').update({
          status: 'failed', error_log: err.message?.slice(0, 500),
        }).eq('id', item.id)
        return { ok: false, campaign_id: item.campaign_id }
      }
    }))

    const enviados = resultados.filter((r: any) => r.ok).length
    const campaignIds = new Set(resultados.map((r: any) => r.campaign_id).filter(Boolean))

    if (enviados > 0) {
      await supabase.from('smtp_accounts')
        .update({ sent_today: (conta.sent_today || 0) + enviados })
        .eq('id', conta.id)
    }

    for (const cid of campaignIds) {
      const { count } = await supabase.from('email_queue')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', cid).eq('status', 'pending')
      await supabase.from('campanhas')
        .update({ status: (count || 0) === 0 ? 'Enviada' : 'Enviando...' })
        .eq('id', cid)
    }

    return NextResponse.json({ success: true, enviados, conta: conta.email })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
