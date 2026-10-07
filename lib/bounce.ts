// ============================================
// Classificador de erros SMTP
// ============================================

export type BounceType = 'hard' | 'soft' | 'auth' | 'rate_limit' | 'complaint' | 'unknown'

export type BounceClassificacao = {
  type: BounceType
  code: string
  retryable: boolean
  action: 'block_contact' | 'retry' | 'disable_account' | 'pause_account' | 'none'
}

export function classificarErro(errorMessage: string, smtpResponse?: string): BounceClassificacao {
  const msg = `${errorMessage || ''} ${smtpResponse || ''}`.toLowerCase()

  // HARD BOUNCE — endereço inválido
  if (
    msg.includes('550') || msg.includes('551') || msg.includes('553') ||
    msg.includes('user unknown') || msg.includes('address not found') ||
    msg.includes('mailbox not found') || msg.includes('mailbox unavailable') ||
    msg.includes('does not exist') || msg.includes('invalid recipient') ||
    msg.includes('no such user') || msg.includes('recipient rejected') ||
    msg.includes('domain not found') || msg.includes('recipient address rejected')
  ) {
    return { type: 'hard', code: extrairCodigo(msg), retryable: false, action: 'block_contact' }
  }

  // COMPLAINT — spam report
  if (
    msg.includes('complaint') || msg.includes('abuse') ||
    msg.includes('spam report') || msg.includes('marked as spam')
  ) {
    return { type: 'complaint', code: extrairCodigo(msg), retryable: false, action: 'block_contact' }
  }

  // AUTH ERROR — senha errada, conta bloqueada
  if (
    msg.includes('535') || msg.includes('534') ||
    msg.includes('authentication') || msg.includes('invalid credentials') ||
    msg.includes('username and password not accepted') ||
    msg.includes('login failed') || msg.includes('bad credentials')
  ) {
    return { type: 'auth', code: extrairCodigo(msg), retryable: false, action: 'disable_account' }
  }

  // RATE LIMIT — muitos envios
  if (
    msg.includes('421') || msg.includes('450') ||
    msg.includes('rate limit') || msg.includes('too many') ||
    msg.includes('try again later') || msg.includes('throttle') ||
    msg.includes('quota exceeded')
  ) {
    return { type: 'rate_limit', code: extrairCodigo(msg), retryable: true, action: 'pause_account' }
  }

  // SOFT BOUNCE — temporário
  if (
    msg.includes('452') || msg.includes('451') ||
    msg.includes('mailbox full') || msg.includes('storage exceeded') ||
    msg.includes('temporarily unavailable') || msg.includes('try again') ||
    msg.includes('connection timeout') || msg.includes('service unavailable') ||
    msg.includes('message size') || msg.includes('over quota')
  ) {
    return { type: 'soft', code: extrairCodigo(msg), retryable: true, action: 'retry' }
  }

  // DESCONHECIDO — trata como soft
  return { type: 'unknown', code: extrairCodigo(msg), retryable: true, action: 'retry' }
}

function extrairCodigo(msg: string): string {
  const m = msg.match(/\b(\d{3})\b/)
  return m ? m[1] : 'unknown'
}

// Backoff exponencial: 1ª tentativa 1h, 2ª 6h, 3ª 24h
export function calcularProximaTentativa(retryCount: number): Date {
  const delays = [60, 360, 1440]
  const minutos = delays[Math.min(retryCount, delays.length - 1)]
  return new Date(Date.now() + minutos * 60 * 1000)
}
