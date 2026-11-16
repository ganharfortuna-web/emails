import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl!, supabaseKey!)

  try {
    // ✅ Busca as credenciais salvadas no banco
    const { data: config } = await supabase.from('system_settings').select('*').eq('id', 1).single()

    if (!config || !config.upstash_id || !config.upstash_email || !config.upstash_api_key) {
      return NextResponse.json({ error: 'Credenciais da Upstash não configuradas no painel.' }, { status: 400 })
    }

    const authString = Buffer.from(`${config.upstash_email}:${config.upstash_api_key}`).toString('base64')

    // Chama a API do Upstash
    const response = await fetch(`https://api.upstash.com/v2/qstash/stats/${config.upstash_id}?period=30d`, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) throw new Error(`Erro na API do Upstash: ${response.status}`)

    const data = await response.json()

    // Soma todas as requisições diárias
    let totalMensagens = 0
    if (data.daily_requests && Array.isArray(data.daily_requests)) {
      totalMensagens = data.daily_requests.reduce((acc: number, dia: any) => acc + (dia.y || 0), 0)
    }

    // Salva o valor exato no contador do banco
    await supabase.from('system_settings').update({ qstash_counter: totalMensagens }).eq('id', 1)

    return NextResponse.json({ success: true, total: totalMensagens })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
