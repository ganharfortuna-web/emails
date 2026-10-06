import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Pixel GIF transparente 1x1
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// ⏱️ Só conta abertura se passaram X segundos desde o envio
// Isso evita contabilizar o "preview" automático do Gmail/Outlook
const DELAY_MINIMO_SEGUNDOS = 90

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Busca o item para ver quando foi enviado
      const { data: item } = await supabase
        .from('email_queue')
        .select('id, sent_at, opened_at, status')
        .eq('id', id)
        .single()

      if (item && item.status === 'sent' && !item.opened_at && item.sent_at) {
        const agora = Date.now()
        const enviadoEm = new Date(item.sent_at).getTime()
        const segundosDesdeEnvio = (agora - enviadoEm) / 1000

        // Só marca se passou tempo suficiente (filtra preview automático)
        if (segundosDesdeEnvio >= DELAY_MINIMO_SEGUNDOS) {
          await supabase
            .from('email_queue')
            .update({ opened_at: new Date().toISOString() })
            .eq('id', id)
            .is('opened_at', null)
        }
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