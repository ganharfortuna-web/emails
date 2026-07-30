"use client"

import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Loader2, UserCircle, Filter, Eraser, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ContatosPage() {
  const [contatos, setContatos] = useState<any[]>([])
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // PAGINAÇÃO
  const [pagina, setPagina] = useState(1)
  const [totalContatos, setTotalContatos] = useState(0)
  const itensPorPagina = 50

  const [busca, setBusca] = useState('')
  const [filtroLista, setFiltroLista] = useState('todas')

  const [modalAberto, setModalAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaListaId, setNovaListaId] = useState('')
  const [salvando, setSalvando] = useState(false)

  // MODAL LIMPEZA DE FRIOS
  const [modalLimpeza, setModalLimpeza] = useState(false)
  const [mesesFrios, setMesesFrios] = useState(3)
  const [limpando, setLimpando] = useState(false)

  useEffect(() => {
    buscarListas()
  }, [])

  // Recarrega sempre que mudar a página, a busca ou o filtro
  useEffect(() => {
    buscarContatos()
  }, [pagina, filtroLista, busca]) 

  const buscarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome').order('nome')
    if (data) setListas(data)
  }

  const buscarContatos = async () => {
    setCarregando(true)
    
    // Configura a query para trazer os dados e a CONTAGEM TOTAL exata
    let query = supabase.from('contatos').select('*, listas(nome)', { count: 'exact' })

    if (filtroLista !== 'todas') query = query.eq('lista_id', filtroLista)
    if (busca) query = query.ilike('email', `%${busca}%`) // Busca no banco de dados

    // Lógica da Paginação Matemática
    const de = (pagina - 1) * itensPorPagina
    const ate = de + itensPorPagina - 1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(de, ate)
    
    if (data) setContatos(data)
    if (count !== null) setTotalContatos(count)
      
    setCarregando(false)
  }

  const salvarContato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoEmail.trim() || !novaListaId) return
    setSalvando(true)

    const { error } = await supabase.from('contatos').insert([{ 
      nome: novoNome || 'Lead Manual', email: novoEmail.toLowerCase(), lista_id: novaListaId
    }])

    if (!error) {
      setNovoNome(''); setNovoEmail(''); setNovaListaId(''); setModalAberto(false); buscarContatos()
    } else {
      alert('Erro ao salvar contato.')
    }
    setSalvando(false)
  }

  const deletarContato = async (id: number) => {
    if (!confirm('Tem certeza que deseja apagar este contato permanentemente?')) return
    const { error } = await supabase.from('contatos').delete().eq('id', id)
    if (!error) buscarContatos()
  }

  // --- FUNÇÃO DA VASSOURA (Limpeza de Frios) ---
  const executarLimpezaFrios = async () => {
    setLimpando(true)
    const dataLimite = new Date()
    dataLimite.setMonth(dataLimite.getMonth() - mesesFrios)

    // Deleta do banco todos que foram criados antes da data limite
    const { error, count } = await supabase
      .from('contatos')
      .delete()
      .lt('created_at', dataLimite.toISOString())

    if (!error) {
      alert(`Limpeza concluída! Contatos antigos removidos com sucesso.`)
      setModalLimpeza(false)
      setPagina(1) // Volta pra página 1
      buscarContatos()
    } else {
      alert('Erro ao realizar a limpeza.')
    }
    setLimpando(false)
  }

  const totalPaginas = Math.ceil(totalContatos / itensPorPagina) || 1

  return (
    <div className="max-w-6xl mx-auto relative">
      
      {/* MODAL ADICIONAR CONTATO MANUAL */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-black text-slate-900">Adicionar Contato</h2>
              <p className="text-slate-500 text-sm mt-1">Insira um lead manualmente no sistema.</p>
            </div>
            
            <form onSubmit={salvarContato}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome</label>
                  <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: João Silva" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">E-mail *</label>
                  <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="joao@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Salvar na Lista *</label>
                  <select value={novaListaId} onChange={e => setNovaListaId(e.target.value)} required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
                    <option value="" disabled>Selecione uma lista...</option>
                    {listas.map(l => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={() => setModalAberto(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md disabled:opacity-50 flex items-center gap-2">
                  {salvando ? <Loader2 className="size-5 animate-spin" /> : 'Salvar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIMPEZA DE FRIOS */}
      {modalLimpeza && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-rose-100 bg-rose-50 flex items-center gap-4">
              <div className="bg-rose-200 p-3 rounded-full text-rose-700"><Eraser className="size-6" /></div>
              <div>
                <h2 className="text-xl font-black text-rose-900">Limpeza de Base (Frios)</h2>
                <p className="text-rose-700 text-sm mt-1">Exclua leads antigos para proteger a saúde do seu domínio.</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-600 text-sm font-medium">Selecione abaixo o período de inatividade. Contatos adicionados antes desse período serão excluídos da base.</p>
              <div>
                <select value={mesesFrios} onChange={e => setMesesFrios(Number(e.target.value))} className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-rose-500 bg-white font-bold text-slate-700">
                  <option value={1}>Mais de 1 Mês</option>
                  <option value={2}>Mais de 2 Meses</option>
                  <option value={3}>Mais de 3 Meses (Recomendado)</option>
                  <option value={6}>Mais de 6 Meses</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setModalLimpeza(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={executarLimpezaFrios} disabled={limpando} className="px-6 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md disabled:opacity-50 flex items-center gap-2">
                {limpando ? <Loader2 className="size-5 animate-spin" /> : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Base de Contatos</h2>
          <p className="text-lg text-slate-600 mt-2">Gerencie todos os seus leads. Total na base: <strong>{totalContatos}</strong></p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => setModalLimpeza(true)} className="flex items-center gap-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-3 px-5 rounded-lg transition-colors shadow-sm shrink-0">
            <Eraser className="size-5" /> Limpar Base
          </button>
          <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg transition-colors shadow-sm shrink-0">
            <Plus className="size-5" /> Adicionar
          </button>
        </div>
      </div>

      {/* BARRA DE FERRAMENTAS (Filtros e Busca) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input 
            type="text" 
            placeholder="Buscar por e-mail... (Aperte Enter)" 
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1) }}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          />
        </div>
        
        <div className="flex items-center gap-2 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
          <Filter className="size-5 text-slate-400" />
          <select 
            value={filtroLista} 
            onChange={(e) => { setFiltroLista(e.target.value); setPagina(1) }}
            className="bg-transparent outline-none text-slate-700 font-bold cursor-pointer"
          >
            <option value="todas">Todas as Listas</option>
            {listas.map(lista => (
              <option key={lista.id} value={lista.id}>{lista.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABELA DE CONTATOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 whitespace-nowrap">
                <th className="p-6 font-bold">Contato</th>
                <th className="p-6 font-bold">Pertence à Lista</th>
                <th className="p-6 font-bold text-center">Data de Entrada</th>
                <th className="p-6 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {carregando ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-blue-600">
                    <div className="flex justify-center"><Loader2 className="size-8 animate-spin" /></div>
                  </td>
                </tr>
              ) : contatos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500 text-lg">
                    Nenhum contato encontrado nesta página.
                  </td>
                </tr>
              ) : (
                contatos.map((contato) => (
                  <tr key={contato.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-full hidden sm:block">
                          <UserCircle className="size-8 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{contato.nome}</p>
                          <p className="text-sm text-slate-500 truncate">{contato.email}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-6">
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                        {contato.listas?.nome || 'Lista Excluída'}
                      </span>
                    </td>
                    
                    <td className="p-6 text-slate-500 text-sm font-medium text-center whitespace-nowrap">
                      {new Date(contato.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    
                    <td className="p-6 text-right">
                      <button 
                        onClick={() => deletarContato(contato.id)}
                        className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors inline-flex" 
                        title="Deletar Contato"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}

            </tbody>
          </table>
        </div>
        
        {/* --- CONTROLES DE PAGINAÇÃO --- */}
        {!carregando && totalContatos > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-bold hidden sm:block">
              Exibindo {((pagina - 1) * itensPorPagina) + 1} a {Math.min(pagina * itensPorPagina, totalContatos)} de {totalContatos} leads.
            </p>
            
            <div className="flex items-center gap-4 mx-auto sm:mx-0">
              <button 
                onClick={() => setPagina(p => p - 1)} 
                disabled={pagina === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                <ChevronLeft className="size-4" /> Anterior
              </button>
              
              <span className="text-sm font-bold text-slate-700">
                Página {pagina} de {totalPaginas}
              </span>
              
              <button 
                onClick={() => setPagina(p => p + 1)} 
                disabled={pagina >= totalPaginas}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                Próxima <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}