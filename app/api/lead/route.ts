import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { nome, email, lista_id } = await request.json()

    if (!nome || !email || !lista_id) {
      return NextResponse.json({ error: 'Nome, e-mail e lista_id são obrigatórios.' }, { status: 400 })
    }

    const emailLimpo = email.toLowerCase().trim()

    // 1. Verifica se o e-mail está na lista de descadastrados (suppression_list)
    const { data: suprimido } = await supabase
      .from('suppression_list')
      .select('email')
      .eq('email', emailLimpo)
      .single()

    if (suprimido) {
      // Retornamos sucesso falso para não avisar ao usuário, mas não salvamos nem enviamos
      return NextResponse.json({ success: true, message: 'Contato recebido.' })
    }

    // 2. Insere ou atualiza o contato na tabela 'contatos'
    const { data: contato, error: errContato } = await supabase
      .from('contatos')
      .upsert([{
        nome,
        email: emailLimpo,
        lista_id,
        status: 'ativo'
      }], { onConflict: 'email' })
      .select()
      .single()

    if (errContato) {
      return NextResponse.json({ error: 'Erro ao salvar contato: ' + errContato.message }, { status: 500 })
    }

    // 3. Cria o e-mail de resposta automática e insere na fila
    const assuntoBoasVindas = `Olá ${nome}, seja bem-vindo(a)!`
    const mensagemBoasVindas = `
      <h2>Olá, ${nome}!</h2>
      <p>É um prazer ter você com a gente. Seu cadastro foi realizado com sucesso.</p>
      <p>Em breve você receberá nossas melhores novidades e conteúdos exclusivos.</p>
      <p>Um abraço,<br/>Equipe.</p>
    `

    const { error: errFila } = await supabase
      .from('email_queue')
      .insert([{
        campaign_id: null,
        recipient_email: emailLimpo,
        recipient_name: nome,
        subject: assuntoBoasVindas,
        body: mensagemBoasVindas,
        status: 'pending'
      }])

    if (errFila) {
      console.error('Erro ao enfileirar e-mail:', errFila)
    }

    return NextResponse.json({ success: true, message: 'Cadastro realizado com sucesso!' })

  } catch (error: any) {
    console.error('ERRO /api/lead:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
