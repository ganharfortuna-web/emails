import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Delay para classificar se o 1º hit veio de preview automático.
// NÃO bloqueia a contagem — só serve como info adicional.
const DELAY_PREVIEW_SEGUNDOS = 15

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // User-Agent ajuda a identificar Gmail proxy, Apple MPP, etc.
      const userAgent = request.headers.get('user-agent') || 'unknown'

      const { data: item } = await supabase
        .from('email_queue')
        .select('id, sent_at, opened_at, open_count, status')
        .eq('id', id)
        .single()

      if (item && item.status === 'sent') {
        const agora = new Date()
        const segundosDesdeEnvio = item.sent_at
          ? (agora.getTime() - new Date(item.sent_at).getTime()) / 1000
          : 999
        const isPreview = segundosDesdeEnvio < DELAY_PREVIEW_SEGUNDOS

        if (!item.opened_at) {
          // ✅ 1ª requisição: registra como aberto (preview OU real)
          // Conta como aberto SEMPRE — é o comportamento das grandes
          await supabase
            .from('email_queue')
            .update({
              opened_at: agora.toISOString(),
              open_first_at: agora.toISOString(),
              open_last_at: agora.toISOString(),
              open_count: 1,
              open_is_preview: isPreview,
              open_user_agent: userAgent.slice(0, 300),
            })
            .eq('id', id)

        } else {
          // ✅ Já tinha aberto: incrementa contador e atualiza o "último"
          // Se for real (não-preview) e antes estava só preview, reclassifica
          const novoPreview = item.open_count === 1 && isPreview ? true : false

          await supabase
            .from('email_queue')
            .update({
              open_last_at: agora.toISOString(),
              open_count: (item.open_count || 1) + 1,
              open_is_preview: novoPreview,
            })
            .eq('id', id)
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