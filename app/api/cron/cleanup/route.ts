import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// ✅ Aceita POST (padrão do QStash) e GET (para testes no navegador)
export async function POST(request: Request) { return handleCleanup(request) }
export async function GET(request: Request) { return handleCleanup(request) }

async function handleCleanup(request: Request) {
  const { searchParams } = new URL(request.url)
  // Verifica o token na URL
  if (searchParams.get('token') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl!, supabaseKey!)

  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7);
    
    const { error, count } = await supabase
      .from('email_queue')
      .delete({ count: 'exact' })
      .lt('created_at', dataLimite.toISOString())
      .in('status', ['sent', 'failed']);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, mensagem: `Limpeza concluída. ${count || 0} e-mails removidos.` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
