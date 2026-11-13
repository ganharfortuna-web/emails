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

    // 1. Busca a página
    const { data: pageConfig, error: errPage } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', slug)
      .single()

    if (errPage || !pageConfig) {
      return NextResponse.json({ error: 'Página não encontrada no banco de dados.' }, { status: 404 })
    }

    // 2. Salva o contato e checa se deu erro
    const { error: errContato } = await supabase.from('contatos').upsert([{
      nome: nome,
      email: emailLimpo,
      whatsapp: whatsapp,
      lista_id: pageConfig.lista_id,
      status: 'ativo'
    }], { onConflict: 'email' })

    if (errContato) {
      console.error('Erro ao salvar contato:', errContato)
      return NextResponse.json({ error: 'Erro no banco (Contato): ' + errContato.message }, { status: 500 })
    }

    // 3. Enfileira o e-mail e checa se deu erro
    const mensagemFinal = pageConfig.email_corpo.replace(/\{\{nome\}\}/gi, nome)
    
    const { error: errFila } = await supabase.from('email_queue').insert([{
      campaign_id: null,
      recipient_email: emailLimpo,
      recipient_name: nome,
      subject: pageConfig.email_assunto,
      body: mensagemFinal,
      status: 'pending'
    }])

    if (errFila) {
      console.error('Erro ao enfileirar e-mail:', errFila)
      return NextResponse.json({ error: 'Erro no banco (Fila de E-mail): ' + errFila.message }, { status: 500 })
    }

    // 4. Define o link final
    let redirectUrlFinal = pageConfig.redirect_url
    if (pageConfig.thank_you_type === 'internal') {
      redirectUrlFinal = `/${slug}/obrigado`
    }

    return NextResponse.json({ success: true, redirect: redirectUrlFinal })

  } catch (error: any) {
    console.error('Erro geral na API de captura:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
