"use client"

import { useState, useEffect } from 'react'
import { Send, Clock, Mail, Loader2, Hourglass, Trash2, RotateCcw, CheckSquare, Square, Eye, MousePointerClick, Pencil, Zap, RefreshCw, Pause, Play, BarChart3, X, Users, AlertCircle, Copy, CheckCircle2, Target, CalendarClock } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

// @ts-ignore
import 'react-quill/dist/quill.snow.css'

// ✅ RESTAURANDO AS FONTES E TAMANHOS DO EDITOR
const ReactQuill = dynamic(async () => {
  const { default: RQ } = await import('react-quill')
  const Quill = (await import('quill')).default
  const Size = Quill.import('attributors/class/size') as any
  Size.whitelist = ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '22px', '24px', '28px', '32px']
  Quill.register(Size, true)
  const Font = Quill.import('attributors/class/font') as any
  Font.whitelist = ['arial', 'helvetica', 'verdana', 'georgia', 'times-new-roman', 'courier-new', 'tahoma']
  Quill.register(Font, true)
  return RQ
}, {
  ssr: false,
  loading: () => <p className="p-4 text-slate-400 text-sm font-medium">Carregando editor visual...</p>
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// ✅ RESTAURANDO OS MÓDULOS COMPLETOS DO EDITOR
const modulosEditor = {
  toolbar: [
    [{ 'font': ['arial', 'helvetica', 'verdana', 'georgia', 'times-new-roman', 'courier-new', 'tahoma'] }],
    [{ 'size': ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', false] }],
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
}

type StatsItem = {
  abertos: number
  clicados: number
  total: number
  enviados: number
  pendentes: number
}

const STATS_VAZIO: StatsItem = { abertos: 0, clicados: 0, total: 0, enviados: 0, pendentes: 0 }

export default function AutomacoesPage() {
  const [listas, setListas] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  const [listaSelecionada, setListaSelecionada] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [processandoId, setProcessandoId] = useState<string | null>(null)

  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [modalReenvio, setModalReenvio] = useState<any>(null)
  const [novoTitulo, setNovoTitulo] = useState('')

  const [modalDetalhes, setModalDetalhes] = useState<any>(null)
  const [tipoSegmento, setTipoSegmento] = useState<'abridores' | 'clicadores' | 'nao_abriram'>('abridores')
  const [nomeNovaLista, setNomeNovaLista] = useState('')
  const [criandoLista, setCriandoLista] = useState(false)
  const [msgSucesso, setMsgSucesso] = useState('')

  const [stats, setStats] = useState<Record<string, StatsItem>>({})

  useEffect(() => {
    buscarListas()
    buscarCampanhas()
  }, [])

  useEffect(() => {
    const id = setInterval(() => buscarCampanhas(true), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (campanhas.length > 0) carregarStats()
  }, [campanhas])

  const buscarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome, contatos(count)').order('nome')
    if (data) setListas(data)
  }

  const buscarCampanhas = async (silencioso = false) => {
    if (!silencioso) setCarregandoHistorico(true)
    if (silencioso) setAtualizando(true)

    const { data } = await supabase
      .from('campanhas').select('*, listas(nome)')
      .order('created_at', { ascending: false }).limit(50)

    if (data) setCampanhas(data)
    setCarregandoHistorico(false)
    setAtualizando(false)
  }

  const carregarStats = async () => {
    const novasStats: Record<string, StatsItem> = {}
    
    for (const c of campanhas) {
      const [tot, env, pend, ab, cli] = await Promise.all([
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'sent'),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'pending'),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).not('opened_at', 'is', null),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).not('clicked_at', 'is', null)
      ])

      novasStats[String(c.id)] = {
        total: tot.count || 0, enviados: env.count || 0, pendentes: pend.count || 0, abertos: ab.count || 0, clicados: cli.count || 0
      }
    }
    setStats(novasStats)
  }

  const dispararCampanha = async (campanhaId: string | number) => {
    setProcessandoId(String(campanhaId))
    
    try {
      // 1. Verifica se existe alguma API ativa configurada
      const { data: apiAtiva } = await supabase.from('api_providers').select('id').eq('is_active', true).limit(1)
      const usarAPI = apiAtiva && apiAtiva.length > 0

      if (usarAPI) {
        const r = await fetch('/api/disparo/api-provider', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campanhaId }),
        })
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Erro na API')
        alert(`✅ Campanha enviada para a API com sucesso!`)
      } else {
        let continuar = true; let enviados = 0; let falhas = 0
        while (continuar) {
          try {
            const r = await fetch('/api/disparo/processar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhaId }) })
            let j: any = null
            try { j = await r.json() } catch(e) { 
               falhas++; if (falhas > 5) break; await new Promise(res => setTimeout(res, 3000)); continue 
            }
            if (!r.ok) { alert(`⚠️ Erro: ${j.error}`); break }
            
            falhas = 0; enviados += (j.enviados || 0)
            buscarCampanhas(true); carregarStats()
            
            if (j.done || j.restantes === 0) continuar = false
            else await new Promise(res => setTimeout(res, 1500))
          } catch (err) { 
            falhas++; if (falhas > 5) break; await new Promise(res => setTimeout(res, 3000)) 
          }
        }
        if (enviados > 0) alert(`✅ Lote SMTP processado! ${enviados} e-mails enviados.`)
      }
    } catch (err: any) {
      alert(`⚠️ Erro ao disparar: ${err.message}`)
    }

    setProcessandoId(null)
    buscarCampanhas(true)
    carregarStats()
  }

  const toggleSelecionada = (id: string) => {
    const novo = new Set(selecionadas)
    novo.has(id) ? novo.delete(id) : novo.add(id)
    setSelecionadas(novo)
  }

  const toggleTodas = () => {
    if (selecionadas.size === campanhas.length) setSelecionadas(new Set())
    else setSelecionadas(new Set(campanhas.map(c => c.id)))
  }

  const deletarCampanhas = async (ids: string[]) => {
    if (ids.length === 0) return
    if (!confirm(`Apagar ${ids.length} campanha(s) e seus e-mails da fila?`)) return
    await supabase.from('email_queue').delete().in('campaign_id', ids)
    await supabase.from('campanhas').delete().in('id', ids)
    setSelecionadas(new Set())
    buscarCampanhas()
  }

  const alternarPausa = async (campanha: any) => {
    const novoStatus = campanha.status === 'Pausada' ? 'Em Fila' : 'Pausada'
    await supabase.from('campanhas').update({ status: novoStatus }).eq('id', campanha.id)
    buscarCampanhas()
    if (modalDetalhes?.id === campanha.id) setModalDetalhes({ ...modalDetalhes, status: novoStatus })
  }

  const reutilizarCampanha = (campanha: any) => {
    if (!confirm(`Carregar "${campanha.assunto}" no editor?`)) return
    setListaSelecionada(campanha.lista_id || '')
    setAssunto(campanha.assunto || '')
    setMensagem(campanha.mensagem || '')
    setScheduledAt('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirModalReenvio = async (campanha: any) => {
    const { data } = await supabase.from('email_queue').select('id, opened_at').eq('campaign_id', campanha.id).eq('status', 'sent')
    if (!data || data.length === 0) { alert('⚠️ Campanha ainda não enviada.'); return }
    const naoAbriram = data.filter(d => !d.opened_at).length
    if (naoAbriram === 0) { alert('🎉 Todos já abriram!'); return }
    setModalReenvio({ ...campanha, totalNaoAbriram: naoAbriram })
    setNovoTitulo(`[REENVIO] ${campanha.assunto}`)
  }

  const confirmarReenvio = async () => {
    if (!modalReenvio) return
    const { data: originais } = await supabase.from('email_queue').select('recipient_email, recipient_name, subject, body, opened_at').eq('campaign_id', modalReenvio.id).eq('status', 'sent')
    const naoAbriram = (originais || []).filter(o => !o.opened_at)

    if (naoAbriram.length === 0) { alert('🎉 Todos já abriram!'); setModalReenvio(null); return }

    const { data: nova, error } = await supabase.from('campanhas').insert([{
      lista_id: modalReenvio.lista_id, assunto: novoTitulo || `[REENVIO] ${modalReenvio.assunto}`,
      mensagem: naoAbriram[0].body, status: 'Em Fila',
    }]).select().single()

    if (error || !nova) { alert('Erro ao criar campanha de reenvio.'); return }

    const fila = naoAbriram.map(o => ({
      campaign_id: nova.id, recipient_email: o.recipient_email, recipient_name: o.recipient_name,
      subject: novoTitulo || `[REENVIO] ${o.subject}`, body: o.body, status: 'pending',
    }))

    await supabase.from('email_queue').insert(fila)
    setModalReenvio(null); setNovoTitulo(''); buscarCampanhas()
    dispararCampanha(nova.id)
  }

  const criarSegmento = async () => {
    if (!modalDetalhes || !nomeNovaLista.trim()) { alert('Digite um nome.'); return }
    setCriandoLista(true); setMsgSucesso('')
    try {
      let query = supabase.from('email_queue').select('recipient_email, recipient_name, opened_at, clicked_at').eq('campaign_id', modalDetalhes.id)
      if (tipoSegmento === 'abridores') query = query.not('opened_at', 'is', null)
      else if (tipoSegmento === 'clicadores') query = query.not('clicked_at', 'is', null)
      else if (tipoSegmento === 'nao_abriram') query = query.eq('status', 'sent').is('opened_at', null)

      const { data: itens } = await query
      if (!itens || itens.length === 0) { alert('Nenhum contato encontrado.'); setCriandoLista(false); return }

      const { data: novaLista } = await supabase.from('listas').insert([{ nome: nomeNovaLista.trim() }]).select().single()
      if (!novaLista) { setCriandoLista(false); return }

      const vistos = new Set<string>()
      const novosContatos = itens.filter(i => {
        const email = (i.recipient_email || '').toLowerCase()
        if (!email || vistos.has(email)) return false
        vistos.add(email); return true
      }).map(i => ({ nome: i.recipient_name || 'Lead', email: (i.recipient_email || '').toLowerCase(), lista_id: novaLista.id, status: 'ativo' }))

      await supabase.from('contatos').upsert(novosContatos, { onConflict: 'email' })
      setMsgSucesso(`✅ Lista criada com ${novosContatos.length} contatos!`)
      setNomeNovaLista(''); buscarListas()
    } catch (e: any) { alert('Erro: ' + e.message) }
    setCriandoLista(false)
  }

  const prepararDisparo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listaSelecionada || !assunto || !mensagem) { alert("Preencha todos os campos."); return }
    setEnviando(true)

    const { data: novaCampanha, error } = await supabase.from('campanhas').insert([{ 
      lista_id: listaSelecionada, assunto, mensagem, status: 'Em Fila',
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null
    }]).select().single()
    
    if (error) { alert(`Erro: ${error.message}`); setEnviando(false); return }

    try {
      const r = await fetch('/api/disparo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhaId: novaCampanha.id }) })
      if (!r.ok) { alert(`Erro ao enfileirar.`); setEnviando(false); return }
      setEnviando(false); setAssunto(''); setMensagem(''); setListaSelecionada(''); setScheduledAt('')
      buscarCampanhas(); 
      if (!scheduledAt) dispararCampanha(novaCampanha.id)
    } catch (err) { alert("Erro de conexão."); setEnviando(false) }
  }

  const todasSelecionadas = campanhas.length > 0 && selecionadas.size === campanhas.length

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Automações</h2>
          <p className="text-slate-600 mt-1">Crie, agende e dispare e-mails em massa.</p>
        </div>
        <button onClick={() => buscarCampanhas(true)} disabled={atualizando} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-lg shadow-sm">
          <RefreshCw className={`size-4 ${atualizando ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={prepararDisparo} className="bg-white rounded-2xl border shadow-sm">
            <div className="p-6 border-b bg-slate-50 rounded-t-2xl flex items-center gap-3">
              <Mail className="size-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">Nova Campanha</h3>
            </div>
            <div className="p-6 space-y-4">
              <select value={listaSelecionada} onChange={e => setListaSelecionada(e.target.value)} required className="w-full p-4 rounded-xl border bg-white text-slate-800">
                <option value="">Selecione uma lista...</option>
                {listas.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.contatos[0]?.count || 0} leads)</option>)}
              </select>
              <input type="text" placeholder="Assunto do E-mail" value={assunto} onChange={e => setAssunto(e.target.value)} required className="w-full p-4 rounded-xl border text-slate-800" />
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <CalendarClock className="size-4 text-slate-500" /> Agendar envio (opcional)
                </label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                  className="bg-white w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium" />
                <p className="text-xs text-slate-500 mt-1">Deixe vazio para processar assim que possível.</p>
              </div>

              {/* ✅ EDITOR COM TODAS AS OPÇÕES DE FONTE E TAMANHO RESTAURADAS */}
              <div className="bg-white rounded-xl border overflow-visible 
                [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:bg-slate-50 [&_.ql-toolbar]:rounded-t-xl
                [&_.ql-container]:border-none [&_.ql-container]:rounded-b-xl
                [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:text-slate-700 [&_.ql-editor]:text-base [&_.ql-editor]:!text-black
                [&_.ql-tooltip]:!absolute [&_.ql-tooltip]:!bg-white [&_.ql-tooltip]:!text-slate-900 [&_.ql-tooltip]:!border [&_.ql-tooltip]:!border-slate-200 [&_.ql-tooltip]:!shadow-xl [&_.ql-tooltip]:!rounded-xl [&_.ql-tooltip]:!p-4 [&_.ql-tooltip]:!z-50
                [&_.ql-tooltip_input]:!bg-white [&_.ql-tooltip_input]:!text-slate-900 [&_.ql-tooltip_input]:!border [&_.ql-tooltip_input]:!border-slate-300 [&_.ql-tooltip_input]:!rounded-md [&_.ql-tooltip_input]:!px-3 [&_.ql-tooltip_input]:!py-1.5 [&_.ql-tooltip_input]:!text-sm [&_.ql-tooltip_input]:focus:!outline-none [&_.ql-tooltip_input]:focus:!border-blue-500 [&_.ql-tooltip_input]:focus:!ring-1 [&_.ql-tooltip_input]:focus:!ring-blue-500
                [&_.ql-tooltip_a]:!text-blue-600 [&_.ql-tooltip_a]:!font-bold [&_.ql-tooltip_a]:!ml-2 [&_.ql-tooltip_a]:hover:!underline
                [&_.ql-picker]:!text-slate-700
                [&_.ql-picker-label]:!text-slate-700 [&_.ql-picker-label]:hover:!text-slate-900
                [&_.ql-picker-options]:!bg-white [&_.ql-picker-options]:!border [&_.ql-picker-options]:!border-slate-200 [&_.ql-picker-options]:!shadow-lg [&_.ql-picker-options]:!rounded-lg
                [&_.ql-stroke]:!stroke-slate-600
                [&_.ql-fill]:!fill-slate-600
                [&_.ql-picker-item]:!text-slate-700
                [&_.ql-active_.ql-stroke]:!stroke-blue-600
                [&_.ql-active_.ql-fill]:!fill-blue-600
              ">
                <ReactQuill 
                  theme="snow" 
                  value={mensagem} 
                  onChange={setMensagem} 
                  modules={modulosEditor}
                  placeholder="Escreva o corpo do seu e-mail aqui..." 
                />
              </div>

              <button type="submit" disabled={enviando} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl flex justify-center gap-2">
                {enviando ? <Loader2 className="animate-spin" /> : <Send />} {enviando ? 'Processando...' : scheduledAt ? 'Agendar Campanha' : 'Enviar Campanha'}
              </button>
            </div>
          </form>
        </div>

        <div>
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock className="size-5" /> Histórico</h3>
              {campanhas.length > 0 && (
                <button onClick={toggleTodas} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  {todasSelecionadas ? <CheckSquare className="size-4" /> : <Square className="size-4" />} Marcar todas
                </button>
              )}
            </div>

            {selecionadas.size > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <span className="text-sm font-bold text-blue-800">{selecionadas.size} selecionada(s)</span>
                <button onClick={() => deletarCampanhas(Array.from(selecionadas))} className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <Trash2 className="size-3" /> Apagar
                </button>
              </div>
            )}

            {campanhas.map(c => {
              const st = stats[String(c.id)] || STATS_VAZIO
              const sel = selecionadas.has(c.id)
              const estaDisparando = processandoId === String(c.id)
              const corStatus = c.status === 'Pausada' ? 'bg-slate-200 text-slate-700' : c.status === 'Agendada' ? 'bg-purple-100 text-purple-700' : c.status === 'Enviando...' ? 'bg-cyan-100 text-cyan-700' : c.status === 'Enviada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'

              return (
                <div key={c.id} className={`p-4 rounded-xl border transition-colors ${sel ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex gap-3 items-start">
                    <button onClick={() => toggleSelecionada(c.id)} className="mt-0.5 text-slate-500 hover:text-blue-600">
                      {sel ? <CheckSquare className="size-5 text-blue-600" /> : <Square className="size-5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${corStatus}`}>
                          <Hourglass className="size-3" /> {c.status}
                          {st.pendentes > 0 && <span className="ml-1 opacity-70">({st.pendentes} restam)</span>}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm truncate">{c.assunto}</p>
                      <p className="text-xs text-slate-500 mb-2">Lista: {c.listas?.nome}</p>
                      
                      <div className="flex gap-3 text-xs font-bold mb-3">
                        <span className="text-blue-600 flex items-center gap-1"><Send className="size-3"/> {st.enviados}/{st.total}</span>
                        <span className="text-emerald-600 flex items-center gap-1"><Eye className="size-3"/> {st.abertos}</span>
                        <span className="text-purple-600 flex items-center gap-1"><MousePointerClick className="size-3"/> {st.clicados}</span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <button onClick={() => { setModalDetalhes(c); setMsgSucesso(''); setNomeNovaLista('') }} className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1">
                          <BarChart3 className="size-3" /> Desempenho
                        </button>
                        <button onClick={() => reutilizarCampanha(c)} className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                          <Copy className="size-3" /> Reutilizar
                        </button>
                        {st.pendentes > 0 && c.status !== 'Pausada' && c.status !== 'Agendada' && (
                          <button onClick={() => dispararCampanha(c.id)} disabled={estaDisparando} className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50">
                            {estaDisparando ? <Loader2 className="size-3 animate-spin"/> : <Zap className="size-3"/>} Disparar
                          </button>
                        )}
                        <button onClick={() => alternarPausa(c)} className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1">
                          {c.status === 'Pausada' ? <Play className="size-3" /> : <Pause className="size-3" />} {c.status === 'Pausada' ? 'Retomar' : 'Pausar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {modalDetalhes && (() => {
        const st = stats[String(modalDetalhes.id)] || STATS_VAZIO
        const progresso = st.total > 0 ? Math.round((st.enviados / st.total) * 100) : 0
        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
              <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><BarChart3 className="size-5 text-indigo-600" /> Desempenho</h2>
                <button onClick={() => setModalDetalhes(null)} className="text-slate-400 hover:text-slate-700"><X className="size-5" /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="p-4 bg-slate-50 border rounded-xl">
                  <div className="flex justify-between mb-3 text-sm font-bold text-slate-500"><span>Progresso</span><span>{st.enviados} / {st.total}</span></div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${progresso}%` }} /></div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-xl text-center"><Send className="size-5 text-blue-600 mx-auto mb-1" /><p className="text-2xl font-black text-slate-900">{st.enviados}</p><p className="text-[10px] font-bold text-slate-500">ENVIADOS</p></div>
                  <div className="bg-emerald-50 p-3 rounded-xl text-center"><Eye className="size-5 text-emerald-600 mx-auto mb-1" /><p className="text-2xl font-black text-slate-900">{st.abertos}</p><p className="text-[10px] font-bold text-slate-500">ABRIRAM</p></div>
                  <div className="bg-purple-50 p-3 rounded-xl text-center"><MousePointerClick className="size-5 text-purple-600 mx-auto mb-1" /><p className="text-2xl font-black text-slate-900">{st.clicados}</p><p className="text-[10px] font-bold text-slate-500">CLICARAM</p></div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-800"><Users className="size-4 text-indigo-600"/> Criar segmento</h3>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button onClick={() => setTipoSegmento('abridores')} className={`p-2 border rounded-xl text-left ${tipoSegmento === 'abridores' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-slate-50 border-slate-200'}`}>
                      <Eye className="size-4 mb-1 text-emerald-600"/>
                      <p className="text-xs font-bold text-slate-800">Abridores</p>
                      <p className="text-[10px] text-slate-500 font-medium">{st.abertos} contatos</p>
                    </button>
                    <button onClick={() => setTipoSegmento('clicadores')} className={`p-2 border rounded-xl text-left ${tipoSegmento === 'clicadores' ? 'border-purple-500 bg-purple-50' : 'hover:bg-slate-50 border-slate-200'}`}>
                      <MousePointerClick className="size-4 mb-1 text-purple-600"/>
                      <p className="text-xs font-bold text-slate-800">Clicadores</p>
                      <p className="text-[10px] text-slate-500 font-medium">{st.clicados} contatos</p>
                    </button>
                    <button onClick={() => setTipoSegmento('nao_abriram')} className={`p-2 border rounded-xl text-left ${tipoSegmento === 'nao_abriram' ? 'border-amber-500 bg-amber-50' : 'hover:bg-slate-50 border-slate-200'}`}>
                      <AlertCircle className="size-4 mb-1 text-amber-600"/>
                      <p className="text-xs font-bold text-slate-800">Não abriram</p>
                      <p className="text-[10px] text-slate-500 font-medium">{Math.max(st.enviados - st.abertos, 0)} contatos</p>
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <input type="text" value={nomeNovaLista} onChange={e => setNomeNovaLista(e.target.value)} placeholder="Nome da nova lista" className="flex-1 p-2 border rounded-lg text-sm text-slate-800" />
                    <button onClick={criarSegmento} disabled={criandoLista} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm">{criandoLista ? 'Criando...' : 'Criar'}</button>
                  </div>
                  {msgSucesso && <p className="text-emerald-600 text-sm mt-2 font-bold">{msgSucesso}</p>}
                </div>

                <div className="border-t pt-4 flex gap-2">
                  <button onClick={() => { setModalDetalhes(null); abrirModalReenvio(modalDetalhes) }} className="flex-1 bg-amber-50 text-amber-700 font-bold p-3 rounded-xl border border-amber-200 text-sm flex justify-center gap-2 hover:bg-amber-100"><RotateCcw className="size-4"/> Reenviar p/ não abriram</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {modalReenvio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b bg-amber-50">
              <h2 className="text-xl font-black text-amber-900 flex items-center gap-2"><RotateCcw className="size-5" /> Reenviar</h2>
              <p className="text-amber-700 text-sm mt-1"><strong>{modalReenvio.totalNaoAbriram}</strong> contato(s) ainda não abriram.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Pencil className="size-4 text-slate-500" /> Novo Assunto</label>
                <input type="text" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} className="w-full p-3 border rounded-xl text-slate-800" />
              </div>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setModalReenvio(null)} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Cancelar</button>
              <button onClick={confirmarReenvio} className="px-6 py-2.5 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-2"><RotateCcw className="size-4" /> Reenviar agora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
