import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Marca abertura como "real" só se passou X segundos
// Abaixo disso, considera como preview automático do cliente
const DELAY_PREVIEW_SEGUNDOS = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Busca o item
      const { data: item } = await supabase
        .from('email_queue')
        .select('id, sent_at, opened_at, status')
        .eq('id', id)
        .single()

      if (item && item.status === 'sent' && !item.opened_at && item.sent_at) {
        const agora = Date.now()
        const enviadoEm = new Date(item.sent_at).getTime()
        const segundosDesdeEnvio = (agora - enviadoEm) / 1000

        const isPreview = segundosDesdeEnvio < DELAY_PREVIEW_SEGUNDOS

        // ✅ MARCA SEMPRE (mesmo se for preview)
        // Se for preview, marca open_is_preview = true
        // Se for real, marca open_is_preview = false
        await supabase
          .from('email_queue')
          .update({ 
            opened_at: new Date().toISOString(),
            open_is_preview: isPreview
          })
          .eq('id', id)
          .is('opened_at', null)
      }
    }
  }

  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  })
}