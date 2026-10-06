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
    const { campanhaId } = await request.json()

    if (!campanhaId) {
      return NextResponse.json({ error: 'campanhaId é obrigatório' }, { status: 400 })
    }

    const { data: campanha, error: campanhaError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single()

    if (campanhaError || !campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    const { data: contatos, error: contatosError } = await supabase
      .from('contatos')
      .select('id, email, nome')
      .eq('lista_id', campanha.lista_id)

    if (contatosError || !contatos || contatos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato encontrado nessa lista' },
        { status: 400 }
      )
    }

    const fila = contatos
      .filter(c => c.email)
      .map(contato => ({
        campaign_id: campanhaId,
        recipient_email: contato.email,
        recipient_name: contato.nome || '',
        subject: campanha.assunto,
        body: campanha.mensagem,
        status: 'pending',
      }))

    const { error: insertError } = await supabase
      .from('email_queue')
      .insert(fila)

    if (insertError) {
      return NextResponse.json(
        { error: `Erro ao inserir na fila: ${insertError.message}` },
        { status: 500 }
      )
    }

    await supabase
      .from('campanhas')
      .update({ status: 'Em Fila' })
      .eq('id', campanhaId)

    return NextResponse.json({
      success: true,
      message: `${fila.length} e-mails adicionados à fila.`,
      total: fila.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
