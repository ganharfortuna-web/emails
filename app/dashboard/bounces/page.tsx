'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { AlertTriangle, CheckCircle2, RotateCcw, Loader2, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function BouncesPage() {
  const [suprimidos, setSuprimidos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [reativando, setReativando] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'hard_bounce' | 'soft_bounce' | 'complaint'>('todos')
  
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [deletandoTodos, setDeletandoTodos] = useState(false)
  const pageSize = 100

  useEffect(() => {
    carregarLista()
  }, [page, filtro])

  const carregarLista = async () => {
    setCarregando(true)
    
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('suppression_list')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filtro !== 'todos') {
      query = query.eq('reason', filtro)
    }

    const { data, count, error } = await query

    if (!error && data) {
      if (data.length === 0 && page > 0 && (count || 0) > 0) {
        setPage(page - 1)
        return
      }
      setSuprimidos(data)
      setTotalCount(count || 0)
    }
    setCarregando(false)
  }

  const baixarCSV = async () => {
    if (totalCount === 0) return
    setCarregando(true)

    let todosExport: any[] = []
    let currentPage = 0
    let hasMore = true

    while (hasMore) {
      const from = currentPage * 1000
      const to = from + 999
      
      let query = supabase.from('suppression_list').select('*').order('created_at', { ascending: false }).range(from, to)
      if (filtro !== 'todos') query = query.eq('reason', filtro)

      const { data } = await query
      if (data && data.length > 0) {
        todosExport = [...todosExport, ...data]
        if (data.length < 1000) hasMore = false
        else currentPage++
      } else {
        hasMore = false
      }
    }

    const cabecalho = "Email,Motivo,Data\n"
    const linhas = todosExport.map(s => `${s.email},${s.reason},${new Date(s.created_at).toLocaleDateString('pt-BR')}`).join("\n")
    const csvContent = "\uFEFF" + cabecalho + linhas
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `lista_supressao_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setCarregando(false)
  }

  const reativarUm = async (email: string) => {
    if (!confirm(`Tem certeza que deseja reativar o e-mail ${email}?`)) return
    
    setCarregando(true)
    await supabase.from('suppression_list').delete().eq('email', email)
    await supabase.from('contatos').update({ status: 'ativo', bounce_count: 0 }).eq('email', email)
    
    alert(`✅ E-mail ${email} reativado!\n\nEle foi removido da lista de bloqueio e voltou para a aba de "Contatos".`)
    carregarLista()
  }

  const reativarTodos = async () => {
    if (totalCount === 0) return
    if (!confirm(`⚠️ ATENÇÃO: Tem certeza que deseja reativar TODOS os ${totalCount} e-mails?\n\nRecomendamos reativar apenas se tiver certeza de que são válidos.`)) return

    setReativando(true)
    try {
      let emails: string[] = []
      let currentPage = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase.from('suppression_list').select('email').range(currentPage * 1000, (currentPage + 1) * 1000 - 1)
        if (filtro !== 'todos') query = query.eq('reason', filtro)
        
        const { data } = await query
        if (data && data.length > 0) {
          emails = [...emails, ...data.map(d => d.email)]
          if (data.length < 1000) hasMore = false
          else currentPage++
        } else { hasMore = false }
      }

      if (emails.length > 0) {
        for (let i = 0; i < emails.length; i += 500) {
          const bloco = emails.slice(i, i + 500)
          await supabase.from('suppression_list').delete().in('email', bloco)
          await supabase.from('contatos').update({ status: 'ativo', bounce_count: 0 }).in('email', bloco)
        }
      }
      
      alert(`✅ ${emails.length} e-mails foram reativados com sucesso!`)
      setPage(0)
      carregarLista()
    } catch (e: any) {
      alert("Erro ao reativar: " + e.message)
    }
    setReativando(false)
  }

  const apagarTudo = async () => {
    if (!confirm("🚨 CUIDADO EXTREMO! 🚨\n\nVocê está prestes a apagar TODOS os registros da lista de supressão.\nIsso significa que esses e-mails não estarão mais bloqueados (a menos que estejam na lista de contatos com status bounced).\n\nTem certeza absoluta que deseja apagar TUDO?")) return
    
    setDeletandoTodos(true)
    try {
      await supabase.from('suppression_list').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      alert("✅ Lista de supressão esvaziada com sucesso!")
      setPage(0)
      carregarLista()
    } catch (err: any) {
      alert("Erro ao apagar lista: " + err.message)
    }
    setDeletandoTodos(false)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Bounces e Supressão</h2>
          <p className="text-slate-600 mt-1">Gerencie e-mails que falharam para proteger sua reputação.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={apagarTudo} 
            disabled={totalCount === 0 || deletandoTodos}
            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {deletandoTodos ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Apagar Tudo
          </button>

          <button 
            onClick={baixarCSV} 
            disabled={totalCount === 0 || carregando}
            className="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="size-4" /> Baixar CSV
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-3">
          <AlertTriangle className="size-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900">Lista de supressão ativa</h3>
            <p className="text-sm text-amber-700 mt-1 max-w-2xl">
              Estes e-mails nunca receberão novas mensagens até serem reativados. <strong>Recomendamos NÃO reativar Hard Bounces.</strong>
            </p>
          </div>
        </div>
        
        {totalCount > 0 && (
          <button 
            onClick={reativarTodos} 
            disabled={reativando}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
          >
            {reativando ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Reativar Todos
          </button>
        )}
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200 w-fit shadow-sm overflow-x-auto">
        <button onClick={() => { setFiltro('todos'); setPage(0); }} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filtro === 'todos' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>Todos</button>
        <button onClick={() => { setFiltro('hard_bounce'); setPage(0); }} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filtro === 'hard_bounce' ? 'bg-red-100 text-red-700' : 'text-slate-500 hover:bg-slate-50'}`}>Hard Bounce</button>
        <button onClick={() => { setFiltro('soft_bounce'); setPage(0); }} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filtro === 'soft_bounce' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-50'}`}>Soft Bounce</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500">
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Motivo</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500"><Loader2 className="size-6 animate-spin mx-auto text-blue-500" /></td></tr>
              ) : suprimidos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                    <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
                    Nenhum e-mail encontrado nesta seleção.
                  </td>
                </tr>
              ) : (
                suprimidos.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{s.email}</td>
                    <td className="px-6 py-4">
                      {/* 🛑 CORREÇÃO AQUI: Renderização exata do motivo */}
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold border ${
                        s.reason === 'hard_bounce' ? 'bg-red-50 text-red-700 border-red-100' : 
                        s.reason === 'complaint' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                        s.reason === 'soft_bounce' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {s.reason === 'hard_bounce' ? 'Hard Bounce' : 
                         s.reason === 'complaint' ? 'Spam/Reclamação' : 
                         s.reason === 'soft_bounce' ? 'Soft Bounce' : 
                         s.reason /* Mostra o valor bruto se for desconhecido */}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(s.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => reativarUm(s.email)} className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center justify-center gap-1 mx-auto">
                        <RotateCcw className="size-3" /> Reativar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-500 font-medium">
              Mostrando de <strong>{page * pageSize + 1}</strong> a <strong>{Math.min((page + 1) * pageSize, totalCount)}</strong> de <strong>{totalCount}</strong> registros.
            </span>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))} 
                disabled={page === 0 || carregando}
                className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="size-5" />
              </button>
              
              <span className="text-sm font-bold text-slate-700 px-3">
                Página {page + 1} de {totalPages}
              </span>
              
              <button 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} 
                disabled={page >= totalPages - 1 || carregando}
                className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
