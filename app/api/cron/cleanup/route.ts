import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CONFIG } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenQuery = searchParams.get('token')
  const tokenHeader = request.headers.get('authorization')?.replace('Bearer ', '')

  const tokenRecebido = tokenHeader || tokenQuery
  if (tokenRecebido !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Env vars faltando' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 0. Consolida métricas nas campanhas ANTES de apagar
    await supabase.rpc('consolidar_metricas_campanhas' as any)

    // 1. Apaga e-mails (sent/failed) antigos
    const dataLimiteEmails = new Date()
    dataLimiteEmails.setDate(dataLimiteEmails.getDate() - CONFIG.DIAS_RETENCAO_EMAILS)

    const { count: apagadosEmails } = await supabase
      .from('email_queue')
      .delete({ count: 'exact' })
      .in('status', ['sent', 'failed'])
      .lt('created_at', dataLimiteEmails.toISOString())

    // 2. Apaga bounces antigos
    const dataLimiteBounces = new Date()
    dataLimiteBounces.setDate(dataLimiteBounces.getDate() - CONFIG.DIAS_RETENCAO_BOUNCES)

    const { count: apagadosBounces } = await supabase
      .from('bounce_log')
      .delete({ count: 'exact' })
      .lt('created_at', dataLimiteBounces.toISOString())

    // 3. Apaga e-mails órfãos (campanha deletada)
    try {
      await supabase.rpc('delete_orphan_emails' as any)
    } catch (e) {
      // Ignora erro se a função ainda não existir no banco
      console.log('delete_orphan_emails não disponível (opcional)')
    }

    // 4. Estatísticas atuais do banco
    const { count: totalEmails } = await supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })

    const { count: totalBounces } = await supabase
      .from('bounce_log')
      .select('*', { count: 'exact', head: true })

    // 5. Retorna
    return NextResponse.json({
      success: true,
      plano_vercel: CONFIG.VERCEL_PLAN,
      plano_supabase: CONFIG.SUPABASE_PLAN,
      retencao_emails_dias: CONFIG.DIAS_RETENCAO_EMAILS,
      retencao_bounces_dias: CONFIG.DIAS_RETENCAO_BOUNCES,
      apagados: {
        emails: apagadosEmails || 0,
        bounces: apagadosBounces || 0,
      },
      restante_no_banco: {
        emails: totalEmails || 0,
        bounces: totalBounces || 0,
      },
      estimativa_maxima_diaria: getEstimativaDiaria(),
    })
  } catch (error: any) {
    console.error('ERRO cleanup:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getEstimativaDiaria(): number {
  if (CONFIG.SUPABASE_PLAN === 'pro') return 50000
  const totalPossivelBanco = Math.floor(500 * 1024 / 3)
  return Math.min(Math.floor(totalPossivelBanco / CONFIG.DIAS_RETENCAO_EMAILS), 11520)
}
