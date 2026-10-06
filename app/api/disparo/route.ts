import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Env vars faltando na Vercel' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { campanhaId } = await request.json()
    if (!campanhaId) return NextResponse.json({ error: 'campanhaId obrigatório' }, { status: 400 })

    // 1. Busca a campanha
    const { data: campanha, error: campanhaError } = await supabase
      .from('campanhas').select('*').eq('id', campanhaId).single()

    if (campanhaError || !campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada', detalhe: campanhaError?.message }, { status: 404 })
    }

    // 2. Busca contatos da lista
    const { data: contatos, error: contatosError } = await supabase
      .from('contatos').select('id, email, nome').eq('lista_id', campanha.lista_id)

    if (contatosError) {
      return NextResponse.json({ error: 'Erro ao buscar contatos', detalhe: contatosError.message }, { status: 500 })
    }
    if (!contatos || contatos.length === 0) {
      return NextResponse.json({ error: 'Nenhum contato na lista' }, { status: 400 })
    }

    // 3. Monta a fila
    const fila = contatos
      .filter(c => c.email && c.email.includes('@'))
      .map(contato => ({
        campaign_id: campanhaId,
        recipient_email: contato.email,
        recipient_name: contato.nome || '',
        subject: campanha.assunto,
        body: campanha.mensagem,
        status: 'pending',
      }))

    if (fila.length === 0) {
      return NextResponse.json({ error: 'Nenhum e-mail válido na lista' }, { status: 400 })
    }

    // 4. Insere na fila
    const { error: insertError } = await supabase.from('email_queue').insert(fila)

    if (insertError) {
      return NextResponse.json({ 
        error: 'Erro ao inserir na fila', 
        detalhe: insertError.message,
        hint: insertError.hint,
        code: insertError.code,
      }, { status: 500 })
    }

    // 5. Status da campanha
    const novoStatus = campanha.scheduled_at ? 'Agendada' : 'Em Fila'
    await supabase.from('campanhas').update({ status: novoStatus, total_sent: fila.length }).eq('id', campanhaId)

    return NextResponse.json({ success: true, total: fila.length, status: novoStatus })
  } catch (error: any) {
    console.error('ERRO /api/disparo:', error)
    return NextResponse.json({ error: error.message, stack: error.stack?.split('\n').slice(0,3).join(' | ') }, { status: 500 })
  }
}