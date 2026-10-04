import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

// Inicializa o cliente do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use a Service Role Key para ter permissão total nas tabelas da fila
)

export async function GET(request: Request) {
  // 1. Validação de segurança para garantir que apenas o Cron chame esta rota
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // 2. Busca até 20 e-mails pendentes na fila (evita estouro de timeout da Vercel)
    const { data: fila, error: filaError } = await supabase
      .from('email_queue')
      .select('*, campaign:campaigns(*)')
      .eq('status', 'pending')
      .limit(20)

    if (filaError || !fila || fila.length === 0) {
      return NextResponse.json({ message: 'Nenhum e-mail pendente na fila.' })
    }

    // 3. Busca contas SMTP/Gmail ativas com limite diário disponível
    const { data: contas, error: contasError } = await supabase
      .from('smtp_accounts')
      .select('*')
      .eq('is_active', true)
      .lt('sent_today', 450) // Limite seguro do Gmail por conta (máx 500/dia)

    if (contasError || !contas || contas.length === 0) {
      return NextResponse.json({ error: 'Nenhuma conta de envio disponível ou limites diários atingidos.' }, { status: 400 })
    }

    let accountIndex = 0

    // 4. Processa os e-mails do lote
    for (const item of fila) {
      // Rotaciona as contas entre os 50 Gmails e 3 SMTPs
      const contaAtual = contas[accountIndex % contas.length]
      accountIndex++

      // Configura o transportador do Nodemailer dinamicamente
      const transporter = nodemailer.createTransport({
        host: contaAtual.host || 'smtp.gmail.com',
        port: contaAtual.port || 587,
        secure: contaAtual.port === 465,
        auth: {
          user: contaAtual.email,
          pass: contaAtual.app_password, // Senha de App do Gmail ou credencial SMTP
        },
      })

      // Injeta pixel de rastreio de abertura e reescreve links para cliques
      const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/track/open?id=${item.id}" width="1" height="1" style="display:none;" />`
      const htmlComRastreio = item.body + trackingPixel

      try {
        await transporter.sendMail({
          from: `"${contaAtual.sender_name}" <${contaAtual.email}>`,
          to: item.recipient_email,
          subject: item.subject,
          html: htmlComRastreio,
        })

        // Marca como enviado no Supabase
        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id)

        // Incrementa o contador de envios do dia da conta utilizada
        await supabase
          .from('smtp_accounts')
          .update({ sent_today: contaAtual.sent_today + 1 })
          .eq('id', contaAtual.id)

      } catch (sendError: any) {
        // Em caso de falha, registra o erro e marca para nova tentativa
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