import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const qstashUrl = process.env.QSTASH_URL
  const qstashToken = process.env.QSTASH_TOKEN

  if (!supabaseUrl || !supabaseKey || !qstashUrl || !qstashToken) {
    return NextResponse.json({ error: 'Variáveis de ambiente faltando' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 🛑 TRAVA DE SEGURANÇA
    const { data: settings } = await supabase.from('system_settings').select('active_provider').eq('id', 1).single()
    if (settings?.active_provider !== 'qstash') {
      return NextResponse.json({ message: 'QStash inativo. Não disparando webhook.' })
    }

    const { count } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    if (!count || count === 0) return NextResponse.json({ message: 'Fila vazia.' })

    await fetch(qstashUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${qstashToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}) 
    })

    return NextResponse.json({ success: true, message: `Havia ${count} pendentes. 1 lote enviado para o QStash.` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
