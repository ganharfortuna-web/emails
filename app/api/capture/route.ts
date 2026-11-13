import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl!, supabaseKey!)

  try {
    const { nome, email, whatsapp, slug } = await request.json()

    if (!nome || !email || !slug) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const emailLimpo = email.toLowerCase().trim()

    // 1. Busca a configuração da página
    const { data: pageConfig } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!pageConfig) return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 })

    // 2. Salva o contato (com WhatsApp)
    await supabase.from('contatos').upsert([{
      nome,
      email: emailLimpo,
      whatsapp,
      lista_id: pageConfig.lista_id,
      status: 'ativo'
    }], { onConflict: 'email' })

    // 3. Enfileira o e-mail customizado
    const mensagemFinal = pageConfig.email_corpo.replace(/\{\{nome\}\}/gi, nome)
    
    await supabase.from('email_queue').insert([{
      campaign_id: null,
      recipient_email: emailLimpo,
      recipient_name: nome,
      subject: pageConfig.email_assunto,
      body: mensagemFinal,
      status: 'pending'
    }])

    // 4. Retorna a URL de obrigado
    return NextResponse.json({ success: true, redirect: pageConfig.redirect_url })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
