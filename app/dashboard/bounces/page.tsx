'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { AlertTriangle, CheckCircle2, RotateCcw, Loader2, ShieldAlert, Download } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function BouncesPage() {
  const [suprimidos, setSuprimidos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [reativando, setReativando] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'hard_bounce' | 'soft_bounce' | 'complaint'>('todos')

  useEffect(() => {
    carregarLista()
  }, [])

  const carregarLista = async () => {
    setCarregando(true)
    const { data } = await supabase.from('suppression_list').select('*').order('created_at', { ascending: false })
    if (data) setSuprimidos(data)
    setCarregando(false)
  }

  // Função para Baixar CSV
  const baixarCSV = () => {
    if (suprimidos.length === 0) return

    // Cria o cabeçalho e as linhas do CSV
    const cabecalho = "Email,Motivo,Data\n"
    const linhas = suprimidos.map(s => `${s.email},${s.reason},${new Date(s.created_at).toLocaleDateString('pt-BR')}`).join("\n")
    const csvContent = cabecalho + linhas

    // Cria o arquivo e força o download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `lista_supressao_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const reativarUm = async (email: string) => {
    if (!confirm(`Tem certeza que deseja reativar o e-mail ${email}?`)) return
    
    await supabase.from('suppression_list').delete().eq('email', email)
    await supabase.from('contatos').update({ status: 'ativo', bounce_count: 0 }).eq('email', email)
    
    carregarLista()
  }

  const reativarTodos = async () => {
    if (suprimidos.length === 0) return
    if (!confirm(`⚠️ ATENÇÃO: Tem certeza que deseja reativar TODOS os ${suprimidos.length} e-mails?\n\nSe houver Hard Bounces (e-mails que não existem), a MailerLite pode bloquear sua conta.`)) return

    setReativando(true)
    try {
      const emails = suprimidos.map(s => s.email)
      await supabase.from('suppression_list').delete().in('email', emails)
      await supabase.from('contatos').update({ status: 'ativo', bounce_count: 0 }).in('email', emails)
      alert(`✅ ${emails.length} e-mails foram reativados com sucesso!`)
      carregarLista()
    } catch (e: any) {
      alert("Erro ao reativar: " + e.message)
    }
    setReativando(false)
  }

  // Filtra a lista na tela
  const listaFiltrada = suprimidos.filter(s => filtro === 'todos' ? true : s.reason === filtro)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Bounces e Supressão</h2>
          <p className="text-slate-600 mt-1">Gerencie e-mails que falharam para proteger sua reputação.</p>
        </div>
        
        <button 
          onClick={baixarCSV} 
          disabled={suprimidos.length === 0}
          className="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="size-4" /> Baixar Lista (CSV)
        </button>
      </div>

      {/* ALERTA DE AVISO */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-3">
          <AlertTriangle className="size-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900">Lista de supressão ativa</h3>
            <p className="text-sm text-amber-700 mt-1 max-w-2xl">
              Estes e-mails nunca receberão novas mensagens até serem reativados manualmente. <strong>Recomendamos NÃO reativar Hard Bounces.</strong>
            </p>
          </div>
        </div>
        
        {suprimidos.length > 0 && (
          <button 
            onClick={reativarTodos} 
            disabled={reativando}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
          >
            {reativando ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Reativar todas
          </button>
        )}
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200 w-fit shadow-sm overflow-x-auto">
        <button onClick={() => setFiltro('todos')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${filtro === 'todos' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>Todos</button>
        <button onClick={() => setFiltro('hard_bounce')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${filtro === 'hard_bounce' ? 'bg-red-100 text-red-700' : 'text-slate-500 hover:bg-slate-50'}`}>Hard Bounce</button>
        <button onClick={() => setFiltro('soft_bounce')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${filtro === 'soft_bounce' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-50'}`}>Soft Bounce</button>
      </div>

      {/* TABELA */}
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
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500"><Loader2 className="size-6 animate-spin mx-auto text-blue-500" /></td></tr>
              ) : listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">
                    <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
                    Nenhum e-mail encontrado neste filtro.
                  </td>
                </tr>
              ) : (
                listaFiltrada.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{s.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold border ${s.reason === 'hard_bounce' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        {s.reason === 'hard_bounce' ? 'Hard Bounce' : s.reason === 'complaint' ? 'Spam/Reclamação' : 'Soft Bounce'}
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
      </div>
    </div>
  )
}
