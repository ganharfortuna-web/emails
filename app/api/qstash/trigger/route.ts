import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const qstashUrl = process.env.QSTASH_URL
  const qstashToken = process.env.QSTASH_TOKEN

  if (!supabaseUrl || !supabaseKey || !qstashUrl || !qstashToken) {
    return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  }

  try {
    const { campanhaId } = await request.json().catch(() => ({}))
    
    // Monta a URL do QStash com o ID da campanha para o motor saber o que processar
    const targetUrl = `${qstashUrl}?campanhaId=${campanhaId}`

    await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${qstashToken}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ campanhaId }) 
    })

    return NextResponse.json({ success: true, message: 'QStash acionado para a campanha.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
