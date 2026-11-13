'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Search, Filter, Trash2, UserCircle2, MessageCircle } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ContatosPage() {
  const [contatos, setContatos] = useState<any[]>([])
  const [listas, setListas] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [filtroLista, setFiltroLista] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarListas()
    carregarContatos()
  }, [])

  const carregarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome')
    if (data) setListas(data)
  }

  const carregarContatos = async () => {
    setCarregando(true)
    let query = supabase.from('contatos').select('*, listas(nome)').order('created_at', { ascending: false })

    if (filtroLista) query = query.eq('lista_id', filtroLista)
    if (busca) query = query.ilike('email', `%${busca}%`)

    const { data } = await query
    if (data) setContatos(data)
    setCarregando(false)
  }

  // Recarrega quando muda o filtro ou busca
  useEffect(() => {
    carregarContatos()
  }, [busca, filtroLista])

  const deletarContato = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar este contato?')) return
    await supabase.from('contatos').delete().eq('id', id)
    carregarContatos()
  }

  // Função para formatar o link do WhatsApp
  const formatarWhatsApp = (numero: string) => {
    if (!numero) return null
    // Remove tudo que não é número
    let numLimpo = numero.replace(/\D/g, '')
    
    // Se o número tiver 10 ou 11 dígitos (DDD + número), adiciona o 55 do Brasil
    if (numLimpo.length === 10 || numLimpo.length === 11) {
      numLimpo = `55${numLimpo}`
    }
    
    return `https://wa.me/${numLimpo}`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-black text-slate-900">Contatos</h2>
        <p className="text-slate-600 mt-1">Gerencie a sua base de leads.</p>
      </div>

      {/* BARRA DE BUSCA E FILTRO */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input 
            type="text" 
            placeholder="Buscar por e-mail..." 
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <select 
            value={filtroLista}
            onChange={e => setFiltroLista(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
          >
            <option value="">Todas as Listas</option>
            {listas.map(l => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABELA DE CONTATOS */}
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
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Carregando contatos...</td>
                </tr>
              ) : contatos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhum contato encontrado.</td>
                </tr>
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
                      
                      {/* COLUNA NOVA DO WHATSAPP */}
                      <td className="px-6 py-4">
                        {waLink ? (
                          <a 
                            href={waLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
                          >
                            <MessageCircle className="size-4" />
                            {c.whatsapp}
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Não informado</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-md">
                          {c.listas?.nome || c.lista_id || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-md ${
                          c.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 
                          c.status === 'bounced' ? 'bg-red-100 text-red-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {c.status || 'ativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => deletarContato(c.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Apagar contato"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* RODAPÉ DA TABELA */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-sm text-slate-500">
          <span>Mostrando {contatos.length} contato(s)</span>
        </div>
      </div>
    </div>
  )
}
