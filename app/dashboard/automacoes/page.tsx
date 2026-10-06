"use client"

import { useState, useEffect } from 'react'
import { Send, Clock, Mail, LayoutTemplate, Loader2, Hourglass, Trash2, RotateCcw, CalendarClock, CheckSquare, Square } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

// @ts-ignore
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <p className="p-4 text-slate-400 text-sm font-medium">Carregando editor visual...</p>
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const modulosEditor = {
  toolbar: [
    [{ 'font': [] }], [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }], [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link'], ['clean']
  ],
}

export default function AutomacoesPage() {
  const [listas, setListas] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([]) 
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  
  const [listaSelecionada, setListaSelecionada] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('') 
  const [scheduledAt, setScheduledAt] = useState('') 
  const [enviando, setEnviando] = useState(false)

  // Seleção de campanhas no histórico
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())

  useEffect(() => {
    buscarListas()
    buscarCampanhas() 
  }, [])

  const buscarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome, contatos(count)').order('nome')
    if (data) setListas(data)
  }

  const buscarCampanhas = async () => {
    setCarregandoHistorico(true)
    const { data } = await supabase
      .from('campanhas').select('*, listas(nome)')
      .order('created_at', { ascending: false }).limit(50)
    if (data) setCampanhas(data)
    setCarregandoHistorico(false)
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

  // --- LIMPAR HISTÓRICO ---
  const deletarCampanhas = async (ids: string[]) => {
    if (ids.length === 0) return
    const msg = ids.length === campanhas.length 
      ? `Apagar TODAS as ${ids.length} campanhas do histórico?`
      : `Apagar ${ids.length} campanha(s) selecionada(s)?`
    if (!confirm(msg)) return

    await supabase.from('email_queue').delete().in('campaign_id', ids)
    await supabase.from('campanhas').delete().in('id', ids)
    setSelecionadas(new Set())
    buscarCampanhas()
  }

  // --- REENVIAR PARA QUEM NÃO ABRIU ---
  const reenviarNaoAbriram = async (campanhaId: string) => {
    if (!confirm('Reenviar para todos que ainda NÃO abriram o e-mail?')) return

    const { data: originais } = await supabase
      .from('email_queue')
      .select('recipient_email, recipient_name, subject, body')
      .eq('campaign_id', campanhaId)
      .eq('status', 'sent')
      .is('opened_at', null)

    if (!originais || originais.length === 0) {
      alert('🎉 Todos já abriram! Nada para reenviar.')
      return
    }

    // Cria uma nova campanha de reenvio
    const { data: nova, error } = await supabase
      .from('campanhas')
      .insert([{
        lista_id: (await supabase.from('campanhas').select('lista_id').eq('id', campanhaId).single()).data?.lista_id,
        assunto: `[REENVIO] ${originais[0].subject}`,
        mensagem: originais[0].body,
        status: 'Em Fila',
      }])
      .select().single()

    if (error || !nova) { alert('Erro ao criar campanha de reenvio.'); return }

    const fila = originais.map(o => ({
      campaign_id: nova.id,
      recipient_email: o.recipient_email,
      recipient_name: o.recipient_name,
      subject: `[REENVIO] ${o.subject}`,
      body: o.body,
      status: 'pending',
    }))

    await supabase.from('email_queue').insert(fila)
    await supabase.from('campanhas').update({ total_sent: fila.length }).eq('id', nova.id)

    alert(`✅ ${fila.length} e-mails de reenvio na fila!`)
    buscarCampanhas()
  }

  // --- CRIAR CAMPANHA ---
  const prepararDisparo = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const mensagemVazia = mensagem.replace(/<[^>]*>?/gm, '').trim().length === 0
    if (!listaSelecionada || !assunto || mensagemVazia) {
      alert("Preencha todos os campos antes de disparar.")
      return
    }

    setEnviando(true)

    const { data: novaCampanha, error } = await supabase
      .from('campanhas')
      .insert([{ 
        lista_id: listaSelecionada, 
        assunto, 
        mensagem, 
        status: scheduledAt ? 'Agendada' : 'Aguardando Disparo',
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      }])
      .select().single()

    if (error) {
      alert(`Erro ao salvar: ${error.message}`)
      setEnviando(false)
      return
    }

    try {
      const resposta = await fetch('/api/disparo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanhaId: novaCampanha.id }),
      })

      const json = await resposta.json()

      if (!resposta.ok) {
        alert(`⚠️ Campanha salva, mas houve erro no disparo:\n${json.error || 'erro desconhecido'}\n${json.detalhe || ''}`)
      } else if (scheduledAt) {
        alert(`📅 Campanha agendada para ${new Date(scheduledAt).toLocaleString('pt-BR')}`)
      } else {
        alert("🎉 Campanha salva e e-mails na fila para envio!")
      }
    } catch (err) {
      console.error("Erro no disparo:", err)
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
      
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900">Nova Campanha</h2>
        <p className="text-lg text-slate-600 mt-2">Crie, agende e dispare e-mails em massa para as suas listas.</p>
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
                <p className="text-xs text-slate-500 mt-1">Deixe vazio para enviar assim que possível.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mensagem *</label>
                <div className="bg-white rounded-xl border border-slate-200 overflow-visible
                  [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-toolbar]:bg-slate-50 [&_.ql-toolbar]:rounded-t-xl
                  [&_.ql-container]:border-none [&_.ql-container]:rounded-b-xl
                  [&_.ql-editor]:min-h-[350px] [&_.ql-editor]:text-slate-700 [&_.ql-editor]:text-base">
                  <ReactQuill theme="snow" value={mensagem} onChange={setMensagem} modules={modulosEditor}
                    placeholder="Escreva o corpo do seu e-mail aqui..." />
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

            {/* Barra de ações em lote */}
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
                  const corStatus = campanha.status === 'Agendada' ? 'bg-purple-100 text-purple-700'
                    : campanha.status === 'Em Fila' ? 'bg-blue-100 text-blue-700'
                    : campanha.status === 'Enviada' ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
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
                          {campanha.scheduled_at && (
                            <p className="text-xs text-purple-600 font-bold mt-1">
                              📅 {new Date(campanha.scheduled_at).toLocaleString('pt-BR')}
                            </p>
                          )}
                          <button onClick={() => reenviarNaoAbriram(campanha.id)}
                            className="mt-2 text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1">
                            <RotateCcw className="size-3" /> Reenviar p/ quem não abriu
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {campanhas.length > 0 && (
              <button onClick={() => deletarCampanhas(campanhas.map(c => c.id))}
                className="w-full mt-4 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-center gap-1 py-2 border-t border-slate-100">
                <Trash2 className="size-3" /> Apagar TODO o histórico
              </button>
            )}
          </div>

          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
            <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2 mb-3">
              <LayoutTemplate className="size-4" /> Dicas
            </h3>
            <ul className="text-sm text-emerald-700 space-y-2 font-medium">
              <li>• Evite palavras como "Grátis" ou "Promoção" no assunto.</li>
              <li>• Use o agendamento para enviar em horários de pico.</li>
              <li>• Reenvie para quem não abriu após 3-4 dias.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}