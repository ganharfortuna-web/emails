"use client"

import { useState, useEffect } from 'react'
import { Send, Clock, Mail, Loader2, Hourglass, Trash2, CheckSquare, Square, Eye, MousePointerClick, Pencil, Zap, RefreshCw, Pause, Play, BarChart3, X, Users, AlertCircle, Copy, CalendarClock, RotateCcw, ShieldAlert, RefreshCcw, ChevronLeft, ChevronRight, Settings, Server, Activity, Check } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

// @ts-ignore
import 'react-quill/dist/quill.snow.css'

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
}, { ssr: false, loading: () => <p className="p-4 text-slate-400 text-sm font-medium">Carregando editor...</p> })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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

type StatsItem = { abertos: number; clicados: number; total: number; enviados: number; pendentes: number; falhados: number }
const STATS_VAZIO: StatsItem = { abertos: 0, clicados: 0, total: 0, enviados: 0, pendentes: 0, falhados: 0 }

export default function AutomacoesPage() {
  const [listas, setListas] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  
  const [abaPainel, setAbaPainel] = useState<'campanhas' | 'configuracoes'>('campanhas')
  const [providerAtivo, setProviderAtivo] = useState('inngest')
  const [enviadosMes, setEnviadosMes] = useState(0)
  
  // ✅ ESTADOS PARA O AJUSTE MANUAL (Inngest e QStash)
  const [manualUsage, setManualUsage] = useState(0)
  const [inputManualUsage, setInputManualUsage] = useState('')
  
  const [manualQstashUsage, setManualQstashUsage] = useState(0)
  const [inputManualQstashUsage, setInputManualQstashUsage] = useState('')
  
  const [salvandoManual, setSalvandoManual] = useState(false)

  const [pageCampanhas, setPageCampanhas] = useState(0)
  const [totalCampanhas, setTotalCampanhas] = useState(0)
  const pageSizeCampanhas = 10

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
  const [modalErros, setModalErros] = useState<any>(null)
  const [listaErros, setListaErros] = useState<any[]>([])
  const [tipoSegmento, setTipoSegmento] = useState<'enviados' | 'abridores' | 'clicadores' | 'nao_abriram'>('enviados')
  const [nomeNovaLista, setNomeNovaLista] = useState('')
  const [criandoLista, setCriandoLista] = useState(false)
  const [msgSucesso, setMsgSucesso] = useState('')
  const [processandoReenvio, setProcessandoReenvio] = useState(false)

  const [stats, setStats] = useState<Record<string, StatsItem>>({})

  useEffect(() => { 
    buscarListas(); buscarConfiguracoes(); buscarEstatisticasMes();
  }, [])
  
  useEffect(() => { buscarCampanhas() }, [pageCampanhas])
  useEffect(() => { 
    const id = setInterval(() => buscarCampanhas(true), 5000); 
    return () => clearInterval(id); 
  }, [pageCampanhas])
  useEffect(() => { if (campanhas.length > 0) carregarStats(); }, [campanhas])

  const buscarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome, contatos(count)').order('nome').is('deleted_at', null)
    if (data) setListas(data)
  }

  const buscarConfiguracoes = async () => {
    const { data } = await supabase.from('system_settings').select('active_provider, manual_inngest_usage, manual_qstash_usage').eq('id', 1).single()
    if (data) {
      setProviderAtivo(data.active_provider)
      setManualUsage(data.manual_inngest_usage || 0)
      setInputManualUsage(data.manual_inngest_usage ? String(data.manual_inngest_usage) : '')
      
      setManualQstashUsage(data.manual_qstash_usage || 0)
      setInputManualQstashUsage(data.manual_qstash_usage ? String(data.manual_qstash_usage) : '')
    }
  }

  const buscarEstatisticasMes = async () => {
    const dataInicio = new Date(); dataInicio.setDate(1); dataInicio.setHours(0, 0, 0, 0);
    const { count } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', dataInicio.toISOString());
    setEnviadosMes(count || 0)
  }

  const mudarProvider = async (novoProvider: string) => {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ id: 1, active_provider: novoProvider, updated_at: new Date().toISOString() })
      .select()

    if (error) {
      alert("Erro ao salvar no banco: " + error.message)
    } else {
      setProviderAtivo(novoProvider)
      alert(`✅ Provedor alterado para ${novoProvider.toUpperCase()} com sucesso!`)
    }
  }

  const salvarManualUsage = async (tipo: 'inngest' | 'qstash') => {
    const isInngest = tipo === 'inngest';
    // Se o campo estiver vazio, assume 0 (que volta a usar o cálculo automático)
    const valor = parseInt(isInngest ? inputManualUsage : inputManualQstashUsage, 10) || 0;
    
    setSalvandoManual(true)
    const campo = isInngest ? 'manual_inngest_usage' : 'manual_qstash_usage';
    
    const { error } = await supabase
      .from('system_settings')
      .update({ [campo]: valor })
      .eq('id', 1)

    if (!error) {
      if (isInngest) setManualUsage(valor);
      else setManualQstashUsage(valor);
      alert("✅ Ajuste manual salvo com sucesso!")
    } else {
      alert("Erro ao salvar: " + error.message)
    }
    setSalvandoManual(false)
  }

  const buscarCampanhas = async (silencioso = false) => {
    if (!silencioso) setCarregandoHistorico(true)
    if (silencioso) setAtualizando(true)
    const from = pageCampanhas * pageSizeCampanhas
    const to = from + pageSizeCampanhas - 1
    const { data, count } = await supabase.from('campanhas').select('*, listas(nome)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)
    if (data) setCampanhas(data)
    if (count !== null) setTotalCampanhas(count)
    setCarregandoHistorico(false); setAtualizando(false)
  }

  const carregarStats = async () => {
    const novasStats: Record<string, StatsItem> = {}
    for (const c of campanhas) {
      const { count: totalValido } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).neq('status', 'suppressed');
      const [env, pend, fail, ab, cli] = await Promise.all([
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'sent'),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'pending'),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'failed'),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).not('opened_at', 'is', null),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).not('clicked_at', 'is', null)
      ])
      novasStats[String(c.id)] = { total: totalValido || 0, enviados: env.count || 0, pendentes: pend.count || 0, falhados: fail.count || 0, abertos: ab.count || 0, clicados: cli.count || 0 }
    }
    setStats(novasStats)
  }

  const abrirModalErros = async (campanha: any) => {
    const { data, error } = await supabase.from('email_queue').select('recipient_email, error_log').eq('campaign_id', campanha.id).eq('status', 'failed').limit(100)
    if (error) { alert("Erro: " + error.message); return }
    setListaErros(data || []); setModalErros(campanha)
  }

  const limparErros = async (campanhaId: string | number) => {
    if (!confirm("⚠️ Apagar estes e-mails da fila?")) return
    setProcessandoId(String(campanhaId))
    try {
      await supabase.from('email_queue').delete().eq('campaign_id', campanhaId).in('status', ['failed', 'suppressed'])
      setModalErros(null); buscarCampanhas(true); carregarStats()
    } catch (err: any) { alert("Erro: " + err.message) }
    setProcessandoId(null)
  }

  const retentarErros = async (campanhaId: string | number) => {
    if (!confirm("🔄 Tentar enviar novamente?")) return
    setProcessandoId(String(campanhaId)); setModalErros(null)
    await supabase.from('email_queue').update({ status: 'pending', retry_count: 0, next_retry_at: null }).eq('campaign_id', campanhaId).eq('status', 'failed');
    await supabase.from('campanhas').update({ status: 'Enviando...' }).eq('id', campanhaId)
    buscarCampanhas(true); carregarStats()
    try { 
      const endpoint = providerAtivo === 'qstash' ? '/api/qstash/trigger' : '/api/disparo/iniciar';
      if (providerAtivo === 'inngest') await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhaId }) }) 
    } catch (err) { alert("Erro.") }
    setProcessandoId(null)
  }

  const dispararCampanha = async (campanhaId: string | number) => {
    setProcessandoId(String(campanhaId))
    await supabase.from('campanhas').update({ status: 'Enviando...' }).eq('id', campanhaId)
    buscarCampanhas(true); carregarStats()
    try {
      const endpoint = providerAtivo === 'qstash' ? '/api/qstash/trigger' : '/api/disparo/iniciar';
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhaId }) })
      if (r.ok) { 
        alert(`🚀 Envio ${providerAtivo.toUpperCase()} iniciado!`); 
        setProcessandoId(null); buscarCampanhas(true); carregarStats(); return 
      }
    } catch (err) { console.log("Falhou") }
    
    let continuar = true, falhas = 0
    while (continuar) {
      try {
        const r = await fetch('/api/disparo/processar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhaId }) })
        if (r.status === 504 || r.status === 502) { falhas++; if (falhas > 10) break; await new Promise(res => setTimeout(res, 5000)); continue }
        if (!r.ok) { falhas++; if (falhas > 5) break; await new Promise(res => setTimeout(res, 5000)); continue }
        const j = await r.json()
        falhas = 0 
        if (j.done || j.restantes === 0) continuar = false
        else await new Promise(res => setTimeout(res, 3000))
      } catch (err) { falhas++; if (falhas > 5) break; await new Promise(res => setTimeout(res, 5000)) }
    }
    setProcessandoId(null); buscarCampanhas(true); carregarStats()
  }

  const prepararDisparo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listaSelecionada || !assunto || !mensagem) { alert("Preencha os campos."); return }
    setEnviando(true)
    const { data: novaCampanha, error } = await supabase.from('campanhas').insert([{ lista_id: listaSelecionada, assunto, mensagem, status: 'Em Fila', scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null }]).select().single()
    if (error) { alert(`Erro: ${error.message}`); setEnviando(false); return }
    try {
      const r = await fetch('/api/disparo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhaId: novaCampanha.id }) })
      if (!r.ok) { alert(`Erro.`); setEnviando(false); return }
      setEnviando(false); setAssunto(''); setMensagem(''); setListaSelecionada(''); setScheduledAt('')
      setPageCampanhas(0); buscarCampanhas(); 
      if (!scheduledAt) dispararCampanha(novaCampanha.id)
    } catch (err) { alert("Erro."); setEnviando(false) }
  }

  const toggleSelecionada = (id: string) => { const novo = new Set(selecionadas); novo.has(id) ? novo.delete(id) : novo.add(id); setSelecionadas(novo) }
  const toggleTodas = () => { if (selecionadas.size === campanhas.length) setSelecionadas(new Set()); else setSelecionadas(new Set(campanhas.map(c => c.id))) }
  
  const deletarCampanhas = async (ids: string[]) => {
    if (ids.length === 0) return
    if (!confirm(`Apagar ${ids.length} campanha(s)?`)) return
    await supabase.from('email_queue').delete().in('campaign_id', ids)
    await supabase.from('campanhas').delete().in('id', ids)
    setSelecionadas(new Set()); buscarCampanhas()
  }

  const alternarPausa = async (campanha: any) => {
    const isPausando = campanha.status !== 'Pausada'; const novoStatus = isPausando ? 'Pausada' : 'Em Fila';
    await supabase.from('campanhas').update({ status: novoStatus }).eq('id', campanha.id);
    if (!isPausando) {
      const endpoint = providerAtivo === 'qstash' ? '/api/qstash/trigger' : '/api/disparo/iniciar';
      if (providerAtivo === 'inngest') {
        try { await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhaId: campanha.id }) }) } catch(e) {}
      }
    }
    buscarCampanhas(); if (modalDetalhes?.id === campanha.id) setModalDetalhes({ ...modalDetalhes, status: novoStatus })
  }

  const reutilizarCampanha = (campanha: any) => {
    if (!confirm(`Carregar "${campanha.assunto}"?`)) return
    setListaSelecionada(campanha.lista_id || ''); setAssunto(campanha.assunto || ''); setMensagem(campanha.mensagem || ''); setScheduledAt('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirModalReenvio = async (campanha: any) => {
    const { count: naoAbriram, error } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', campanha.id).eq('status', 'sent').is('opened_at', null)
    if (error || !naoAbriram || naoAbriram === 0) { alert('🎉 Todos já abriram!'); return }
    setModalReenvio({ ...campanha, totalNaoAbriram: naoAbriram }); setNovoTitulo(`[REENVIO] ${campanha.assunto}`)
  }

  const confirmarReenvio = async () => {
    if (!modalReenvio) return; setProcessandoReenvio(true)
    let todosNaoAbriram: any[] = []; let page = 0; const pageSize = 1000; let hasMore = true
    try {
      while (hasMore) {
        const { data, error } = await supabase.from('email_queue').select('recipient_email, recipient_name, subject, body').eq('campaign_id', modalReenvio.id).eq('status', 'sent').is('opened_at', null).range(page * pageSize, (page + 1) * pageSize - 1)
        if (error) throw error
        if (data && data.length > 0) {
          todosNaoAbriram = [...todosNaoAbriram, ...data]
          if (data.length < pageSize) hasMore = false; else page++
        } else { hasMore = false }
      }
      if (todosNaoAbriram.length === 0) { alert('🎉 Todos já abriram!'); setModalReenvio(null); setProcessandoReenvio(false); return }
      const { data: nova } = await supabase.from('campanhas').insert([{ lista_id: modalReenvio.lista_id, assunto: novoTitulo || `[REENVIO] ${modalReenvio.assunto}`, mensagem: todosNaoAbriram[0].body, status: 'Em Fila' }]).select().single()
      if (!nova) throw new Error('Erro')
      const fila = todosNaoAbriram.map(o => ({ campaign_id: nova.id, recipient_email: o.recipient_email, recipient_name: o.recipient_name, subject: novoTitulo || `[REENVIO] ${o.subject}`, body: o.body, status: 'pending' }))
      for (let i = 0; i < fila.length; i += 500) { await supabase.from('email_queue').insert(fila.slice(i, i + 500)) }
      setModalReenvio(null); setNovoTitulo(''); setProcessandoReenvio(false); buscarCampanhas(); dispararCampanha(nova.id)
    } catch (err: any) { alert("Erro: " + err.message); setProcessandoReenvio(false) }
  }

  const criarSegmento = async () => {
    if (!modalDetalhes || !nomeNovaLista.trim()) return; setCriandoLista(true); setMsgSucesso('')
    try {
      let todosContatos: any[] = []; let page = 0; const pageSize = 1000; let hasMore = true
      while (hasMore) {
        let query = supabase.from('email_queue').select('recipient_email, recipient_name, opened_at, clicked_at, status').eq('campaign_id', modalDetalhes.id).range(page * pageSize, (page + 1) * pageSize - 1)
        if (tipoSegmento === 'enviados') query = query.eq('status', 'sent')
        else if (tipoSegmento === 'abridores') query = query.not('opened_at', 'is', null)
        else if (tipoSegmento === 'clicadores') query = query.not('clicked_at', 'is', null)
        else if (tipoSegmento === 'nao_abriram') query = query.eq('status', 'sent').is('opened_at', null)
        const { data, error } = await query; if (error) throw error
        if (data && data.length > 0) { todosContatos = [...todosContatos, ...data]; if (data.length < pageSize) hasMore = false; else page++ } else { hasMore = false }
      }
      if (todosContatos.length === 0) throw new Error('Nenhum contato.')
      const { data: novaLista } = await supabase.from('listas').insert([{ nome: nomeNovaLista.trim() }]).select().single()
      if (!novaLista) throw new Error('Erro na lista.')
      const vistos = new Set<string>()
      const novosContatos = todosContatos.filter(i => { const e = (i.recipient_email || '').toLowerCase(); if (!e || vistos.has(e)) return false; vistos.add(e); return true }).map(i => ({ nome: i.recipient_name || 'Lead', email: (i.recipient_email || '').toLowerCase(), lista_id: novaLista.id, status: 'ativo' }))
      for (let i = 0; i < novosContatos.length; i += 500) { await supabase.from('contatos').upsert(novosContatos.slice(i, i + 500), { onConflict: 'email', ignoreDuplicates: true }) }
      setMsgSucesso(`✅ Lista criada com ${novosContatos.length} contatos!`); setNomeNovaLista(''); buscarListas()
    } catch (e: any) { alert('Erro: ' + e.message) }
    setCriandoLista(false)
  }

  const todasSelecionadas = campanhas.length > 0 && selecionadas.size === campanhas.length
  const totalPages = Math.ceil(totalCampanhas / pageSizeCampanhas)
  
  // ✅ AQUI ESTÁ A CORREÇÃO: O cálculo manual SOBRESCREVE o automático se for maior que 0
  const gastoExibidoInngest = manualUsage > 0 ? manualUsage : Math.ceil(enviadosMes * 1.1);
  const gastoExibidoQstash = manualQstashUsage > 0 ? manualQstashUsage : Math.ceil(enviadosMes / 30);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Automações</h2>
          <p className="text-slate-600 mt-1">Crie e dispare campanhas.</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setAbaPainel('campanhas')} className={`px-4 py-2 rounded-lg font-bold text-sm ${abaPainel === 'campanhas' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Campanhas</button>
          <button onClick={() => setAbaPainel('configuracoes')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${abaPainel === 'configuracoes' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}><Settings className="size-4" /> Controle de Limites</button>
        </div>
      </div>

      {abaPainel === 'configuracoes' ? (
        <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-8 animate-in fade-in">
          <div>
            <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2"><Activity className="size-5 text-indigo-600" /> Estatísticas do Mês</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border rounded-xl p-6">
                <p className="text-sm font-bold text-slate-500 mb-1">E-mails Enviados este Mês</p>
                <p className="text-4xl font-black text-slate-900">{enviadosMes.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-slate-50 border rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">
                    {providerAtivo === 'inngest' ? 'Gasto Real Inngest' : 'Mensagens QStash'}
                  </p>
                  {providerAtivo === 'inngest' ? (
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black text-slate-900">{gastoExibidoInngest.toLocaleString('pt-BR')} <span className="text-lg text-slate-400">/ 50.000</span></p>
                    </div>
                  ) : (
                    <p className="text-4xl font-black text-slate-900">{gastoExibidoQstash.toLocaleString('pt-BR')} <span className="text-lg text-slate-400">/ 30.000</span></p>
                  )}
                </div>
                
                {/* CAMPO DE AJUSTE MANUAL (SOBRESCREVE O VALOR) */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Ajuste Manual ({providerAtivo === 'inngest' ? 'Substitui o cálculo' : 'Substitui o cálculo'})
                  </label>
                  {providerAtivo === 'inngest' ? (
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={inputManualUsage} 
                        onChange={e => setInputManualUsage(e.target.value)}
                        className="flex-1 p-2 border rounded-lg text-sm" 
                        placeholder="Ex: 31000"
                      />
                      <button onClick={() => salvarManualUsage('inngest')} disabled={salvandoManual} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                        {salvandoManual ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Salvar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={inputManualQstashUsage} 
                        onChange={e => setInputManualQstashUsage(e.target.value)}
                        className="flex-1 p-2 border rounded-lg text-sm" 
                        placeholder="Ex: 5000"
                      />
                      <button onClick={() => salvarManualUsage('qstash')} disabled={salvandoManual} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                        {salvandoManual ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Salvar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2"><Server className="size-5 text-indigo-600" /> Provedor Ativo</h3>
            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={() => mudarProvider('inngest')} className={`flex-1 p-6 rounded-xl border-2 text-left transition-all ${providerAtivo === 'inngest' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                <h4 className="font-bold text-lg text-slate-900">Inngest (Principal)</h4>
                <p className="text-sm text-slate-600 mt-1">Limite: 50.000 execuções/mês.</p>
                {providerAtivo === 'inngest' && <span className="inline-block mt-3 text-xs font-bold text-blue-700 bg-blue-200 px-3 py-1 rounded-full">Em Uso</span>}
              </button>
              
              <button onClick={() => mudarProvider('qstash')} className={`flex-1 p-6 rounded-xl border-2 text-left transition-all ${providerAtivo === 'qstash' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                <h4 className="font-bold text-lg text-slate-900">QStash (Backup)</h4>
                <p className="text-sm text-slate-600 mt-1">Limite: 1.000 mensagens/dia (30.000/mês). Processa lotes de 30.</p>
                {providerAtivo === 'qstash' && <span className="inline-block mt-3 text-xs font-bold text-emerald-700 bg-emerald-200 px-3 py-1 rounded-full">Em Uso</span>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in">
          <div className="lg:col-span-2">
            <form onSubmit={prepararDisparo} className="bg-white rounded-2xl border shadow-sm">
              <div className="p-6 border-b bg-slate-50 rounded-t-2xl flex items-center gap-3">
                <Mail className="size-5 text-blue-600" />
                <h3 className="font-bold text-slate-800">Nova Campanha</h3>
                <span className="ml-auto text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">Motor: {providerAtivo.toUpperCase()}</span>
              </div>
              <div className="p-6 space-y-4">
                <select value={listaSelecionada} onChange={e => setListaSelecionada(e.target.value)} required className="w-full p-4 rounded-xl border bg-white text-slate-800">
                  <option value="">Selecione uma lista...</option>
                  {listas.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.contatos[0]?.count || 0} leads)</option>)}
                </select>
                <input type="text" placeholder="Assunto" value={assunto} onChange={e => setAssunto(e.target.value)} required className="w-full p-4 rounded-xl border text-slate-800" />
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><CalendarClock className="size-4 text-slate-500" /> Agendar envio (opcional)</label>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-white w-full p-4 rounded-xl border text-slate-700 font-medium" />
                </div>
                <div className="bg-white rounded-xl border overflow-visible [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:!text-black">
                  <ReactQuill theme="snow" value={mensagem} onChange={setMensagem} modules={modulosEditor} />
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
                {campanhas.length > 0 && <button onClick={toggleTodas} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">{todasSelecionadas ? <CheckSquare className="size-4" /> : <Square className="size-4" />} Marcar todas</button>}
              </div>

              {selecionadas.size > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-800">{selecionadas.size} selecionada(s)</span>
                  <button onClick={() => deletarCampanhas(Array.from(selecionadas))} className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg flex items-center gap-1"><Trash2 className="size-3" /> Apagar</button>
                </div>
              )}

              {campanhas.map(c => {
                const st = stats[String(c.id)] || STATS_VAZIO
                const sel = selecionadas.has(c.id)
                const estaDisparando = processandoId === String(c.id)
                const temTrabalhoPendente = st.pendentes > 0; const temFalhas = st.falhados > 0;
                let displayStatus = c.status; let corStatus = 'bg-amber-100 text-amber-700';
                if (c.status === 'Pausada') { displayStatus = 'Pausada'; corStatus = 'bg-slate-200 text-slate-700'; } 
                else if (c.status === 'Agendada') { displayStatus = 'Agendada'; corStatus = 'bg-purple-100 text-purple-700'; } 
                else if (temTrabalhoPendente) { displayStatus = 'Enviando...'; corStatus = 'bg-cyan-100 text-cyan-700'; } 
                else if (temFalhas) { displayStatus = 'Finalizada c/ Erros'; corStatus = 'bg-red-100 text-red-700'; } 
                else { displayStatus = 'Enviada'; corStatus = 'bg-emerald-100 text-emerald-700'; }

                return (
                  <div key={c.id} className={`p-4 rounded-xl border transition-colors ${sel ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex gap-3 items-start">
                      <button onClick={() => toggleSelecionada(c.id)} className="mt-0.5 text-slate-500 hover:text-blue-600">{sel ? <CheckSquare className="size-5 text-blue-600" /> : <Square className="size-5" />}</button>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${corStatus}`}>
                            <Hourglass className="size-3" /> {displayStatus} 
                            {temTrabalhoPendente && <span className="ml-1 opacity-70">({st.pendentes} restam)</span>}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm truncate">{c.assunto}</p>
                        <p className="text-xs text-slate-500 mb-1">Lista: {c.listas?.nome}</p>
                        <p className="text-[10px] text-slate-400 mb-3 flex items-center gap-1"><Clock className="size-3"/> {new Date(c.created_at).toLocaleString('pt-BR')}</p>
                        
                        <div className="flex gap-3 text-xs font-bold mb-3">
                          <span className="text-blue-600 flex items-center gap-1"><Send className="size-3"/> {st.enviados}/{st.total}</span>
                          <span className="text-emerald-600 flex items-center gap-1"><Eye className="size-3"/> {st.abertos}</span>
                          <span className="text-purple-600 flex items-center gap-1"><MousePointerClick className="size-3"/> {st.clicados}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <button onClick={() => { setModalDetalhes(c); setMsgSucesso(''); setNomeNovaLista('') }} className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1"><BarChart3 className="size-3" /> Desempenho</button>
                          <button onClick={() => reutilizarCampanha(c)} className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"><Copy className="size-3" /> Reutilizar</button>
                          
                          {temTrabalhoPendente && (
                            <button onClick={() => dispararCampanha(c.id)} disabled={estaDisparando} className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50 bg-blue-100 px-2 py-1 rounded">
                              {estaDisparando ? <Loader2 className="size-3 animate-spin"/> : <Zap className="size-3"/>} Disparar
                            </button>
                          )}
                          
                          {st.falhados > 0 && (
                            <button onClick={() => abrirModalErros(c)} className="text-xs font-bold text-orange-700 hover:text-orange-800 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                              <ShieldAlert className="size-3"/> Ver Erros ({st.falhados})
                            </button>
                          )}
                          
                          {st.pendentes > 0 && (
                            <button onClick={() => alternarPausa(c)} className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1">
                              {c.status === 'Pausada' ? <Play className="size-3" /> : <Pause className="size-3" />} {c.status === 'Pausada' ? 'Retomar' : 'Pausar'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {totalCampanhas > 0 && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Página {pageCampanhas + 1} de {totalPages}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setPageCampanhas(p => Math.max(0, p - 1))} disabled={pageCampanhas === 0 || carregandoHistorico} className="p-1.5 border border-slate-200 bg-white rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                      <ChevronLeft className="size-4" />
                    </button>
                    <button onClick={() => setPageCampanhas(p => Math.min(totalPages - 1, p + 1))} disabled={pageCampanhas >= totalPages - 1 || carregandoHistorico} className="p-1.5 border border-slate-200 bg-white rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAIS (Erros, Desempenho, Reenvio) */}
      {modalErros && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b bg-red-50 flex justify-between items-center shrink-0">
              <div><h2 className="text-xl font-black text-red-900 flex items-center gap-2"><ShieldAlert className="size-5" /> Detalhes dos Erros</h2></div>
              <button onClick={() => setModalErros(null)} className="text-red-400 hover:text-red-700"><X className="size-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {listaErros.map((item, index) => (
                <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="font-bold text-slate-800 text-sm">{item.recipient_email}</p>
                  <p className="text-xs text-red-600 font-mono mt-1 break-all bg-white p-2 rounded border border-red-100">{item.error_log || 'Erro desconhecido'}</p>
                </div>
              ))}
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-between items-center shrink-0">
              <button onClick={() => limparErros(modalErros.id)} disabled={processandoId === String(modalErros.id)} className="px-5 py-2.5 font-bold text-red-600 hover:bg-red-100 rounded-xl flex items-center gap-2"><Trash2 className="size-4" /> Apagar</button>
              <div className="flex gap-2">
                <button onClick={() => setModalErros(null)} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Fechar</button>
                <button onClick={() => retentarErros(modalErros.id)} disabled={processandoId === String(modalErros.id)} className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2"><RefreshCcw className="size-4" /> Tentar Novamente</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <button onClick={() => setTipoSegmento('enviados')} className={`p-2 border rounded-xl text-left transition-colors ${tipoSegmento === 'enviados' ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50 border-slate-200'}`}><Send className="size-4 mb-1 text-blue-600"/><p className="text-xs font-bold text-slate-800">Enviados</p><p className="text-[10px] text-slate-500 font-medium">{st.enviados} contatos</p></button>
                    <button onClick={() => setTipoSegmento('abridores')} className={`p-2 border rounded-xl text-left transition-colors ${tipoSegmento === 'abridores' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-slate-50 border-slate-200'}`}><Eye className="size-4 mb-1 text-emerald-600"/><p className="text-xs font-bold text-slate-800">Abridores</p><p className="text-[10px] text-slate-500 font-medium">{st.abertos} contatos</p></button>
                    <button onClick={() => setTipoSegmento('clicadores')} className={`p-2 border rounded-xl text-left transition-colors ${tipoSegmento === 'clicadores' ? 'border-purple-500 bg-purple-50' : 'hover:bg-slate-50 border-slate-200'}`}><MousePointerClick className="size-4 mb-1 text-purple-600"/><p className="text-xs font-bold text-slate-800">Clicadores</p><p className="text-[10px] text-slate-500 font-medium">{st.clicados} contatos</p></button>
                    <button onClick={() => setTipoSegmento('nao_abriram')} className={`p-2 border rounded-xl text-left transition-colors ${tipoSegmento === 'nao_abriram' ? 'border-amber-500 bg-amber-50' : 'hover:bg-slate-50 border-slate-200'}`}><AlertCircle className="size-4 mb-1 text-amber-600"/><p className="text-xs font-bold text-slate-800">Não abriram</p><p className="text-[10px] text-slate-500 font-medium">{Math.max(st.enviados - st.abertos, 0)} contatos</p></button>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={nomeNovaLista} onChange={e => setNomeNovaLista(e.target.value)} placeholder="Nome da nova lista" className="flex-1 p-2 border rounded-lg text-sm text-slate-800" />
                    <button onClick={criarSegmento} disabled={criandoLista} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm">{criandoLista ? <Loader2 className="size-4 animate-spin" /> : 'Criar'}</button>
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
              <div><label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Pencil className="size-4 text-slate-500" /> Novo Assunto</label><input type="text" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} className="w-full p-3 border rounded-xl text-slate-800" /></div>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setModalReenvio(null)} disabled={processandoReenvio} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl disabled:opacity-50">Cancelar</button>
              <button onClick={confirmarReenvio} disabled={processandoReenvio} className="px-6 py-2.5 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
                {processandoReenvio ? <><Loader2 className="size-4 animate-spin" /> Processando...</> : <><RotateCcw className="size-4" /> Reenviar agora</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
