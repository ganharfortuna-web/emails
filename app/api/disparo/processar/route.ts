import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BATCH_SIZE = 10

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

    // 1. Contas ativas ordenadas pela menos usada
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

    // 2. Próximo lote
    let query = supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (campanhaId) query = query.eq('campaign_id', campanhaId)

    const { data: fila, error: filaError } = await query

    if (filaError) {
      return NextResponse.json({ error: filaError.message }, { status: 500 })
    }

    if (!fila || fila.length === 0) {
      if (campanhaId) {
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

    // 3. Quantos ainda restam
    let countQuery = supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    if (campanhaId) countQuery = countQuery.eq('campaign_id', campanhaId)

    const { count: restantes } = await countQuery
    const done = (restantes || 0) === 0

    // 4. Atualiza status das campanhas
    for (const cid of campaignIds) {
      await supabase
        .from('campanhas')
        .update({ status: done ? 'Enviada' : 'Enviando...' })
        .eq('id', cid)
    }

    if (campanhaId && !campaignIds.has(campanhaId)) {
      await supabase
        .from('campanhas')
        .update({ status: done ? 'Enviada' : 'Enviando...' })
        .eq('id', campanhaId)
    }

    return NextResponse.json({
      success: true,
      processed: fila.length,
      enviados,
      restantes: restantes || 0,
      done,
    })
  } catch (error: any) {
    console.error('ERRO /api/disparo/processar:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}