// ============================================
// CONFIGURAÇÃO CENTRALIZADA DE LIMITES
// Altere os valores conforme seu plano
// ============================================

export const CONFIG = {
  // ===== PLANO VERCEL =====
  // 'hobby' = grátis (10s timeout) | 'pro' = pago (60s timeout)
  VERCEL_PLAN: (process.env.VERCEL_PLAN || 'hobby') as 'hobby' | 'pro',

  // ===== SUPABASE =====
  // 'free' = 500 MB | 'pro' = 8 GB
  SUPABASE_PLAN: (process.env.SUPABASE_PLAN || 'free') as 'free' | 'pro',

  // ===== LIMPEZA AUTOMÁTICA =====
  // Dias que os e-mails ficam no banco antes de serem apagados
  // Sugestão: 7 (free) | 30 (pro)
  DIAS_RETENCAO_EMAILS: Number(process.env.DIAS_RETENCAO_EMAILS || 7),

  // Dias que os bounce_logs ficam antes de serem apagados
  DIAS_RETENCAO_BOUNCES: Number(process.env.DIAS_RETENCAO_BOUNCES || 30),

  // ===== LIMITE POR CONTA =====
  // Se não vier configurado na tabela smtp_accounts.daily_limit
  LIMITE_PADRAO_GMAIL_NOVO: 50,      // Conta Gmail < 1 semana
  LIMITE_PADRAO_GMAIL_MADURO: 450,   // Conta Gmail > 1 mês
  LIMITE_PADRAO_SMTP_PAGO: 5000,     // SMTP pago (SendGrid/Brevo)
}

// ============================================
// BATCH SIZE automático conforme plano Vercel
// ============================================
export function getBatchSize(): number {
  return CONFIG.VERCEL_PLAN === 'pro' ? 50 : 8
}

// ============================================
// Estimativa diária segura
// ============================================
export function getEstimativaDiaria(): number {
  if (CONFIG.SUPABASE_PLAN === 'pro') {
    return 50000
  }
  // Free: calculado com base na retenção
  const dias = CONFIG.DIAS_RETENCAO_EMAILS
  const totalPossivelBanco = Math.floor(500 * 1024 / 3) // 500 MB ÷ 3 KB
  return Math.min(Math.floor(totalPossivelBanco / dias), 11520)
}
