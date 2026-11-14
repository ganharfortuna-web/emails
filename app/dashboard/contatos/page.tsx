'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Search, Filter, Trash2, UserCircle2, MessageCircle, Download, Loader2 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ContatosPage() {
  const [contatos, setContatos] = useState<any[]>([])
  const [listas, setListas] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [filtroLista, setFiltroLista] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  useEffect(() => {
    carregarListas()
  }, [])

  useEffect(() => {
    carregarContatos()
  }, [busca, filtroLista])

  const carregarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome').is('deleted_at', null)
    if (data) setListas(data)
  }

  const carregarContatos = async () => {
    setCarregando(true)
    // Pega os 100 mais recentes. Se tiver filtro, aplica.
    let query = supabase
      .from('contatos')
      .select('*, listas(nome)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filtroLista) query = query.eq('lista_id', filtroLista)
    if (busca) query = query.ilike('email', `%${busca}%`)

    const { data, error } = await query
    if (data) setContatos(data)
    setCarregando(false)
  }

  // ✅ EXCLUSÃO DEFINITIVA (Apaga do Banco e Atualiza a Tela)
  const deletarContato = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar este contato permanentemente do banco de dados?\n\nEle será removido de TODAS as listas.')) return
    
    setDeletandoId(id)
    const { error } = await supabase.from('contatos').delete().eq('id', id)
    
    if (!error) {
      // Atualiza a lista na tela localmente para ser instantâneo
      setContatos(prev => prev.filter(c => c.id !== id))
    } else {
      alert('Erro ao apagar contato: ' + error.message)
    }
    setDeletandoId(null)
  }

  const formatarWhatsApp = (numero: string) => {
    if (!numero) return null
    let numLimpo = numero.replace(/\D/g, '')
    if (numLimpo.length === 10 || numLimpo.length === 11) {
      numLimpo = `55${numLimpo}`
    }
    return `https://wa.me/${numLimpo}`
  }

  const baixarCSV = async () => {
    setExportando(true)
    try {
      let todosContatosExport: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        let query = supabase.from('contatos').select('*, listas(nome)').eq('status', 'ativo').range(page * pageSize, (page + 1) * pageSize - 1)
        if (filtroLista) query = query.eq('lista_id', filtroLista)
        
        const { data, error } = await query
        if (error) throw error

        if (data && data.length > 0) {
          todosContatosExport = [...todosContatosExport, ...data]
          if (data.length < pageSize) hasMore = false
          else page++
        } else {
          hasMore = false
        }
      }

      if (todosContatosExport.length === 0) {
        alert('Nenhum contato ativo para exportar.')
        setExportando(false)
        return
      }

      const cabecalho = "Nome,Email,WhatsApp,Lista,Status\n"
      const linhas = todosContatosExport.map(c => 
        `"${c.nome || ''}","${c.email}","${c.whatsapp || ''}","${c.listas?.nome || ''}","${c.status}"`
      ).join("\n")
      
      const csvContent = "\uFEFF" + cabecalho + linhas
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `contatos_limpos_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (err: any) {
      alert(err.message)
    }
    setExportando(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Contatos</h2>
          <p className="text-slate-600 mt-1">Gerencie a sua base de leads.</p>
        </div>
        
        <button 
          onClick={baixarCSV}
          disabled={exportando || carregando}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {exportando ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {exportando ? 'Gerando...' : 'Baixar CSV'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input 
            type="text" placeholder="Buscar por e-mail..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <select value={filtroLista} onChange={e => setFiltroLista(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none text-slate-800">
            <option value="">Todas as Listas</option>
            {listas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500">
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4 text-center">Lista</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Data</th>
                <th className="px-6 py-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500"><Loader2 className="size-6 animate-spin mx-auto text-blue-500" /></td></tr>
              ) : contatos.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhum contato encontrado.</td></tr>
              ) : (
                contatos.map((c) => {
                  const waLink = formatarWhatsApp(c.whatsapp)
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserCircle2 className="size-10 text-slate-300" />
                          <div>
                            <p className="font-bold text-slate-800">{c.nome || 'Sem nome'}</p>
                            <p className="text-sm text-slate-500">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {waLink ? (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm">
                            <MessageCircle className="size-4" /> {c.whatsapp}
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Não informado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-md">{c.listas?.nome || 'Sem Lista'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-md ${c.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : c.status === 'bounced' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {c.status || 'ativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => deletarContato(c.id)} 
                          disabled={deletandoId === c.id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Apagar contato de vez"
                        >
                          {deletandoId === c.id ? <Loader2 className="size-5 animate-spin" /> : <Trash2 className="size-5" />}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-sm text-slate-500">
          <span>Mostrando os {contatos.length} contatos mais recentes na tela (use o CSV para ver todos)</span>
        </div>
      </div>
    </div>
  )
}
