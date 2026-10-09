import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({
      erro: 'Env vars faltando',
      url: url ? 'presente' : 'AUSENTE',
      key: key ? 'presente' : 'AUSENTE',
    })
  }

  const supabase = createClient(url, key)

  const { data: contas, count } = await supabase
    .from('smtp_accounts')
    .select('id, sender_name, email, is_active, sent_today', { count: 'exact' })
    .order('created_at')

  return NextResponse.json({
    url_em_uso: url,
    key_preview: key.slice(0, 30) + '...',
    total_contas: count,
    contas: contas?.map(c => ({
      id: c.id.slice(0, 8),
      email: c.email,
      is_active: c.is_active,
      sent_today: c.sent_today,
    })),
    tem_josevg10: contas?.some(c => c.email === 'josevg10@gmail.com') ?? false,
  })
}
