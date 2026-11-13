'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { 
  MailCheck, MousePointerClick, Users, LayoutTemplate, 
  Server, CheckCircle2, XCircle, Settings, Loader2 
} from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function DashboardPage() {
  const [smtps, setSmtps] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroDebug, setErroDebug] = useState<string | null>(null)

  // Novos estados para métricas reais
  const [totalLeads, setTotalLeads] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [taxaAbertura, setTaxaAbertura] = useState(0)

  useEffect(() => {
    const buscarDados = async () => {
      try {
        // 1. Busca SMTPs
        const { data: dataSmtps, error: errSmtps } = await supabase
          .from('smtp_accounts')
          .select('*')
          .order('created_at', { ascending: false })

        if (errSmtps) throw errSmtps

        // 2. Busca total de contatos (Leads)
        const { count: countLeads } = await supabase
          .from('contatos')
          .select('*', { count: 'exact', head: true })

        // 3. Busca total de páginas de captura
        const { count: countPaginas } = await supabase
          .from('landing_pages')
          .select('*', { count: 'exact', head: true })

        // 4. Busca métricas de abertura (E-mails enviados vs abertos)
        const { data: emailsSent } = await supabase
          .from('email_queue')
          .select('opened_at')
          .eq('status', 'sent')

        let taxa = 0
        if (emailsSent && emailsSent.length > 0) {
          const abertos = emailsSent.filter(e => e.opened_at !== null).length
          taxa = Math.round((abertos / emailsSent.length) * 100)
        }

        setSmtps(dataSmtps || [])
        setTotalLeads(countLeads || 0)
        setTotalPaginas(countPaginas || 0)
        setTaxaAbertura(taxa)

      } catch (error: any) {
        setErroDebug(`Erro ao buscar dados: ${error.message}`)
      } finally {
        setCarregando(false)
      }
    }
    
    buscarDados()
  }, [])

  const totalAtivos = smtps.filter(s => s.is_active).length
  const totalPausados = smtps.filter(s => !s.is_active).length

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Loader2 className="size-10 animate-spin text-blue-600 mb-4" />
        <p className="font-bold">Carregando painel...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      
      {erroDebug && (
        <div className="bg-red-50 border-2 border-red-300 text-red-900 p-5 rounded-xl">
          <p className="font-black mb-1">🐛 Erro no Painel:</p>
          <p className="text-sm font-mono break-all">{erroDebug}</p>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-black text-slate-900">Visão Geral das Métricas</h2>
        <p className="text-lg text-slate-600 mt-2">
          Acompanhe o desempenho diário das suas campanhas e a captura de novos leads.
        </p>
      </div>
      
      {/* CARDS DE MÉTRICAS PRINCIPAIS */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600">E-mails Enviados Hoje</h3>
            <div className="bg-blue-100 p-3 rounded-xl">
              <MailCheck className="size-6 text-blue-700" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900">
            {smtps.reduce((acc, s) => acc + (s.sent_today || 0), 0).toLocaleString('pt-BR')}
          </p>
          <p className="text-sm text-slate-500 mt-2 font-bold">Somando todas as contas SMTP</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600">Taxa de Abertura Global</h3>
            <div className="bg-emerald-100 p-3 rounded-xl">
              <MousePointerClick className="size-6 text-emerald-700" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900">{taxaAbertura}%</p>
          <p className="text-sm text-emerald-600 mt-2 font-bold">Baseado no total de envios</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600">Leads Capturados</h3>
            <div className="bg-orange-100 p-3 rounded-xl">
              <Users className="size-6 text-orange-600" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900">{totalLeads.toLocaleString('pt-BR')}</p>
          <p className="text-sm text-slate-500 mt-2 font-bold">Total de contatos na base</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* PAINEL DE PÁGINAS DE CAPTURA */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <LayoutTemplate className="size-5 text-indigo-600" />
                Páginas de Captura
              </h3>
              <Link
                href="/dashboard/paginas"
                className="text-slate-500 hover:text-indigo-600 transition-colors p-2 bg-slate-50 hover:bg-indigo-50 rounded-xl"
              >
                <Settings className="size-5" />
              </Link>
            </div>
            <p className="text-slate-600 mb-6">Gerencie suas landing pages para atração de leads.</p>
          </div>
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-center">
            <h4 className="text-5xl font-black text-indigo-700 mb-2">{totalPaginas}</h4>
            <p className="text-indigo-600 font-bold text-sm uppercase tracking-wide mb-4">Páginas Criadas</p>
            <Link href="/dashboard/paginas" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm">
              + Criar Nova Página
            </Link>
          </div>
        </div>

        {/* CONFIGURAÇÕES DE SMTP */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Server className="size-5 text-slate-700" />
              Contas de Envio (SMTP)
            </h3>
            <Link
              href="/dashboard/configuracoes"
              className="text-slate-500 hover:text-blue-600 transition-colors p-2 bg-slate-50 hover:bg-blue-50 rounded-xl"
            >
              <Settings className="size-5" />
            </Link>
          </div>
          <p className="text-slate-600 mb-6">Status das contas conectadas.</p>
          
          {smtps.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center my-auto">
              <p className="text-sm text-slate-500 font-medium mb-3">Nenhum servidor cadastrado.</p>
              <Link href="/dashboard/configuracoes" className="text-sm font-bold text-blue-600 hover:underline">
                + Adicionar primeiro servidor
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {smtps.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div className="flex flex-col min-w-0 pr-3">
                    <span className="text-slate-700 font-bold truncate">{s.sender_email || s.email}</span>
                    <span className="text-xs text-slate-400 mt-1 font-medium truncate">{s.host} • Porta {s.port}</span>
                  </div>
                  {s.is_active ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100 shrink-0">
                      <CheckCircle2 className="size-3" /> Ativa
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100 shrink-0">
                      <XCircle className="size-3" /> Pausada
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-2">
                <p className="text-xs text-slate-500 font-bold text-center">
                  <span className="text-emerald-600">{totalAtivos} ativas</span> • <span className="text-orange-600">{totalPausados} pausadas</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}