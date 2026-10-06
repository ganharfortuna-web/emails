'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { 
  MailCheck, MousePointerClick, AlertCircle, Server, 
  CheckCircle2, XCircle, Settings, Loader2 
} from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function DashboardPage() {
  const [smtps, setSmtps] = useState<any[]>([])
  const [carregandoSmtps, setCarregandoSmtps] = useState(true)
  const [erroDebug, setErroDebug] = useState<string | null>(null)

  useEffect(() => {
    const buscarSmtps = async () => {
      console.log('🔍 Iniciando busca de SMTPs...')
      console.log('🔗 URL Supabase:', supabaseUrl)

      const { data, error, status, statusText } = await supabase
        .from('smtp_accounts')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📦 Resposta Supabase:', { data, error, status, statusText })

      if (error) {
        setErroDebug(`Erro ${status} (${statusText}): ${error.message} — Detalhes: ${error.details || 'sem detalhes'}`)
        setCarregandoSmtps(false)
        return
      }

      setSmtps(data || [])
      setCarregandoSmtps(false)
    }
    buscarSmtps()
  }, [])

  const totalAtivos = smtps.filter(s => s.is_active).length
  const totalPausados = smtps.filter(s => !s.is_active).length

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      
      {/* ALERTA DE DEBUG — só aparece se der erro */}
      {erroDebug && (
        <div className="bg-red-50 border-2 border-red-300 text-red-900 p-5 rounded-xl">
          <p className="font-black mb-1">🐛 DEBUG — Erro ao buscar SMTPs:</p>
          <p className="text-sm font-mono break-all">{erroDebug}</p>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-black text-slate-900">Visão Geral das Métricas</h2>
        <p className="text-lg text-slate-600 mt-2">
          Acompanhe o desempenho diário das suas campanhas e a saúde da sua infraestrutura de envios.
        </p>
      </div>
      
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
          <p className="text-sm text-slate-500 mt-2 font-bold">Somando todas as contas</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600">Taxa de Abertura Média</h3>
            <div className="bg-emerald-100 p-3 rounded-xl">
              <MousePointerClick className="size-6 text-emerald-700" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900">28.4%</p>
          <p className="text-sm text-emerald-600 mt-2 font-bold">Saudável</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600">Contas Cadastradas</h3>
            <div className="bg-orange-100 p-3 rounded-xl">
              <AlertCircle className="size-6 text-orange-600" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900">{smtps.length}</p>
          <p className="text-sm text-slate-500 mt-2 font-bold">
            <span className="text-emerald-600">{totalAtivos} ativas</span> • <span className="text-orange-600">{totalPausados} pausadas</span>
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Relatório Rápido de Cliques</h3>
          <p className="text-slate-600 mb-8">Acompanhe os links mais clicados nas últimas campanhas.</p>
          <div className="space-y-4">
            {['/promocao-vitalicia', '/video-apresentacao', '/checkout'].map((l, i) => (
              <div key={l} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                <span className="text-slate-700 font-bold">Link: {l}</span>
                <span className="bg-blue-50 text-blue-800 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-100">
                  {[342, 128, 89][i]} cliques
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Server className="size-5 text-slate-700" />
              Configurações de SMTPs
            </h3>
            <Link
              href="/dashboard/configuracoes"
              className="text-slate-500 hover:text-blue-600 transition-colors p-2 bg-slate-50 hover:bg-blue-50 rounded-xl"
            >
              <Settings className="size-5" />
            </Link>
          </div>
          <p className="text-slate-600 mb-8">Status das contas de envio conectadas ao sistema.</p>
          
          {carregandoSmtps ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-blue-500" />
            </div>
          ) : smtps.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <p className="text-sm text-slate-500 font-medium mb-3">
                Nenhum servidor cadastrado ainda.
              </p>
              <Link href="/dashboard/configuracoes" className="text-sm font-bold text-blue-600 hover:underline">
                + Adicionar primeiro servidor
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {smtps.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div className="flex flex-col min-w-0 pr-3">
                    <span className="text-slate-700 font-bold truncate">{s.sender_email || s.email}</span>
                    <span className="text-xs text-slate-400 mt-1 font-medium truncate">{s.host} • Porta {s.port}</span>
                  </div>
                  {s.is_active ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-bold border border-emerald-100 shrink-0">
                      <CheckCircle2 className="size-4" /> Conectado
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-bold border border-red-100 shrink-0">
                      <XCircle className="size-4" /> Pausado
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}