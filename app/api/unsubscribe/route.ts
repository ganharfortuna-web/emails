import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const id = searchParams.get('id')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Erro de configuração', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    let emailFinal = email

    // Se veio só o ID, busca o e-mail
    if (!emailFinal && id) {
      const { data } = await supabase
        .from('email_queue')
        .select('recipient_email')
        .eq('id', id)
        .single()
      emailFinal = data?.recipient_email || null
    }

    if (!emailFinal) {
      return new Response('E-mail não informado', { status: 400 })
    }

    // Marca o contato como descadastrado
    await supabase
      .from('contatos')
      .update({ status: 'descadastrado' })
      .eq('email', emailFinal.toLowerCase())

    // Retorna uma página HTML de confirmação
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Descadastro confirmado</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .box { background: white; border-radius: 16px; padding: 40px; max-width: 480px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { color: #0f172a; font-size: 24px; margin: 0 0 12px 0; }
    p { color: #64748b; line-height: 1.6; margin: 0 0 24px 0; }
    .email { font-weight: bold; color: #334155; background: #f1f5f9; padding: 8px 16px; border-radius: 8px; display: inline-block; margin-top: 8px; word-break: break-all; }
    .footer { color: #94a3b8; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">✅</div>
    <h1>Descadastro confirmado</h1>
    <p>Você não receberá mais e-mails deste remetente.</p>
    <span class="email">${emailFinal}</span>
    <div class="footer">Sistema Envios</div>
  </div>
</body>
</html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error: any) {
    return new Response(`Erro: ${error.message}`, { status: 500 })
  }
}
