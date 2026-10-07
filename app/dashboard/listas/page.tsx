'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Mail, Edit, Save, X, Users, TrendingUp } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ListasPage() {
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [nomeNovaLista, setNomeNovaLista] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nomeEditado, setNomeEditado] = useState('')

  useEffect(() => {
    carregarListas()
  }, [])

  const carregarListas = async () => {
    setCarregando(true)
    const { data } = await supabase
      .from('listas')
      .select('id, nome, created_at, contatos(count)')
      .order('created_at', { ascending: false })
    if (data) setListas(data)
    setCarregando(false)
  }

  const criarLista = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeNovaLista.trim()) return
    setSalvando(true)

    const { error } = await supabase
      .from('listas')
      .insert([{ nome: nomeNovaLista.trim() }])

    if (error) {
      alert('Erro ao criar lista: ' + error.message)
    } else {
      setNomeNovaLista('')
      setModalAberto(false)
      carregarListas()
    }
    setSalvando(false)
  }

  const salvarEdicao = async (id: string) => {
    if (!nomeEditado.trim()) return

    const { error } = await supabase
      .from('listas')
      .update({ nome: nomeEditado.trim() })
      .eq('id', id)

    if (error) {
      alert('Erro ao salvar: ' + error.message)
    } else {
      setEditandoId(null)
      setNomeEditado('')
      carregarListas()
    }
  }

  const deletarLista = async (id: string, nome: string, qtdContatos: number) => {
    const msg = qtdContatos > 0
      ? `⚠️ ATENÇÃO: A lista "${nome}" tem ${qtdContatos} contato(s).\n\nSe apagar, TODOS os contatos dessa lista também serão removidos.\n\nTem certeza?`
      : `Apagar a lista "${nome}"?`

    if (!confirm(msg)) return

    const { error } = await supabase.from('listas').delete().eq('id', id)

    if (error) {
      alert('Erro ao apagar: ' + error.message)
    } else {
      carregarListas()
    }
  }

  const inciarEdicao = (lista: any) => {
    setEditandoId(lista.id)
    setNomeEditado(lista.nome)
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setNomeEditado('')
  }

  const totalContatos = listas.reduce((acc, l) => acc + (l.contatos?.[0]?.count || 0), 0)

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Minhas Listas</h2>
          <p className="text-lg text-slate-600 mt-2">
            Gerencie suas listas de contatos. Total: <strong>{listas.length}</strong> listas · <strong>{totalContatos}</strong> leads
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <Plus className="size-5" /> Criar Nova Lista
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Mail className="size-5 text-blue-700" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase">Listas</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{listas.length}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Users className="size-5 text-emerald-700" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase">Total de Leads</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalContatos}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <TrendingUp className="size-5 text-purple-700" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase">Média por Lista</span>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {listas.length > 0 ? Math.round(totalContatos / listas.length) : 0}
          </p>
        </div>
      </div>

      {/* LISTA */}
      {carregando ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-blue-500" />
        </div>
      ) : listas.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <Mail className="size-12 text-slate-300 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-600">Nenhuma lista criada ainda.</p>
          <p className="text-sm text-slate-500 mt-1">
            Clique em "Criar Nova Lista" para começar.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listas.map(lista => {
            const qtd = lista.contatos?.[0]?.count || 0
            const editando = editandoId === lista.id

            return (
              <div key={lista.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all">
                {editando ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={nomeEditado}
                      onChange={e => setNomeEditado(e.target.value)}
                      autoFocus
                      className="w-full p-3 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-bold"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => salvarEdicao(lista.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm">
                        <Save className="size-4" /> Salvar
                      </button>
                      <button onClick={cancelarEdicao}
                        className="flex-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-sm">
                        <X className="size-4" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-lg truncate" title={lista.nome}>
                          {lista.nome}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Criada em {new Date(lista.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                        <span className="text-sm font-bold text-emerald-700">
                          {qtd} {qtd === 1 ? 'lead' : 'leads'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <button onClick={() => inciarEdicao(lista)}
                        className="flex-1 flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-lg text-sm transition-colors">
                        <Edit className="size-4" /> Editar
                      </button>
                      <button onClick={() => deletarLista(lista.id, lista.nome, qtd)}
                        className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 px-3 rounded-lg text-sm transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CRIAR LISTA */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-black text-slate-900">Criar Nova Lista</h2>
              <p className="text-slate-500 text-sm mt-1">Dê um nome para identificar sua lista.</p>
            </div>

            <form onSubmit={criarLista}>
              <div className="p-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Lista *</label>
                <input
                  type="text"
                  value={nomeNovaLista}
                  onChange={e => setNomeNovaLista(e.target.value)}
                  autoFocus
                  required
                  placeholder="Ex: Leads - Ebook Marketing Digital"
                  className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-2">
                  💡 Dica: use nomes descritivos para facilitar depois.
                </p>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando || !nomeNovaLista.trim()}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md disabled:opacity-50 flex items-center gap-2">
                  {salvando ? <Loader2 className="size-5 animate-spin" /> : <><Plus className="size-4" /> Criar Lista</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
