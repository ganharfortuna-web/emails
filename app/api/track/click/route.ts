import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const url = searchParams.get('url')

  if (id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Marca como clicado
      await supabase
        .from('email_queue')
        .update({ clicked_at: new Date().toISOString() })
        .eq('id', id)
        .is('clicked_at', null)
    }
  }

  // Redireciona para o link original (ou fallback)
  const destino = url || process.env.NEXT_PUBLIC_APP_URL || 'https://google.com'
  return NextResponse.redirect(destino)
}
