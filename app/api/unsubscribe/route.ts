import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const id = searchParams.get('id')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) return new Response('Erro de config', { status: 500 })

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    let emailFinal = email

    if (!emailFinal && id) {
      const { data } = await supabase.from('email_queue').select('recipient_email').eq('id', id).single()
      emailFinal = data?.recipient_email || null
    }

    if (!emailFinal) return new Response('Link inválido', { status: 400 })

    const emailLimpo = emailFinal.toLowerCase().trim()

    // 1. BLOQUEIO GLOBAL
    await supabase.from('suppression_list').upsert(
      [{ email: emailLimpo, reason: 'unsubscribe', original_error: 'Descadastro via link' }],
      { onConflict: 'email' }
    )

    // 2. ATUALIZA CONTATO
    await supabase.from('contatos').update({ status: 'descadastrado' }).eq('email', emailLimpo)

    // 3. LIMPA TODA A FILA PENDENTE DESSE E-MAIL (Evita envios duplicados em andamento)
    await supabase.from('email_queue')
      .update({ status: 'suppressed', error_log: 'Cancelado: Descadastro solicitado.' })
      .eq('recipient_email', emailLimpo)
      .eq('status', 'pending')

    // RETORNA PÁGINA BONITA E SEGURA (Com escape de HTML básico)
    const emailSeguro = emailLimpo.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Descadastro</title><style>body{font-family:sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.box{background:#fff;padding:40px;border-radius:16px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08)}.icon{font-size:64px}h1{color:#0f172a;margin:16px 0}p{color:#64748b}</style></head><body><div class="box"><div class="icon">✅</div><h1>Descadastro Confirmado</h1><p>O e-mail <strong>${emailSeguro}</strong> não receberá mais nossas mensagens.</p></div></body></html>`

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (error: any) {
    return new Response(`Erro: ${error.message}`, { status: 500 })
  }
}
