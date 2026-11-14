'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Edit, Trash2, Users, Loader2, Save, X } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ListasPage() {
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  // Estados para criar/editar
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nomeLista, setNomeLista] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarListas()
  }, [])

  const carregarListas = async () => {
    setCarregando(true)
    // Puxa as listas e conta quantos contatos têm em cada uma
    const { data, error } = await supabase
      .from('listas')
      .select('*, contatos(count)')
      .order('created_at', { ascending: false })

    if (data) setListas(data)
    setCarregando(false)
  }

  // ✅ FUNÇÃO DE EXCLUSÃO CORRIGIDA
  const deletarLista = async (id: string, nome: string, qtdContatos: number) => {
    const msg = `⚠️ ATENÇÃO: Você está prestes a apagar a lista "${nome}".\n\nTodos os ${qtdContatos} contatos vinculados a ela também serão APAGADOS permanentemente do sistema.\n\nTem certeza que deseja continuar?`
    
    if (!confirm(msg)) return
    
    setDeletandoId(id)
    try {
      // 1. Deleta os contatos vinculados a esta lista primeiro
      const { error: errContatos } = await supabase
        .from('contatos')
        .delete()
        .eq('lista_id', id)

      if (errContatos) throw new Error("Erro ao deletar contatos: " + errContatos.message)

      // 2. Agora que não há mais contatos vinculados, deleta a lista
      const { error: errLista } = await supabase
        .from('listas')
        .delete()
        .eq('id', id)

      if (errLista) throw new Error("Erro ao deletar lista: " + errLista.message)

      // 3. Atualiza a tela
      setListas(listas.filter(l => l.id !== id))
      
    } catch (err: any) {
      alert(err.message)
    }
    setDeletandoId(null)
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
          <p className="text-slate-600 mt-1">Gerencie suas listas de contatos.</p>
        </div>
        <button 
          onClick={() => abrirModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="size-5" /> Criar Nova Lista
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-2">Total de Listas</p>
          <p className="text-4xl font-black text-slate-900">{listas.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-2">Total de Leads</p>
          <p className="text-4xl font-black text-slate-900">
            {listas.reduce((acc, l) => acc + (l.contatos[0]?.count || 0), 0).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-2">Média por Lista</p>
          <p className="text-4xl font-black text-slate-900">
            {listas.length > 0 ? Math.round(listas.reduce((acc, l) => acc + (l.contatos[0]?.count || 0), 0) / listas.length).toLocaleString('pt-BR') : 0}
          </p>
        </div>
      </div>

      {/* GRID DE LISTAS */}
      {carregando ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-blue-500" /></div>
      ) : listas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <Users className="size-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhuma lista criada</h3>
          <p className="text-slate-500">Clique em "Criar Nova Lista" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listas.map(lista => (
            <div key={lista.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-6 flex-1">
                <h3 className="font-black text-lg text-slate-900 mb-1 truncate" title={lista.nome}>{lista.nome}</h3>
                <p className="text-xs text-slate-400 font-medium mb-4">Criada em {new Date(lista.created_at).toLocaleDateString('pt-BR')}</p>
                
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100">
                  <Users className="size-4" />
                  <span className="font-bold text-sm">
                    {lista.contatos[0]?.count || 0} leads
                  </span>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                <button 
                  onClick={() => abrirModal(lista)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors text-sm"
                >
                  <Edit className="size-4" /> Editar
                </button>
                <button 
                  onClick={() => deletarLista(lista.id, lista.nome, lista.contatos[0]?.count || 0)}
                  disabled={deletandoId === lista.id}
                  className="p-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Deletar Lista"
                >
                  {deletandoId === lista.id ? <Loader2 className="size-5 animate-spin" /> : <Trash2 className="size-5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CRIAR/EDITAR */}
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
