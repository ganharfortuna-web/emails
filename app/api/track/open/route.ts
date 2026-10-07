import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Segundos mínimos desde o envio para considerar "abertura real"
const DELAY_PREVIEW_SEGUNDOS = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      const { data: item } = await supabase
        .from('email_queue')
        .select('id, sent_at, opened_at, open_is_preview, status')
        .eq('id', id)
        .single()

      if (item && item.status === 'sent' && item.sent_at) {
        const agora = Date.now()
        const enviadoEm = new Date(item.sent_at).getTime()
        const segundosDesdeEnvio = (agora - enviadoEm) / 1000
        const isPreview = segundosDesdeEnvio < DELAY_PREVIEW_SEGUNDOS

        if (!item.opened_at) {
          // 🆕 PRIMEIRA vez que abre: registra (preview OU real)
          await supabase
            .from('email_queue')
            .update({
              opened_at: new Date().toISOString(),
              open_is_preview: isPreview,
            })
            .eq('id', id)

        } else if (item.open_is_preview === true && !isPreview) {
          // 🔥 JÁ tinha preview, mas AGORA é abertura real (passou do delay)
          // Atualiza para "real" mantendo o opened_at original
          await supabase
            .from('email_queue')
            .update({ open_is_preview: false })
            .eq('id', id)
        }
        // Se já é real (false), não faz nada
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