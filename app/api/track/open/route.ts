import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Tempo (segundos) para classificar um hit como "prefetch de servidor"
const PREFETCH_WINDOW_SECONDS = 5

// Padrões de user-agents conhecidos de bots/scanners de segurança
const BOT_PATTERNS = [
  'googlebot',
  'bingbot',
  'slackbot',
  'discordbot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'skypeuripreview',
  'barracuda',
  'proofpoint',
  'mimecast',
  'symantec',
  'forcepoint',
  'microsoft office existence discover',
  'msoffice',
  'outlook-ios',
  'outlook-android',
  'curl',
  'wget',
  'python-requests',
  'axios',
  'go-http-client',
  'headlesschrome',
]

// Padrões que indicam Apple Mail Privacy Protection (MPP)
// MPP baixa TODO pixel automaticamente — inútil para medir abertura
const APPLE_MPP_PATTERNS = [
  'applewebkit',
  'mailprivacy',
  'applemail',
]

function isBot(ua: string): boolean {
  const u = ua.toLowerCase()
  return BOT_PATTERNS.some(p => u.includes(p))
}

function isAppleMPP(ua: string, ip: string): boolean {
  const u = ua.toLowerCase()
  // Apple Mail (iOS 15+ / macOS Monterey+) baixa automaticamente
  // User-agent típico: "Mozilla/5.0 (Macintosh; Intel Mac OS X ...) AppleWebKit/..."
  // Combinado com IP da Apple (17.0.0.0/8)
  if (APPLE_MPP_PATTERNS.some(p => u.includes(p)) && u.includes('applewebkit')) {
    return true
  }
  // IPs conhecidos da Apple (faixa 17.x.x.x)
  if (ip.startsWith('17.')) return true
  return false
}

function isGmailPrefetch(ua: string, secondsSinceSend: number): boolean {
  const u = ua.toLowerCase()
  // Gmail usa proxy "GoogleImageProxy" — mas também é usado em aberturas reais
  // Então só classificamos como prefetch se foi MUITO rápido (< 5s)
  if (secondsSinceSend < PREFETCH_WINDOW_SECONDS) return true
  // Bots de scanner rápido
  if (u.includes('googleimageproxy') && secondsSinceSend < 30) return true
  return false
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      const userAgent = (request.headers.get('user-agent') || '').slice(0, 300)
      const ip = (
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
      )

      const { data: item } = await supabase
        .from('email_queue')
        .select('id, sent_at, opened_at, open_type, open_real_count, open_prefetch_count, status')
        .eq('id', id)
        .single()

      if (item && item.status === 'sent') {
        const agora = Date.now()
        const enviadoEm = item.sent_at ? new Date(item.sent_at).getTime() : 0
        const segundosDesdeEnvio = enviadoEm ? (agora - enviadoEm) / 1000 : 9999

        // 🚫 1. BOT/SCANNER → ignora TOTALMENTE, nem marca opened_at
        if (isBot(userAgent)) {
          return new Response(PIXEL, {
            headers: {
              'Content-Type': 'image/gif',
              'Cache-Control': 'no-store',
            },
          })
        }

        // 🍎 2. Apple MPP → marca como prefetch, nunca como abertura real
        let tipo: 'real' | 'prefetch' | 'apple_mpp' = 'real'

        if (isAppleMPP(userAgent, ip)) {
          tipo = 'apple_mpp'
        } else if (isGmailPrefetch(userAgent, segundosDesdeEnvio)) {
          tipo = 'prefetch'
        }

        // Atualiza contadores
        const isReal = tipo === 'real'
        const realCount = (item.open_real_count || 0) + (isReal ? 1 : 0)
        const prefetchCount = (item.open_prefetch_count || 0) + (isReal ? 0 : 1)

        await supabase
          .from('email_queue')
          .update({
            opened_at: item.opened_at || new Date().toISOString(),
            open_type: isReal ? 'real' : item.open_type || tipo,
            open_user_agent: userAgent,
            open_ip: ip,
            open_real_count: realCount,
            open_prefetch_count: prefetchCount,
          })
          .eq('id', id)
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