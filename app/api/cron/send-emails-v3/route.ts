import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { classificarErro, calcularProximaTentativa } from '@/lib/bounce'
import { prepararHtmlEmail } from '@/lib/email-html'
import { getBatchSize } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenQuery = searchParams.get('token')
  const tokenHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  const { searchParams: { get } } = new URL(request.url)
  const campanhaIdFiltro = get('campanhaId')

  if ((tokenHeader || tokenQuery) !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const qstashUrl = process.env.QSTASH_URL
  const qstashToken = process.env.QSTASH_TOKEN

  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: settings } = await supabase.from('system_settings').select('active_provider').eq('id', 1).single()
    if (settings?.active_provider !== 'qstash') return NextResponse.json({ message: 'Ignorado: Inngest ativo.' })

    await supabase.from('campanhas').update({ status: 'Em Fila' }).eq('status', 'Agendada').lte('scheduled_at', new Date().toISOString())

    const { data: pausadas } = await supabase.from('campanhas').select('id').eq('status', 'Pausada')
    const idsPausados = (pausadas || []).map((c: any) => c.id)

    const { data: suprimidos } = await supabase.from('suppression_list').select('email')
    const emailsSuprimidos = new Set((suprimidos || []).map(s => (s.email || '').toLowerCase()))

    const { data: contas } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).lt('sent_today', 450).order('sent_today', { ascending: true })
    if (!contas || contas.length === 0) return NextResponse.json({ message: 'Sem contas disponíveis.' })

    const agora = new Date().toISOString()
    let query = supabase.from('email_queue').select('*').eq('status', 'pending').or(`next_retry_at.is.null,next_retry_at.lte.${agora}`).order('created_at', { ascending: true }).limit(30)
    
    if (campanhaIdFiltro) query = query.eq('campaign_id', campanhaIdFiltro)

    const { data: filaRaw, error: filaError } = await query
    if (filaError || !filaRaw || filaRaw.length === 0) {
      if (campanhaIdFiltro) await supabase.from('campanhas').update({ status: 'Enviada' }).eq('id', campanhaIdFiltro)
      return NextResponse.json({ message: 'Nada pendente.' })
    }

    const fila = filaRaw.filter(item => !idsPausados.includes(item.campaign_id)).filter(item => !emailsSuprimidos.has((item.recipient_email || '').toLowerCase())).slice(0, 30)
    if (fila.length === 0) return NextResponse.json({ message: 'Sem e-mails elegíveis.' })

    let enviados = 0
    const campaignIds = new Set<string | number>()

    for (const item of fila) {
      contas.sort((a: any, b: any) => (a.sent_today || 0) - (b.sent_today || 0))
      const contaAtual = contas[0]
      if (!contaAtual) continue

      const transporter = nodemailer.createTransport({
        host: contaAtual.host || 'smtp.gmail.com', port: contaAtual.port || 587, secure: contaAtual.port === 465,
        auth: { user: contaAtual.email, pass: contaAtual.app_password }, tls: { rejectUnauthorized: false },
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
      })

      const unsubUrl = `${baseUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.recipient_email || '')}`;
      let corpoPersonalizado = (item.body || '')
        .replace(/\{\{email\}\}/gi, item.recipient_email || '')
        .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')
        .replace(/\{\{unsubscribe_link\}\}/gi, unsubUrl);
        
      corpoPersonalizado = prepararHtmlEmail(corpoPersonalizado)

      let htmlFinal = corpoPersonalizado
      if (baseUrl) {
        // ✅ TRAVA: Ignora a reescrita se o link for de descadastro
        htmlFinal = htmlFinal.replace(/href="(https?:\/\/[^"]+)"/g, (_m: string, url: string) => {
          if (url.includes('/api/unsubscribe')) return _m;
          return `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`;
        });
        
        if (!htmlFinal.includes('descadastrar')) {
          const footer = `<hr style="margin:32px 0 16px;border:none;border-top:1px solid #e2e8f0;" /><p style="font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;margin:0 0 8px 0;">Este e-mail foi enviado para <strong style="color:#64748b;">${item.recipient_email}</strong></p><p style="font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;margin:0;">Não quer mais receber? <a href="${unsubUrl}" style="color:#64748b;text-decoration:underline;">Clique aqui para descadastrar</a>.</p>`
          htmlFinal += footer
        }
        htmlFinal += `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" alt="" />`
      }

      try {
        await transporter.sendMail({
          from: { name: (contaAtual.sender_name || 'Equipe').replace(/[^\x00-\x7F]/g, ''), address: contaAtual.sender_email || contaAtual.email },
          to: item.recipient_email, subject: item.subject, html: htmlFinal, encoding: 'utf-8', headers: { 'Content-Type': 'text/html; charset=UTF-8' },
        })

        await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString(), retry_count: 0, smtp_account_id: contaAtual.id }).eq('id', item.id)
        const { data: contaFresh } = await supabase.from('smtp_accounts').select('sent_today').eq('id', contaAtual.id).single()
        const novoSentToday = (contaFresh?.sent_today || 0) + 1
        await supabase.from('smtp_accounts').update({ sent_today: novoSentToday }).eq('id', contaAtual.id)

        contaAtual.sent_today = novoSentToday
        enviados++
        contas.push(contas.shift())
        if (item.campaign_id) campaignIds.add(item.campaign_id)
      } catch (err: any) {
        const classificacao = classificarErro(err.message, err.response)
        const retryCount = (item.retry_count || 0) + 1
        const podeRetentar = classificacao.retryable && retryCount < 3

        await supabase.from('bounce_log').insert([{ email_queue_id: item.id, campaign_id: item.campaign_id, recipient_email: item.recipient_email, bounce_type: classificacao.type, error_code: classificacao.code, error_message: err.message?.slice(0, 500), smtp_account_id: contaAtual.id }])

        if (podeRetentar) {
          await supabase.from('email_queue').update({ status: 'pending', error_log: err.message?.slice(0, 500), bounce_type: classificacao.type, retry_count: retryCount, next_retry_at: calcularProximaTentativa(retryCount).toISOString() }).eq('id', item.id)
        } else {
          await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500), bounce_type: classificacao.type, retry_count: retryCount }).eq('id', item.id)
          if (classificacao.action === 'block_contact') {
            await supabase.from('contatos').update({ status: 'bounced', last_bounce_at: new Date().toISOString(), last_bounce_reason: err.message?.slice(0, 300) }).eq('email', (item.recipient_email || '').toLowerCase())
            await supabase.from('suppression_list').upsert([{ email: (item.recipient_email || '').toLowerCase(), reason: classificacao.type === 'complaint' ? 'complaint' : 'hard_bounce', original_error: err.message?.slice(0, 300) }], { onConflict: 'email' })
          }
          if (classificacao.type === 'soft' || classificacao.type === 'unknown') {
            const { data: contato } = await supabase.from('contatos').select('bounce_count').eq('email', (item.recipient_email || '').toLowerCase()).single()
            await supabase.from('contatos').update({ bounce_count: (contato?.bounce_count || 0) + 1, last_bounce_at: new Date().toISOString() }).eq('email', (item.recipient_email || '').toLowerCase())
          }
          if (classificacao.action === 'disable_account') {
            await supabase.from('smtp_accounts').update({ is_active: false }).eq('id', contaAtual.id)
          }
        }
      }
    }

    for (const cid of campaignIds) {
      if (idsPausados.includes(cid)) continue
      const { count } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', cid).eq('status', 'pending')
      
      await supabase.from('campanhas').update({ status: (count || 0) === 0 ? 'Enviada' : 'Enviando...', updated_at: new Date().toISOString() }).eq('id', cid)

      if ((count || 0) > 0 && qstashUrl && qstashToken) {
        await fetch(qstashUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${qstashToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}) 
        })
      }
    }

    return NextResponse.json({ success: true, processed: fila.length, enviados })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
