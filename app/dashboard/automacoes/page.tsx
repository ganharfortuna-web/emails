"use client"

import { useState, useEffect } from 'react'
import { Send, Clock, Mail, LayoutTemplate, Loader2, Hourglass, Trash2, RotateCcw, CalendarClock, CheckSquare, Square, Eye, MousePointerClick, Pencil, Zap, RefreshCw, Flame, Pause, Play, BarChart3, X, Users, AlertCircle, Copy, CheckCircle2, Target } from 'lucide-react'
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
}, {
  ssr: false,
  loading: () => <p className="p-4 text-slate-400 text-sm font-medium">Carregando editor visual...</p>
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  abertosBrutos: number
  reabertos: number
  clicados: number
  total: number
  enviados: number
  pendentes: number
  falhados: number
}

const STATS_VAZIO: StatsItem = {
  abertos: 0, abertosBrutos: 0, reabertos: 0, clicados: 0,
  total: 0, enviados: 0, pendentes: 0, falhados: 0
}

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
  const [disparandoEmLote, setDisparandoEmLote] = useState<string | null>(null)

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
    const { data, error } = await supabase
      .from('email_queue')
      .select('campaign_id, opened_at, clicked_at, status, open_real_count, open_prefetch_count')

    if (error || !data) return

    const agrupado: Record<string, StatsItem> = {}

    for (const c of campanhas) {
      agrupado[String(c.id)] = { ...STATS_VAZIO }
    }

    for (const item of data) {
      const key = String(item.campaign_id)
      if (!agrupado[key]) continue
      agrupado[key].total++
      if (item.status === 'sent') agrupado[key].enviados++
      if (item.status === 'pending') agrupado[key].pendentes++
      if (item.status === 'failed') agrupado[key].falhados++

      if ((item.open_real_count || 0) > 0) {
        agrupado[key].abertos++
        if (item.open_real_count > 1) agrupado[key].reabertos++
      }

      if ((item.open_real_count || 0) > 0 || (item.open_prefetch_count || 0) > 0) {
        agrupado[key].abertosBrutos++
      }

      if (item.clicked_at) agrupado[key].clicados++
    }
    setStats(agrupado)
  }

  // --- LOOP AUTOMÁTICO SEGURO RESPEITANDO LIMITES DA VERCEL / SUPABASE ---
  const dispararLotesEmSequencia = async (campanhaId: string | number) => {
    setDisparandoEmLote(String(campanhaId))
    let continuar = true
    let totalEnviadosNestaSessao = 0

    while (continuar) {
      try {
        const res = await fetch('/api/disparo/processar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campanhaId }),
        })
        const json = await res.json()

        if (!res.ok) {
          console.error('Erro ao processar lote:', json.error)
          break
        }

        totalEnviadosNestaSessao += (json.enviados || 0)
        await buscarCampanhas(true)
        await carregarStats()

        // Se o backend indicou 'done: true' ou não restou nenhum pendente, encerra o loop
        if (json.done || json.restantes === 0 || (json.enviados === 0 && json.processed === 0)) {
          continuar = false
        } else {
          // Pequena pausa de 500ms entre os lotes para aliviar o Supabase e evitar Rate Limit
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (err) {
        console.error('Falha de rede no disparo:', err)
        break
      }
    }

    setDisparandoEmLote(null)
    alert(`🎉 Processo concluído! Total enviado nesta sessão: ${totalEnviadosNestaSessao} e-mails.`)
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
    const msg = ids.length === campanhas.length
      ? `Apagar TODAS as ${ids.length} campanhas?`
      : `Apagar ${ids.length} campanha(s)?`
    if (!confirm(msg)) return

    await supabase.from('email_queue').delete().in('campaign_id', ids)
    await supabase.from('campanhas').delete().in('id', ids)
    setSelecionadas(new Set())
    buscarCampanhas()
  }

  const alternarPausa = async (campanha: any) => {
    const novoStatus = campanha.status === 'Pausada' ? 'Em Fila' : 'Pausada'
    await supabase.from('campanhas').update({ status: novoStatus }).eq('id', campanha.id)
    buscarCampanhas()
    if (modalDetalhes?.id === campanha.id) {
      setModalDetalhes({ ...modalDetalhes, status: novoStatus })
    }
  }

  const reutilizarCampanha = (campanha: any) => {
    if (!confirm(`Carregar "${campanha.assunto}" no editor?\n\nVocê poderá editar e reenviar.`)) return
    setListaSelecionada(campanha.lista_id || '')
    setAssunto(campanha.assunto || '')
    setMensagem(campanha.mensagem || '')
    setScheduledAt('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const criarSegmento = async () => {
    if (!modalDetalhes || !nomeNovaLista.trim()) {
      alert('Digite um nome para a nova lista.')
      return
    }

    setCriandoLista(true)
    setMsgSucesso('')

    try {
      let query = supabase
        .from('email_queue')
        .select('recipient_email, recipient_name, open_real_count, opened_at, clicked_at')
        .eq('campaign_id', modalDetalhes.id)

      if (tipoSegmento === 'abridores') {
        query = query.gt('open_real_count', 0)
      } else if (tipoSegmento === 'clicadores') {
        query = query.not('clicked_at', 'is', null)
      } else if (tipoSegmento === 'nao_abriram') {
        query = query.eq('status', 'sent').or('open_real_count.is.null,open_real_count.eq.0')
      }

      const { data: itens, error } = await query

      if (error || !itens || itens.length === 0) {
        alert('Nenhum contato encontrado nesse segmento.')
        setCriandoLista(false)
        return
      }

      const { data: novaLista, error: errLista } = await supabase
        .from('listas')
        .insert([{ nome: nomeNovaLista.trim() }])
        .select().single()

      if (errLista || !novaLista) {
        alert('Erro ao criar lista: ' + (errLista?.message || 'erro'))
        setCriandoLista(false)
        return
      }

      const vistos = new Set<string>()
      const novosContatos = itens
        .filter(i => {
          const email = (i.recipient_email || '').toLowerCase()
          if (!email || vistos.has(email)) return false
          vistos.add(email)
          return true
        })
        .map(i => ({
          nome: i.recipient_name || 'Lead',
          email: (i.recipient_email || '').toLowerCase(),
          lista_id: novaLista.id,
          status: 'ativo',
        }))

      const { error: errInsert } = await supabase.from('contatos').insert(novosContatos)

      if (errInsert) {
        alert('Erro ao inserir contatos: ' + errInsert.message)
        setCriandoLista(false)
        return
      }

      setMsgSucesso(`✅ Lista "${nomeNovaLista}" criada com ${novosContatos.length} contatos!`)
      setNomeNovaLista('')
      buscarListas()
    } catch (e: any) {
      alert('Erro: ' + e.message)
    }

    setCriandoLista(false)
  }

  const abrirModalReenvio = async (campanha: any) => {
    const { data } = await supabase
      .from('email_queue')
      .select('id, open_real_count')
      .eq('campaign_id', campanha.id)
      .eq('status', 'sent')

    if (!data || data.length === 0) {
      alert('⚠️ Esta campanha ainda não foi enviada.')
      return
    }

    const naoAbriram = data.filter(d => !d.open_real_count || d.open_real_count === 0).length
    if (naoAbriram === 0) {
      alert('🎉 Todos já abriram!')
      return
    }

    setModalReenvio({ ...campanha, totalNaoAbriram: naoAbriram })
    setNovoTitulo(`[REENVIO] ${campanha.assunto}`)
  }

  const confirmarReenvio = async () => {
    if (!modalReenvio) return

    const { data: originais } = await supabase
      .from('email_queue')
      .select('recipient_email, recipient_name, subject, body, open_real_count')
      .eq('campaign_id', modalReenvio.id)
      .eq('status', 'sent')

    const naoAbriram = (originais || []).filter(o => !o.open_real_count || o.open_real_count === 0)

    if (naoAbriram.length === 0) {
      alert('🎉 Todos já abriram!')
      setModalReenvio(null)
      return
    }

    const { data: nova, error } = await supabase
      .from('campanhas')
      .insert([{
        lista_id: modalReenvio.lista_id,
        assunto: novoTitulo || `[REENVIO] ${modalReenvio.assunto}`,
        mensagem: naoAbriram[0].body,
        status: 'Em Fila',
      }])
      .select().single()

    if (error || !nova) { alert('Erro ao criar campanha de reenvio.'); return }

    const fila = naoAbriram.map(o => ({
      campaign_id: nova.id,
      recipient_email: o.recipient_email,
      recipient_name: o.recipient_name,
      subject: novoTitulo || `[REENVIO] ${o.subject}`,
      body: o.body,
      status: 'pending',
    }))

    await supabase.from('email_queue').insert(fila)
    await supabase.from('campanhas').update({ total_sent: fila.length }).eq('id', nova.id)

    setModalReenvio(null)
    setNovoTitulo('')
    buscarCampanhas()

    dispararLotesEmSequencia(nova.id)
  }

  const prepararDisparo = async (e: React.FormEvent) => {
    e.preventDefault()

    const mensagemVazia = mensagem.replace(/<[^>]*>?/gm, '').trim().length === 0
    if (!listaSelecionada || !assunto || mensagemVazia) {
      alert("Preencha todos os campos.")
      return
    }

    setEnviando(true)

    const { data: novaCampanha, error } = await supabase
      .from('campanhas')
      .insert([{
        lista_id: listaSelecionada,
        assunto,
        mensagem,
        status: scheduledAt ? 'Agendada' : 'Em Fila',
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      }])
      .select().single()

    if (error) {
      alert(`Erro ao salvar: ${error.message}`)
      setEnviando(false)
      return
    }

    try {
      const r = await fetch('/api/disparo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanhaId: novaCampanha.id }),
      })
      const j = await r.json()

      if (!r.ok) {
        alert(`⚠️ Campanha salva, mas houve erro:\n${j.error || 'erro'} ${j.detalhe || ''}`)
        setEnviando(false)
        return
      }

      if (!scheduledAt) {
        alert(`🎉 Campanha enfileirada com sucesso! Iniciando disparos automáticos...`)
        setEnviando(false)
        setAssunto('')
        setMensagem('')
        setListaSelecionada('')
        setScheduledAt('')
        buscarCampanhas()

        // Inicia o loop automático de envio em lotes seguros
        dispararLotesEmSequencia(novaCampanha.id)
        return
      } else {
        alert(`📅 Campanha agendada para ${new Date(scheduledAt).toLocaleString('pt-BR')}`)
      }
    } catch (err) {
      alert("⚠️ Campanha salva, mas falhou ao enfileirar.")
    }

    setEnviando(false)
    setAssunto('')
    setMensagem('')
    setListaSelecionada('')
    setScheduledAt('')
    buscarCampanhas()
  }

  const todasSelecionadas = campanhas.length > 0 && selecionadas.size === campanhas.length

  return (
    <div className="max-w-6xl mx-auto">

      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Nova Campanha</h2>
          <p className="text-lg text-slate-600 mt-2">Crie, agende e dispare e-mails em massa para as suas listas.</p>
        </div>
        <button
          onClick={() => buscarCampanhas(true)}
          disabled={atualizando}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 text-sm"
        >
          <RefreshCw className={`size-4 ${atualizando ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* EDITOR */}
        <div className="lg:col-span-2">
          <form onSubmit={prepararDisparo} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col relative z-10">

            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3 rounded-t-2xl">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-700"><Mail className="size-5" /></div>
              <h3 className="font-bold text-slate-800 text-lg">Compositor de Mensagem</h3>
            </div>

            <div className="p-6 space-y-6 flex-1">

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Para qual lista deseja enviar? *</label>
                <select value={listaSelecionada} onChange={e => setListaSelecionada(e.target.value)} required
                  className="bg-white w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium cursor-pointer">
                  <option value="" disabled>Selecione uma lista de contatos...</option>
                  {listas.map(lista => (
                    <option key={lista.id} value={lista.id}>
                      {lista.nome} ({lista.contatos[0]?.count || 0} leads)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Assunto do E-mail *</label>
                <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)} required
                  placeholder="Ex: Oferta exclusiva liberada!"
                  className="bg-white w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <CalendarClock className="size-4 text-slate-500" />
                  Agendar envio (opcional)
                </label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                  className="bg-white w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium" />
                <p className="text-xs text-slate-500 mt-1">Deixe vazio para processar assim que possível.</p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <div className="text-emerald-700 mt-0.5"><Zap className="size-5" /></div>
                <div>
                  <p className="font-bold text-emerald-900 text-sm">Envio otimizado em lotes</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    O sistema processa os e-mails de forma segura e contínua respeitando os limites da Vercel e do Supabase.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mensagem *</label>
                <div className="bg-white rounded-xl border border-slate-200 overflow-visible
                  [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-toolbar]:bg-slate-50 [&_.ql-toolbar]:rounded-t-xl
                  [&_.ql-container]:border-none [&_.ql-container]:rounded-b-xl
                  [&_.ql-editor]:min-h-[350px] [&_.ql-editor]:text-slate-700 [&_.ql-editor]:text-base
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
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl mt-auto">
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Revise antes de salvar.</p>
              <button type="submit" disabled={enviando}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md disabled:opacity-50 flex items-center justify-center gap-3 transition-colors text-lg">
                {enviando ? <><Loader2 className="size-5 animate-spin" /> Processando...</>
                          : <><Send className="size-5" /> {scheduledAt ? 'Agendar Campanha' : 'Enviar Campanha'}</>}
              </button>
            </div>
          </form>
        </div>

        {/* HISTÓRICO */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Clock className="size-5 text-slate-400" /> Histórico
              </h3>
              {campanhas.length > 0 && (
                <button onClick={toggleTodas} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  {todasSelecionadas ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                  {todasSelecionadas ? 'Desmarcar' : 'Marcar todas'}
                </button>
              )}
            </div>

            {selecionadas.size > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <span className="text-sm font-bold text-blue-800">{selecionadas.size} selecionada(s)</span>
                <button onClick={() => deletarCampanhas(Array.from(selecionadas))}
                  className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <Trash2 className="size-3" /> Apagar
                </button>
              </div>
            )}

            <div className="space-y-4">
              {carregandoHistorico ? (
                <div className="flex justify-center p-4"><Loader2 className="size-6 animate-spin text-blue-500" /></div>
              ) : campanhas.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                  <p className="text-sm text-slate-500 font-medium">Nenhuma campanha criada ainda.</p>
                </div>
              ) : (
                campanhas.map((campanha) => {
                  const sel = selecionadas.has(campanha.id)
                  const st = stats[String(campanha.id)] || { ...STATS_VAZIO }
                  const estaDisparandoEste = disparandoEmLote === String(campanha.id)

                  const corStatus = campanha.status === 'Pausada' ? 'bg-slate-200 text-slate-700'
                    : campanha.status === 'Agendada' ? 'bg-purple-100 text-purple-700'
                    : campanha.status === 'Enviando...' ? 'bg-cyan-100 text-cyan-700'
                    : campanha.status === 'Em Fila' ? 'bg-blue-100 text-blue-700'
                    : campanha.status === 'Enviada' ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'

                  const ctor = st.abertos > 0 ? Math.round((st.clicados / st.abertos) * 100) : 0

                  return (
                    <div key={campanha.id}
                      className={`p-4 rounded-xl border ${sel ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-slate-50'} transition-colors`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggleSelecionada(campanha.id)} className="mt-0.5 text-slate-500 hover:text-blue-600">
                          {sel ? <CheckSquare className="size-5 text-blue-600" /> : <Square className="size-5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 whitespace-nowrap ${corStatus}`}>
                              <Hourglass className="size-3" /> {campanha.status}
                              {st.pendentes > 0 && <span className="ml-1 opacity-70">({st.pendentes} restam)</span>}
                            </span>
                            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
                              {new Date(campanha.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 text-sm truncate" title={campanha.assunto}>
                            {campanha.assunto}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            Lista: <strong>{campanha.listas?.nome || 'Excluída'}</strong>
                          </p>

                          {st.total > 0 && (
                            <div className="mt-2 space-y-1.5">
                              <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                                <span className="flex items-center gap-1 text-blue-600" title="Enviados">
                                  <Send className="size-3" /> {st.enviados}/{st.total}
                                </span>
                                <span className="flex items-center gap-1 text-emerald-600" title="Abriram de verdade">
                                  <Eye className="size-3" /> {st.abertos}
                                  {st.enviados > 0 && (
                                    <span className="text-[10px] opacity-70">
                                      ({Math.round((st.abertos / st.enviados) * 100)}%)
                                    </span>
                                  )}
                                </span>
                                {st.reabertos > 0 && (
                                  <span className="flex items-center gap-1 text-orange-600" title="Leads quentes">
                                    <Flame className="size-3" /> {st.reabertos}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-purple-600" title="Cliques">
                                  <MousePointerClick className="size-3" /> {st.clicados}
                                </span>
                              </div>

                              {st.abertos > 0 && st.clicados > 0 && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                  <Target className="size-3" /> CTOR {ctor}%
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-3 flex-wrap">
                            <button onClick={() => { setModalDetalhes(campanha); setMsgSucesso(''); setNomeNovaLista('') }}
                              className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1">
                              <BarChart3 className="size-3" /> Ver desempenho
                            </button>
                            <button onClick={() => reutilizarCampanha(campanha)}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                              <Copy className="size-3" /> Reutilizar
                            </button>
                            {(campanha.status === 'Em Fila' || campanha.status === 'Enviando...') && (
                              <button onClick={() => alternarPausa(campanha)}
                                className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1">
                                <Pause className="size-3" /> Pausar
                              </button>
                            )}
                            {campanha.status === 'Pausada' && (
                              <button onClick={() => alternarPausa(campanha)}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                                <Play className="size-3" /> Retomar
                              </button>
                            )}
                            {st.pendentes > 0 && campanha.status !== 'Pausada' && (
                              <button
                                onClick={() => dispararLotesEmSequencia(campanha.id)}
                                disabled={estaDisparandoEste}
                                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50">
                                {estaDisparandoEste ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                                {estaDisparandoEste ? 'Enviando...' : 'Disparar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}