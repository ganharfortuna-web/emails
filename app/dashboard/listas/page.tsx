'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Edit, Trash2, Users, Loader2, Save, X, AlertTriangle, RotateCcw, Archive, Filter, Eye, MousePointerClick, Send, Calendar, RefreshCw } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type DadoSegmento = { abriu: boolean; clicou: boolean; enviado: boolean }

export default function ListasPage() {
  // ============ ESTADO ORIGINAL (INTACTO) ============
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'ativas' | 'lixeira'>('ativas')
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nomeLista, setNomeLista] = useState('')
  const [salvando, setSalvando] = useState(false)

  // ============ NOVO: ESTADO DE SEGMENTAÇÃO ============
  const [modalSegmento, setModalSegmento] = useState<any>(null)
  const [carregandoSegmento, setCarregandoSegmento] = useState(false)
  const [dadosSegmento, setDadosSegmento] = useState<Record<string, DadoSegmento>>({})
  const [filtrosSegmento, setFiltrosSegmento] = useState<string[]>(['abriram', 'clicaram'])
  const [listaDestinoId, setListaDestinoId] = useState('')
  const [processandoSegmento, setProcessandoSegmento] = useState(false)
  const [msgSegmento, setMsgSegmento] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [totalContatosLista, setTotalContatosLista] = useState(0)
  const [campanhasAnalisadas, setCampanhasAnalisadas] = useState(0)

  useEffect(() => {
    carregarListas()
  }, [abaAtiva])

  const carregarListas = async () => {
    setCarregando(true)
    let query = supabase.from('listas').select('*, contatos(count)').order('created_at', { ascending: false })
    if (abaAtiva === 'ativas') {
      query = query.is('deleted_at', null)
    } else {
      query = query.not('deleted_at', 'is', null)
    }
    const { data } = await query
    if (data) setListas(data)
    setCarregando(false)
  }

  const moverParaLixeira = async (id: string, nome: string) => {
    if (!confirm(`Deseja mover a lista "${nome}" para a Lixeira?\n\nOs contatos NÃO serão apagados.`)) return
    setProcessandoId(id)
    await supabase.from('listas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    carregarListas()
    setProcessandoId(null)
  }

  const restaurarLista = async (id: string) => {
    setProcessandoId(id)
    await supabase.from('listas').update({ deleted_at: null }).eq('id', id)
    carregarListas()
    setProcessandoId(null)
  }

  const excluirDefinitivo = async (id: string, nome: string) => {
    const msg = `🚨 EXCLUSÃO DEFINITIVA 🚨\n\nVocê está prestes a apagar a lista "${nome}" para sempre.\n\n✅ BOM: Os contatos NÃO serão apagados, eles apenas ficarão "Sem Lista".\n❌ RUIM: As campanhas vinculadas a esta lista serão apagadas do histórico.\n\nTem certeza?`
    if (!confirm(msg)) return
    setProcessandoId(id)
    try {
      const { data: campanhas } = await supabase.from('campanhas').select('id').eq('lista_id', id)
      const campanhaIds = campanhas?.map(c => c.id) || []
      if (campanhaIds.length > 0) {
        await supabase.from('email_queue').delete().in('campaign_id', campanhaIds)
      }
      await supabase.from('campanhas').delete().eq('lista_id', id)
      await supabase.from('contatos').update({ lista_id: null }).eq('lista_id', id)
      await supabase.from('listas').delete().eq('id', id)
      carregarListas()
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message)
    }
    setProcessandoId(null)
  }

  const abrirModal = (lista?: any) => {
    if (lista) {
      setEditandoId(lista.id)
      setNomeLista(lista.nome)
    } else {
      setEditandoId(null)
      setNomeLista('')
    }
    setModalAberto(true)
  }

  const salvarLista = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeLista.trim()) return
    setSalvando(true)
    if (editandoId) {
      await supabase.from('listas').update({ nome: nomeLista }).eq('id', editandoId)
    } else {
      await supabase.from('listas').insert([{ nome: nomeLista }])
    }
    setSalvando(false)
    setModalAberto(false)
    carregarListas()
  }

  // ============ NOVO: LÓGICA DE SEGMENTAÇÃO ============

  const abrirModalSegmento = async (lista: any) => {
    setModalSegmento(lista)
    setDadosSegmento({})
    setFiltrosSegmento(['abriram', 'clicaram'])
    setListaDestinoId('')
    setMsgSegmento('')
    setDataInicio('')
    setDataFim('')
    setCarregandoSegmento(true)
    await executarAnalise(lista, '', '')
  }

  const executarAnalise = async (lista: any, inicio: string, fim: string) => {
    setCarregandoSegmento(true)
    try {
      // 1) Buscar TODOS os contatos da lista (paginado)
      let todosContatos: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true
      while (hasMore) {
        const { data } = await supabase
          .from('contatos')
          .select('email')
          .eq('lista_id', lista.id)
          .range(page * pageSize, (page + 1) * pageSize - 1)
        if (data && data.length > 0) {
          todosContatos = [...todosContatos, ...data]
          if (data.length < pageSize) hasMore = false
          else page++
        } else {
          hasMore = false
        }
      }
      setTotalContatosLista(todosContatos.length)
      const emailsDaLista = new Set(
        todosContatos.map(c => (c.email || '').toLowerCase()).filter(Boolean)
      )

      // 2) Buscar campanhas desta lista (com filtro de data opcional)
      let campQuery = supabase.from('campanhas').select('id').eq('lista_id', lista.id)
      if (inicio) campQuery = campQuery.gte('created_at', new Date(inicio + 'T00:00:00').toISOString())
      if (fim) campQuery = campQuery.lte('created_at', new Date(fim + 'T23:59:59').toISOString())
      const { data: campanhas, error: errCamp } = await campQuery
      if (errCamp) throw errCamp

      if (!campanhas || campanhas.length === 0) {
        setCampanhasAnalisadas(0)
        const vazio: Record<string, DadoSegmento> = {}
        emailsDaLista.forEach(email => { vazio[email] = { abriu: false, clicou: false, enviado: false } })
        setDadosSegmento(vazio)
        setCarregandoSegmento(false)
        return
      }

      setCampanhasAnalisadas(campanhas.length)
      const campanhaIds = campanhas.map(c => c.id)

      // 3) Buscar toda a fila enviada destas campanhas (paginado)
      let todosEnvios: any[] = []
      page = 0
      hasMore = true
      while (hasMore) {
        const { data } = await supabase
          .from('email_queue')
          .select('recipient_email, opened_at, clicked_at')
          .in('campaign_id', campanhaIds)
          .eq('status', 'sent')
          .range(page * pageSize, (page + 1) * pageSize - 1)
        if (data && data.length > 0) {
          todosEnvios = [...todosEnvios, ...data]
          if (data.length < pageSize) hasMore = false
          else page++
        } else {
          hasMore = false
        }
      }

      // 4) Agregar por e-mail — só para contatos QUE ESTÃO NA LISTA
      const agregado: Record<string, DadoSegmento> = {}
      emailsDaLista.forEach(email => {
        agregado[email] = { abriu: false, clicou: false, enviado: false }
      })
      todosEnvios.forEach(e => {
        const email = (e.recipient_email || '').toLowerCase()
        if (!email || !emailsDaLista.has(email)) return
        agregado[email].enviado = true
        if (e.opened_at) agregado[email].abriu = true
        if (e.clicked_at) agregado[email].clicou = true
      })

      setDadosSegmento(agregado)
    } catch (err: any) {
      alert('Erro ao analisar campanhas: ' + err.message)
    }
    setCarregandoSegmento(false)
  }

  const aplicarFiltroData = () => {
    if (!modalSegmento) return
    executarAnalise(modalSegmento, dataInicio, dataFim)
  }

  const toggleFiltroSegmento = (filtro: string) => {
    setFiltrosSegmento(prev =>
      prev.includes(filtro) ? prev.filter(f => f !== filtro) : [...prev, filtro]
    )
  }

  const getContatosFiltrados = () => {
    const emails = Object.keys(dadosSegmento)
    return emails.filter(email => {
      const d = dadosSegmento[email]
      if (filtrosSegmento.length === 0) return false
      let match = false
      if (filtrosSegmento.includes('abriram') && d.abriu) match = true
      if (filtrosSegmento.includes('clicaram') && d.clicou) match = true
      if (filtrosSegmento.includes('nao_abriram') && d.enviado && !d.abriu) match = true
      return match
    })
  }

  const executarSegmento = async () => {
    if (!modalSegmento) return
    if (!listaDestinoId) return alert('Selecione a lista de destino.')
    const emails = getContatosFiltrados()
    if (emails.length === 0) return alert('Nenhum contato atende aos filtros selecionados.')

    const nomeDestino = listas.find(l => l.id === listaDestinoId)?.nome || 'destino'
    if (!confirm(`Mover ${emails.length} contato(s) para a lista "${nomeDestino}"?`)) return

    setProcessandoSegmento(true)
    setMsgSegmento('')
    try {
      // Move apenas os contatos que AINDA estão na lista de origem (segurança)
      for (let i = 0; i < emails.length; i += 500) {
        const batch = emails.slice(i, i + 500)
        await supabase
          .from('contatos')
          .update({ lista_id: listaDestinoId })
          .in('email', batch)
          .eq('lista_id', modalSegmento.id)
      }
      setMsgSegmento(`✅ ${emails.length} contato(s) movidos para "${nomeDestino}" com sucesso!`)
      carregarListas()
      // Recarrega análise para refletir os contatos restantes
      await executarAnalise(modalSegmento, dataInicio, dataFim)
    } catch (err: any) {
      alert('Erro ao mover contatos: ' + err.message)
    }
    setProcessandoSegmento(false)
  }

  // ============ ESTATÍSTICAS DERIVADAS ============
  const totalAbriram = Object.values(dadosSegmento).filter(d => d.abriu).length
  const totalClicaram = Object.values(dadosSegmento).filter(d => d.clicou).length
  const totalEnviados = Object.values(dadosSegmento).filter(d => d.enviado).length
  const totalNaoAbriram = Object.values(dadosSegmento).filter(d => d.enviado && !d.abriu).length
  const contatosFiltradosCount = getContatosFiltrados().length

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Minhas Listas</h2>
          <p className="text-slate-600 mt-1">Gerencie suas listas de contatos com segurança.</p>
        </div>
        {abaAtiva === 'ativas' && (
          <button
            onClick={() => abrirModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="size-5" /> Criar Nova Lista
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setAbaAtiva('ativas')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors border-b-2 ${abaAtiva === 'ativas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Users className="size-4" /> Listas Ativas
        </button>
        <button
          onClick={() => setAbaAtiva('lixeira')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors border-b-2 ${abaAtiva === 'lixeira' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Archive className="size-4" /> Lixeira
        </button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-blue-500" /></div>
      ) : listas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          {abaAtiva === 'ativas' ? <Users className="size-12 text-slate-300 mx-auto mb-4" /> : <Archive className="size-12 text-slate-300 mx-auto mb-4" />}
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {abaAtiva === 'ativas' ? 'Nenhuma lista ativa' : 'Sua lixeira está vazia'}
          </h3>
          <p className="text-slate-500">
            {abaAtiva === 'ativas' ? 'Clique em "Criar Nova Lista" para começar.' : 'As listas que você apagar aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listas.map(lista => (
            <div key={lista.id} className={`bg-white rounded-2xl border ${abaAtiva === 'lixeira' ? 'border-red-100 opacity-90' : 'border-slate-200'} shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow`}>
              <div className="p-6 flex-1">
                <h3 className="font-black text-lg text-slate-900 mb-1 truncate" title={lista.nome}>{lista.nome}</h3>
                <p className="text-xs text-slate-400 font-medium mb-4">
                  {abaAtiva === 'lixeira' ? 'Apagada em: ' : 'Criada em '}
                  {new Date(abaAtiva === 'lixeira' ? lista.deleted_at : lista.created_at).toLocaleDateString('pt-BR')}
                </p>

                <div className={`inline-flex items-center gap-2 ${abaAtiva === 'lixeira' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'} px-4 py-2 rounded-xl border ${abaAtiva === 'lixeira' ? 'border-slate-200' : 'border-emerald-100'}`}>
                  <Users className="size-4" />
                  <span className="font-bold text-sm">
                    {lista.contatos[0]?.count || 0} leads
                  </span>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                {abaAtiva === 'ativas' ? (
                  <>
                    <button
                      onClick={() => abrirModal(lista)}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold py-2 rounded-lg flex justify-center items-center gap-1 transition-colors text-sm"
                    >
                      <Edit className="size-4" /> Editar
                    </button>
                    <button
                      onClick={() => abrirModalSegmento(lista)}
                      className="flex-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold py-2 rounded-lg flex justify-center items-center gap-1 transition-colors text-sm"
                      title="Segmentar contatos por abertura/clique"
                    >
                      <Filter className="size-4" /> Segmentar
                    </button>
                    <button
                      onClick={() => moverParaLixeira(lista.id, lista.nome)}
                      disabled={processandoId === lista.id}
                      className="p-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Mover para Lixeira"
                    >
                      {processandoId === lista.id ? <Loader2 className="size-5 animate-spin" /> : <Trash2 className="size-5" />}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => restaurarLista(lista.id)}
                      disabled={processandoId === lista.id}
                      className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors text-sm"
                    >
                      {processandoId === lista.id ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Restaurar
                    </button>
                    <button
                      onClick={() => excluirDefinitivo(lista.id, lista.nome)}
                      disabled={processandoId === lista.id}
                      className="flex-1 bg-red-600 text-white hover:bg-red-700 font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors text-sm"
                    >
                      <Trash2 className="size-4" /> Excluir de Vez
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ MODAL DE EDITAR/CRIAR (ORIGINAL) ============ */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900">{editandoId ? 'Editar Lista' : 'Nova Lista'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-700"><X className="size-5" /></button>
            </div>
            <form onSubmit={salvarLista} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Lista</label>
                <input
                  type="text"
                  value={nomeLista}
                  onChange={e => setNomeLista(e.target.value)}
                  required
                  autoFocus
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  placeholder="Ex: Leads Instagram"
                />
              </div>
              <button type="submit" disabled={salvando} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center gap-2 hover:bg-blue-700 transition-colors">
                {salvando ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />} Salvar Lista
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============ NOVO: MODAL DE SEGMENTAÇÃO ============ */}
      {modalSegmento && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Filter className="size-5 text-indigo-600" /> Segmentar Lista
                </h2>
                <p className="text-sm text-slate-500 mt-1">{modalSegmento.nome} — {totalContatosLista} contato(s) na lista</p>
              </div>
              <button onClick={() => { setModalSegmento(null); setMsgSegmento('') }} className="text-slate-400 hover:text-slate-700">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Filtro por data (opcional) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                  <Calendar className="size-3.5" /> FILTRAR POR DATA DAS CAMPANHAS (OPCIONAL)
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white"
                  />
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white"
                  />
                  <button
                    onClick={aplicarFiltroData}
                    disabled={carregandoSegmento}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                  >
                    <RefreshCw className={`size-4 ${carregandoSegmento ? 'animate-spin' : ''}`} /> Aplicar
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {campanhasAnalisadas > 0 ? `Analisando ${campanhasAnalisadas} campanha(s) desta lista.` : 'Nenhuma campanha encontrada neste período.'}
                </p>
              </div>

              {carregandoSegmento ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="size-8 animate-spin text-indigo-500 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Analisando campanhas e engajamento...</p>
                </div>
              ) : (
                <>
                  {/* Cards de estatísticas */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-blue-50 p-3 rounded-xl text-center">
                      <Send className="size-4 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900">{totalEnviados}</p>
                      <p className="text-[10px] font-bold text-slate-500">ENVIADOS</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl text-center">
                      <Eye className="size-4 text-emerald-600 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900">{totalAbriram}</p>
                      <p className="text-[10px] font-bold text-slate-500">ABRIRAM</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl text-center">
                      <MousePointerClick className="size-4 text-purple-600 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900">{totalClicaram}</p>
                      <p className="text-[10px] font-bold text-slate-500">CLICARAM</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl text-center">
                      <AlertTriangle className="size-4 text-amber-600 mx-auto mb-1" />
                      <p className="text-lg font-black text-slate-900">{totalNaoAbriram}</p>
                      <p className="text-[10px] font-bold text-slate-500">NÃO ABRIRAM</p>
                    </div>
                  </div>

                  {/* Filtros múltiplos */}
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-2">FILTROS (MÚLTIPLA ESCOLHA)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => toggleFiltroSegmento('abriram')}
                        className={`p-3 border-2 rounded-xl text-left transition-colors ${filtrosSegmento.includes('abriram') ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <Eye className={`size-4 mb-1 ${filtrosSegmento.includes('abriram') ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <p className="text-xs font-bold text-slate-800">Abriram</p>
                        <p className="text-[10px] text-slate-500 font-medium">{totalAbriram} contatos</p>
                      </button>
                      <button
                        onClick={() => toggleFiltroSegmento('clicaram')}
                        className={`p-3 border-2 rounded-xl text-left transition-colors ${filtrosSegmento.includes('clicaram') ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <MousePointerClick className={`size-4 mb-1 ${filtrosSegmento.includes('clicaram') ? 'text-purple-600' : 'text-slate-400'}`} />
                        <p className="text-xs font-bold text-slate-800">Clicaram</p>
                        <p className="text-[10px] text-slate-500 font-medium">{totalClicaram} contatos</p>
                      </button>
                      <button
                        onClick={() => toggleFiltroSegmento('nao_abriram')}
                        className={`p-3 border-2 rounded-xl text-left transition-colors ${filtrosSegmento.includes('nao_abriram') ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <AlertTriangle className={`size-4 mb-1 ${filtrosSegmento.includes('nao_abriram') ? 'text-amber-600' : 'text-slate-400'}`} />
                        <p className="text-xs font-bold text-slate-800">Não abriram</p>
                        <p className="text-[10px] text-slate-500 font-medium">{totalNaoAbriram} contatos</p>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Combinando filtros, o resultado é a UNIÃO (ex: Abriram + Clicaram = quem abriu OU clicou).
                    </p>
                  </div>

                  {/* Preview do resultado */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-indigo-700">CONTATOS QUE SERÃO MOVIDOS</p>
                      <p className="text-2xl font-black text-indigo-900">{contatosFiltradosCount}</p>
                    </div>
                    <Users className="size-10 text-indigo-400" />
                  </div>

                  {/* Lista de destino + Botão mover */}
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-2">MOVER PARA:</p>
                    <select
                      value={listaDestinoId}
                      onChange={e => setListaDestinoId(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white mb-3 outline-none focus:border-indigo-500"
                    >
                      <option value="">Selecione a lista de destino...</option>
                      {listas.filter(l => l.id !== modalSegmento.id).map(l => (
                        <option key={l.id} value={l.id}>{l.nome} ({l.contatos[0]?.count || 0} leads)</option>
                      ))}
                    </select>
                    <button
                      onClick={executarSegmento}
                      disabled={processandoSegmento || contatosFiltradosCount === 0 || !listaDestinoId}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      {processandoSegmento ? <Loader2 className="size-5 animate-spin" /> : <Filter className="size-5" />}
                      {processandoSegmento ? 'Movendo...' : `Mover ${contatosFiltradosCount} contato(s)`}
                    </button>
                    {msgSegmento && (
                      <p className="mt-2 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                        {msgSegmento}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
