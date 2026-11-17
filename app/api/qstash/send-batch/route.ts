import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { prepararHtmlEmail } from '@/lib/email-html'

export const dynamic = 'force-dynamic'
export const maxDuration = 60;

const BATCH_SIZE = 30; 

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ganharfortuna-web.vercel.app'
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: conta } = await supabase.from('smtp_accounts').select('*').eq('is_active', true).limit(1).single()
    if (!conta) return NextResponse.json({ error: 'Sem conta SMTP' }, { status: 400 })

    const { data: pausadas } = await supabase.from('campanhas').select('id').eq('status', 'Pausada')
    const idsPausados = (pausadas || []).map((c: any) => c.id)

    const { data: suprimidos } = await supabase.from('suppression_list').select('email')
    const emailsSuprimidos = new Set((suprimidos || []).map((s: any) => (s.email || '').toLowerCase()))

    let query = supabase.from('email_queue').select('*').eq('status', 'pending')
    if (idsPausados.length > 0) {
      query = query.not('campaign_id', 'in', `(${idsPausados.join(',')})`)
    }

    const { data: loteRaw } = await query.order('created_at', { ascending: true }).limit(BATCH_SIZE * 3)
    const lote = (loteRaw || []).filter((i: any) => !emailsSuprimidos.has((i.recipient_email || '').toLowerCase())).slice(0, BATCH_SIZE)

    if (lote.length === 0) {
      return NextResponse.json({ message: 'Fila vazia ou campanhas pausadas' })
    }

    const transporter = nodemailer.createTransport({
      pool: true, host: conta.host, port: Number(conta.port), secure: Number(conta.port) === 465,
      auth: { user: conta.email, pass: conta.app_password }, tls: { rejectUnauthorized: false },
    })

    let enviados = 0;

    for (const item of lote) {
      try {
        const unsubUrl = `${baseUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.recipient_email || '')}`;
        const mailtoUnsub = `mailto:${conta.sender_email || conta.email}?subject=SAIR`;

        let corpo = (item.body || '')
          .replace(/\{\{email\}\}/gi, item.recipient_email || '')
          .replace(/\{\{nome\}\}/gi, item.recipient_name || 'Cliente')
          .replace(/\{\{unsubscribe_link\}\}/gi, unsubUrl);

        corpo = prepararHtmlEmail(corpo);
        
        corpo = corpo.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m: string, _q: string, url: string) => {
          if (url.includes('/api/unsubscribe')) return _m;
          return `href="${baseUrl}/api/track/click?id=${item.id}&url=${encodeURIComponent(url)}"`;
        });

        if (!corpo.includes(unsubUrl)) {
          corpo += `
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-family: Arial, sans-serif; font-size: 11px; color: #94a3b8; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">Este e-mail foi enviado para: <strong style="color: #64748b;">${item.recipient_email}</strong></p>
              <p style="margin: 0 0 8px 0;">Não quer mais receber nossos e-mails? <a href="${unsubUrl}" clicktracking="off" style="color: #64748b; text-decoration: underline;">Clique aqui para descadastrar</a>.</p>
              <p style="margin: 0; font-size: 10px; color: #cbd5e1;">Ou simplesmente responda este e-mail com a palavra <strong>SAIR</strong>.</p>
            </div>
          `;
        }
        
        corpo += `<img src="${baseUrl}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" />`;

        const htmlFinal = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"></head>
          <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5;">
            ${corpo}
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: { name: conta.sender_name || 'Equipe', address: conta.sender_email || conta.email },
          to: item.recipient_email, subject: item.subject, html: htmlFinal,
          headers: { 
            'List-Unsubscribe': `<${mailtoUnsub}>, <${unsubUrl}>`, 
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' 
          }
        })

        await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id)
        await supabase.from('smtp_accounts').update({ sent_today: (conta.sent_today || 0) + 1 }).eq('id', conta.id)
        enviados++;
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err: any) {
        await supabase.from('email_queue').update({ status: 'failed', error_log: err.message?.slice(0, 500) }).eq('id', item.id)
      }
    }

    // 🛑 TRAVA DE FINALIZAÇÃO: Verifica se a fila da campanha zerou
    const campanhasAfetadas = Array.from(new Set(lote.map((i: any) => i.campaign_id)));
    
    for (const campId of campanhasAfetadas) {
      const { count: restantes } = await supabase
        .from('email_queue')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campId)
        .eq('status', 'pending');

      if ((restantes || 0) === 0) {
        await supabase
          .from('campanhas')
          .update({ status: 'Enviada' })
          .eq('id', campId);
      }
    }

    if (enviados > 0) {
      await supabase.rpc('increment_qstash_counter')
    }

    return NextResponse.json({ success: true, enviados })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
