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

    // 2. Busca contatos da lista COM PAGINAÇÃO (para pegar mais de 1000)
    let todosContatos: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('contatos')
        .select('id, email, nome, status')
        .eq('lista_id', campanha.lista_id)
        .neq('status', 'descadastrado')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw new Error('Erro ao buscar contatos: ' + error.message)
      
      if (data && data.length > 0) {
        todosContatos = [...todosContatos, ...data]
        if (data.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      } else {
        hasMore = false
      }
    }

    if (todosContatos.length === 0) {
      return NextResponse.json({ error: 'Nenhum contato ativo na lista (ou todos descadastrados)' }, { status: 400 })
    }

    // 3. Remove duplicatas de e-mail (caso o banco tenha)
    const vistos = new Set<string>()
    const contatosUnicos = todosContatos.filter(c => {
      const emailLimpo = c.email?.toLowerCase().trim()
      if (!emailLimpo || !emailLimpo.includes('@') || vistos.has(emailLimpo)) return false
      vistos.add(emailLimpo)
      return true
    })

    // 4. Monta a fila
    const fila = contatosUnicos.map(contato => ({
      campaign_id: campanha.id,
      recipient_email: contato.email.toLowerCase().trim(),
      recipient_name: contato.nome || '',
      subject: campanha.assunto,
      body: campanha.mensagem,
      status: 'pending',
    }))

    // 5. Insere na fila (em blocos de 500 para não estourar o limite do Supabase)
    for (let i = 0; i < fila.length; i += 500) {
      const bloco = fila.slice(i, i + 500)
      const { error: insertError } = await supabase.from('email_queue').insert(bloco)
      if (insertError) throw new Error('Erro ao inserir na fila: ' + insertError.message)
    }

    // 6. Atualiza o status da campanha
    const novoStatus = campanha.scheduled_at ? 'Agendada' : 'Enviando...'
    await supabase.from('campanhas').update({ 
      status: novoStatus, 
      total_sent: fila.length 
    }).eq('id', campanha.id)

    return NextResponse.json({ success: true, total: fila.length, status: novoStatus })
  } catch (error: any) {
    console.error('ERRO /api/disparo:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
