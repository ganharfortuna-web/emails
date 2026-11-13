"use client"

import { useState, useEffect } from 'react'
import { Send, Clock, Mail, Loader2, Hourglass, Trash2, RotateCcw, CheckSquare, Square, Eye, MousePointerClick, Pencil, Zap, RefreshCw, Pause, Play, BarChart3, X, Users, AlertCircle, Copy, Globe } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

// @ts-ignore
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(async () => {
  const { default: RQ } = await import('react-quill')
  return RQ
}, { ssr: false, loading: () => <p className="p-4 text-slate-400 text-sm">Carregando editor...</p> })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const modulosEditor = {
  toolbar: [['bold', 'italic', 'underline'], [{ 'color': [] }, { 'background': [] }], ['link'], ['clean']],
}

const STATS_VAZIO = { abertos: 0, clicados: 0, total: 0, enviados: 0, pendentes: 0 }

export default function AutomacoesPage() {
  const [listas, setListas] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [listaSelecionada, setListaSelecionada] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<Record<string, any>>({})

  useEffect(() => { buscarListas(); buscarCampanhas(); }, [])
  useEffect(() => { if (campanhas.length > 0) carregarStats(); }, [campanhas])

  const buscarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome, contatos(count)').order('nome')
    if (data) setListas(data)
  }

  const buscarCampanhas = async (silencioso = false) => {
    if (!silencioso) setCarregandoHistorico(true)
    if (silencioso) setAtualizando(true)
    const { data } = await supabase.from('campanhas').select('*, listas(nome)').order('created_at', { ascending: false }).limit(50)
    if (data) setCampanhas(data)
    setCarregandoHistorico(false); setAtualizando(false)
  }

  const carregarStats = async () => {
    const novasStats: Record<string, any> = {}
    for (const c of campanhas) {
      const [tot, env, pend, ab, cli] = await Promise.all([
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'sent'),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'pending'),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).not('opened_at', 'is', null),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).not('clicked_at', 'is', null)
      ])
      novasStats[String(c.id)] = { total: tot.count || 0, enviados: env.count || 0, pendentes: pend.count || 0, abertos: ab.count || 0, clicados: cli.count || 0 }
    }
    setStats(novasStats)
  }

  const dispararViaAPI = async (campanhaId: string | number) => {
    if (!confirm('Deseja disparar esta campanha usando a API externa? O SMTP não será usado.')) return
    setProcessandoId(String(campanhaId))
    try {
      const r = await fetch('/api/disparo/api-provider', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanhaId }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Erro desconhecido')
      alert(`✅ ${j.message}`)
      buscarCampanhas(true); carregarStats()
    } catch (err: any) {
      alert(`⚠️ Erro na API: ${err.message}`)
    }
    setProcessandoId(null)
  }

  const dispararSMTP = async (campanhaId: string | number) => {
    setProcessandoId(String(campanhaId))
    let continuar = true; let enviados = 0
    while (continuar) {
      try {
        const r = await fetch('/api/disparo/processar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhaId }) })
        const j = await r.json()
        if (!r.ok) { alert(`⚠️ Erro: ${j.error}`); break }
        enviados += (j.enviados || 0)
        buscarCampanhas(true); carregarStats()
        if (j.done || j.restantes === 0) continuar = false
        else await new Promise(res => setTimeout(res, 1500))
      } catch (err) { await new Promise(res => setTimeout(res, 3000)) }
    }
    setProcessandoId(null); buscarCampanhas(true); carregarStats()
    if (enviados > 0) alert(`✅ ${enviados} e-mails enviados via SMTP.`)
  }

  const toggleSelecionada = (id: string) => {
    const novo = new Set(selecionadas); novo.has(id) ? novo.delete(id) : novo.add(id); setSelecionadas(novo)
  }

  const deletarCampanhas = async (ids: string[]) => {
    if (!confirm(`Apagar ${ids.length} campanha(s)?`)) return
    await supabase.from('email_queue').delete().in('campaign_id', ids)
    await supabase.from('campanhas').delete().in('id', ids)
    setSelecionadas(new Set()); buscarCampanhas()
  }

  const prepararDisparo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listaSelecionada || !assunto || !mensagem) { alert("Preencha os campos."); return }
    setEnviando(true)
    const { data: novaCampanha, error } = await supabase.from('campanhas').insert([{ lista_id: listaSelecionada, assunto, mensagem, status: 'Em Fila' }]).select().single()
    if (error) { alert(`Erro: ${error.message}`); setEnviando(false); return }
    try {
      await fetch('/api/disparo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhaId: novaCampanha.id }) })
      setEnviando(false); setAssunto(''); setMensagem(''); setListaSelecionada('')
      buscarCampanhas()
    } catch (err) { alert("Erro ao enfileirar."); setEnviando(false) }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div><h2 className="text-3xl font-black text-slate-900">Automações</h2><p className="text-slate-600 mt-1">Crie e dispare campanhas.</p></div>
        <button onClick={() => buscarCampanhas(true)} disabled={atualizando} className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg text-sm font-bold shadow-sm"><RefreshCw className={`size-4 ${atualizando ? 'animate-spin' : ''}`} /> Atualizar</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={prepararDisparo} className="bg-white rounded-2xl border shadow-sm">
            <div className="p-6 border-b bg-slate-50 rounded-t-2xl flex items-center gap-3"><Mail className="size-5 text-blue-600" /><h3 className="font-bold">Nova Campanha</h3></div>
            <div className="p-6 space-y-4">
              <select value={listaSelecionada} onChange={e => setListaSelecionada(e.target.value)} required className="w-full p-4 rounded-xl border bg-white text-slate-800">
                <option value="">Selecione uma lista...</option>
                {listas.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.contatos[0]?.count || 0} leads)</option>)}
              </select>
              <input type="text" placeholder="Assunto" value={assunto} onChange={e => setAssunto(e.target.value)} required className="w-full p-4 rounded-xl border text-slate-800" />
              <div className="bg-white rounded-xl border overflow-visible [&_.ql-toolbar]:border-none [&_.ql-container]:border-none [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:!text-black">
                <ReactQuill theme="snow" value={mensagem} onChange={setMensagem} modules={modulosEditor} />
              </div>
              <button type="submit" disabled={enviando} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl flex justify-center gap-2">{enviando ? 'Processando...' : 'Criar e Enfileirar'}</button>
            </div>
          </form>
        </div>

        <div>
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock className="size-5" /> Histórico</h3>
            {campanhas.map(c => {
              const st = stats[String(c.id)] || STATS_VAZIO
              const estaProcessando = processandoId === String(c.id)
              return (
                <div key={c.id} className="p-4 rounded-xl border bg-slate-50 relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">{c.status}</span>
                    {st.pendentes > 0 && <span className="text-xs text-blue-600 font-bold">{st.pendentes} restam</span>}
                  </div>
                  <p className="font-bold text-slate-800 text-sm truncate">{c.assunto}</p>
                  <p className="text-xs text-slate-500 mb-2">Lista: {c.listas?.nome}</p>
                  <div className="flex gap-3 text-xs font-bold mb-3">
                    <span className="text-blue-600 flex items-center gap-1"><Send className="size-3"/> {st.enviados}/{st.total}</span>
                    <span className="text-emerald-600 flex items-center gap-1"><Eye className="size-3"/> {st.abertos}</span>
                    <span className="text-purple-600 flex items-center gap-1"><MousePointerClick className="size-3"/> {st.clicados}</span>
                  </div>
                  
                  {/* BOTOES DE AÇÃO */}
                  <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-slate-200">
                    {st.pendentes > 0 && (
                      <>
                        <button onClick={() => dispararSMTP(c.id)} disabled={estaProcessando} className="flex-1 text-xs font-bold bg-blue-100 text-blue-700 px-3 py-2 rounded-md flex justify-center gap-1 hover:bg-blue-200">
                          {estaProcessando ? <Loader2 className="size-3 animate-spin"/> : <Zap className="size-3"/>} Via SMTP
                        </button>
                        <button onClick={() => dispararViaAPI(c.id)} disabled={estaProcessando} className="flex-1 text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md flex justify-center gap-1 hover:bg-indigo-200">
                          {estaProcessando ? <Loader2 className="size-3 animate-spin"/> : <Globe className="size-3"/>} Via API Externa
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
