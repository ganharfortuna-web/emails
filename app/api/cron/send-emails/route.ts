import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenQuery = searchParams.get('token')
  const tokenHeader = request.headers.get('authorization')?.replace('Bearer ', '')

  const tokenRecebido = tokenHeader || tokenQuery
  const tokenEsperado = process.env.CRON_SECRET

  if (!tokenEsperado) {
    console.error('❌ CRON_SECRET não configurado')
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 })
  }

  if (tokenRecebido !== tokenEsperado) {
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

    // 2. Busca IDs das campanhas PAUSADAS (para ignorar)
    const { data: pausadas } = await supabase
      .from('campanhas')
      .select('id')
      .eq('status', 'Pausada')

    const idsPausados = (pausadas || []).map((c: any) => c.id)

    // 3. Contas ativas ordenadas pela menos usada
    const { data: contas } = await supabase
      .from('smtp_accounts')
      .select('*')
      .eq('is_active', true)
      .lt('sent_today', 450)
      .order('sent_today', { ascending: true })

    if (!contas || contas.length === 0) {
      return NextResponse.json({ message: 'Sem contas disponíveis.' })
    }

    // 4. Lote de 30 pendentes (busca 60 para poder filtrar pausados)
    const { data: filaRaw, error: filaError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(60)

    if (filaError || !filaRaw || filaRaw.length === 0) {
      return NextResponse.json({ message: 'Nada pendente.' })
    }

    // 5. Filtra campanhas pausadas e limita a 30
    const fila = filaRaw
      .filter(item => !idsPausados.includes(item.campaign_id))
      .slice(0, 30)

    if (fila.length === 0) {
      return NextResponse.json({ message: 'Todas as pendentes pertencem a campanhas pausadas.' })
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

      // Reescreve links + injeta pixel + footer de descadastro
      let htmlFinal = item.body || ''
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
<p style="font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;margin:0;">
  Você está recebendo este e-mail porque se cadastrou em nossa lista.<br/>
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
        console.error('Erro envio:', item.recipient_email, err.message)
        await supabase
          .from('email_queue')
          .update({ status: 'failed', error_log: err.message })
          .eq('id', item.id)
      }
    }

    // 6. Atualiza status das campanhas (só se não estiver pausada)
    for (const cid of campaignIds) {
      if (idsPausados.includes(cid)) continue

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

    return NextResponse.json({ success: true, processed: fila.length, enviados, pausadas: idsPausados.length })
  } catch (error: any) {
    console.error('ERRO cron:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}