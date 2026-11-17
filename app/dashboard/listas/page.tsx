'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Edit, Trash2, Users, Loader2, Save, X, AlertTriangle, RotateCcw, Archive } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ListasPage() {
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  
  const [abaAtiva, setAbaAtiva] = useState<'ativas' | 'lixeira'>('ativas')

  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nomeLista, setNomeLista] = useState('')
  const [salvando, setSalvando] = useState(false)

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
                      className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors text-sm"
                    >
                      <Edit className="size-4" /> Editar
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
    </div>
  )
}
