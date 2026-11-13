import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const url = searchParams.get('url')

  // Se não tiver a URL de destino, joga para a home
  if (!url) {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL || 'https://google.com')
  }

  // Atualiza o banco de dados (sem travar o carregamento da página)
  if (id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      // Dispara a atualização e não espera o retorno para redirecionar mais rápido
      supabase
        .from('email_queue')
        .update({ clicked_at: new Date().toISOString() })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Erro ao registrar clique:', error)
        })
    }
  }

  // Redireciona a pessoa imediatamente para o link original
  return NextResponse.redirect(url, 302)
}
