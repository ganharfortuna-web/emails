'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, MailX, ShieldAlert, RotateCcw, AlertTriangle, TrendingDown } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function BouncesPage() {
  const [bounces, setBounces] = useState<any[]>([])
  const [supressoes, setSupressoes] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<'bounces' | 'suprimidos'>('bounces')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    setCarregando(true)
    const [b, s] = await Promise.all([
      supabase.from('bounce_log').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('suppression_list').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    if (b.data) setBounces(b.data)
    if (s.data) setSupressoes(s.data)
    setCarregando(false)
  }

  const removerSupressao = async (id: string, email: string) => {
    if (!confirm(`Reativar ${email}?\n\nEle poderá receber e-mails novamente.`)) return

    await supabase.from('suppression_list').delete().eq('id', id)
    await supabase.from('contatos').update({ status: 'ativo' }).eq('email', email)
    carregar()
  }

  const removerTodasSupressoes = async () => {
    if (!confirm(`Remover TODAS as ${supressoes.length} supressões?\n\nTodos os contatos voltarão a receber e-mails.`)) return

    const emails = supressoes.map(s => s.email)
    await supabase.from('suppression_list').delete().in('email', emails)
    await supabase.from('contatos').update({ status: 'ativo' }).in('email', emails)
    carregar()
  }

  const corTipo = (tipo: string) =>
    tipo === 'hard' ? 'bg-rose-100 text-rose-700 border-rose-200'
    : tipo === 'soft' ? 'bg-amber-100 text-amber-700 border-amber-200'
    : tipo === 'auth' ? 'bg-purple-100 text-purple-700 border-purple-200'
    : tipo === 'rate_limit' ? 'bg-blue-100 text-blue-700 border-blue-200'
    : tipo === 'complaint' ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-slate-100 text-slate-700 border-slate-200'

  const labelTipo = (tipo: string) =>
    tipo === 'hard' ? 'Hard Bounce'
    : tipo === 'soft' ? 'Soft Bounce'
    : tipo === 'auth' ? 'Auth Error'
    : tipo === 'rate_limit' ? 'Rate Limit'
    : tipo === 'complaint' ? 'Spam Report'
    : tipo === 'unknown' ? 'Desconhecido'
    : tipo

  const filtrados = filtroTipo === 'todos'
    ? bounces
    : bounces.filter(b => b.bounce_type === filtroTipo)

  const stats = {
    hard: bounces.filter(b => b.bounce_type === 'hard').length,
    soft: bounces.filter(b => b.bounce_type === 'soft').length,
    auth: bounces.filter(b => b.bounce_type === 'auth').length,
    complaint: bounces.filter(b => b.bounce_type === 'complaint').length,
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Bounces e Supressões</h2>
          <p className="text-lg text-slate-600 mt-2">
            Erros de entrega, retries automáticos e contatos bloqueados.
          </p>
        </div>
        <button onClick={carregar} disabled={carregando}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-lg shadow-sm disabled:opacity-50 text-sm">
          <RefreshCw className={`size-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <MailX className="size-5 text-rose-600" />
            <span className="text-xs font-bold text-rose-700 uppercase">Hard</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.hard}</p>
          <p className="text-xs text-rose-700 font-bold mt-1">E-mail inválido</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="size-5 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase">Soft</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.soft}</p>
          <p className="text-xs text-amber-700 font-bold mt-1">Temporário</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <ShieldAlert className="size-5 text-purple-600" />
            <span className="text-xs font-bold text-purple-700 uppercase">Auth</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.auth}</p>
          <p className="text-xs text-purple-700 font-bold mt-1">Conta desativada</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="size-5 text-red-600" />
            <span className="text-xs font-bold text-red-700 uppercase">Spam</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.complaint}</p>
          <p className="text-xs text-red-700 font-bold mt-1">Marcado como spam</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setAba('bounces')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-1 ${
            aba === 'bounces' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}>
          <MailX className="size-4" /> Erros de envio ({bounces.length})
        </button>
        <button onClick={() => setAba('suprimidos')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-1 ${
            aba === 'suprimidos' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}>
          <ShieldAlert className="size-4" /> Lista de supressão ({supressoes.length})
        </button>
      </div>

      {carregando ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-blue-500" />
        </div>
      ) : aba === 'bounces' ? (
        <>
          {/* Filtros */}
          {bounces.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {['todos', 'hard', 'soft', 'auth', 'rate_limit', 'complaint'].map(t => (
                <button key={t} onClick={() => setFiltroTipo(t)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                    filtroTipo === t
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}>
                  {t === 'todos' ? 'Todos' : labelTipo(t)}
                </button>
              ))}
            </div>
          )}

          {filtrados.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-500 font-medium text-lg">
                🎉 Nenhum bounce registrado{filtroTipo !== 'todos' ? ' para este filtro' : ''}.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3 text-left font-bold">Data</th>
                      <th className="p-3 text-left font-bold">E-mail</th>
                      <th className="p-3 text-left font-bold">Tipo</th>
                      <th className="p-3 text-left font-bold">Código</th>
                      <th className="p-3 text-left font-bold">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtrados.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(b.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{b.recipient_email}</td>
                        <td className="p-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap ${corTipo(b.bounce_type)}`}>
                            {labelTipo(b.bounce_type)}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-xs">{b.error_code}</td>
                        <td className="p-3 text-slate-600 text-xs max-w-md truncate" title={b.error_message}>
                          {b.error_message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {supressoes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-500 font-medium text-lg">Nenhum e-mail suprimido.</p>
              <p className="text-sm text-slate-400 mt-2">
                Contatos com hard bounce ou spam report aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="size-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-amber-900 text-sm">Lista de supressão ativa</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Estes e-mails <strong>nunca</strong> receberão novas mensagens até serem reativados manualmente.
                    Isso protege a reputação do seu domínio.
                  </p>
                </div>
                <button onClick={removerTodasSupressoes}
                  className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0">
                  <RotateCcw className="size-3" /> Reativar todas
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-3 text-left font-bold">E-mail</th>
                        <th className="p-3 text-left font-bold">Motivo</th>
                        <th className="p-3 text-left font-bold">Data</th>
                        <th className="p-3 text-right font-bold">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supressoes.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{s.email}</td>
                          <td className="p-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded border ${
                              s.reason === 'complaint' ? 'bg-red-50 text-red-700 border-red-200'
                              : s.reason === 'manual' ? 'bg-slate-50 text-slate-700 border-slate-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {s.reason === 'complaint' ? 'Spam' : s.reason === 'manual' ? 'Manual' : 'Hard Bounce'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-xs">
                            {new Date(s.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3 text-right">
                            <button onClick={() => removerSupressao(s.id, s.email)}
                              className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 ml-auto">
                              <RotateCcw className="size-3" /> Reativar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
