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

    const { data: campanha, error: campanhaError } = await supabase
      .from('campanhas').select('*').eq('id', campanhaId).single()

    if (campanhaError || !campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    // 1. Busca contatos COM PAGINAÇÃO (para pegar todos os 3214)
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
        if (data.length < pageSize) hasMore = false
        else page++
      } else {
        hasMore = false
      }
    }

    if (todosContatos.length === 0) {
      return NextResponse.json({ error: 'Nenhum contato ativo na lista' }, { status: 400 })
    }

    // 2. Remove e-mails duplicados da planilha
    const vistos = new Set<string>()
    const contatosUnicos = todosContatos.filter(c => {
      const emailLimpo = c.email?.toLowerCase().trim()
      if (!emailLimpo || !emailLimpo.includes('@') || vistos.has(emailLimpo)) return false
      vistos.add(emailLimpo)
      return true
    })

    // 3. Monta a fila
    const fila = contatosUnicos.map(contato => ({
      campaign_id: campanha.id,
      recipient_email: contato.email.toLowerCase().trim(),
      recipient_name: contato.nome || '',
      subject: campanha.assunto,
      body: campanha.mensagem,
      status: 'pending',
    }))

    // 4. Insere na fila EM BLOCOS de 500 (Evita estourar o limite do Supabase)
    for (let i = 0; i < fila.length; i += 500) {
      const bloco = fila.slice(i, i + 500)
      const { error: insertError } = await supabase.from('email_queue').insert(bloco)
      if (insertError) throw new Error('Erro ao inserir na fila: ' + insertError.message)
    }

    // 5. Atualiza o status da campanha com o total real
    const novoStatus = campanha.scheduled_at ? 'Agendada' : 'Enviando...'
    await supabase.from('campanhas').update({ status: novoStatus, total_sent: fila.length }).eq('id', campanha.id)

    return NextResponse.json({ success: true, total: fila.length, status: novoStatus })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
