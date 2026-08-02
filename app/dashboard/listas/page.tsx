'use client'

import React, { useState, useEffect } from 'react'
import { Search, Trash2, Loader2, Mail, UserX } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ContatosPage() {
  const [contatos, setContatos] = useState<any[]>([])
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [listaSelecionada, setListaSelecionada] = useState('todas')

  useEffect(() => {
    carregarDados()
  }, [listaSelecionada])

  const carregarDados = async () => {
    setCarregando(true)

    // Busca as listas para o Dropdown de filtro
    const { data: listasData } = await supabase.from('listas').select('id, nome').order('nome')
    if (listasData) setListas(listasData)

    // Busca os contatos e traz o nome da lista junto (relacionamento)
    let query = supabase.from('contatos').select('*, listas(nome)').order('created_at', { ascending: false })

    if (listaSelecionada !== 'todas') {
      query = query.eq('lista_id', listaSelecionada)
    }

    const { data: contatosData } = await query
    if (contatosData) setContatos(contatosData)

    setCarregando(false)
  }

  const deletarContato = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato permanentemente?')) return
    
    const { error } = await supabase.from('contatos').delete().eq('id', id)
    if (!error) {
      carregarDados()
    } else {
      alert('Erro ao excluir contato.')
    }
  }

  const contatosFiltrados = contatos.filter(c => 
    c.email.toLowerCase().includes(busca.toLowerCase()) || 
    c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto relative">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            Gestão de Contatos
          </h2>
          <p className="text-lg text-slate-600 mt-2">
            Visualize, filtre e gerencie todos os leads cadastrados na sua plataforma.
          </p>
        </div>
      </div>

      {/* BARRA DE FERRAMENTAS E FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 mb-6">
        
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="size-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por e-mail ou nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700 transition-all"
          />
        </div>

        {/* Filtro por Lista */}
        <div className="sm:w-72 shrink-0">
          <select
            value={listaSelecionada}
            onChange={(e) => setListaSelecionada(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-700 cursor-pointer"
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 whitespace-nowrap">
              <th className="p-5 font-bold">Contato (E-mail)</th>
              <th className="p-5 font-bold">Lista de Origem</th>
              <th className="p-5 font-bold text-center">Status</th>
              <th className="p-5 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            
            {carregando ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-blue-600">
                  <div className="flex justify-center">
                    <Loader2 className="size-8 animate-spin" />
                  </div>
                </td>
              </tr>
            ) : contatosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                  <UserX className="size-12 text-slate-300 mb-3" />
                  <p className="text-lg font-bold text-slate-600">Nenhum contato encontrado.</p>
                  <p className="text-sm mt-1">Tente ajustar a busca ou importe novos leads na aba de Listas.</p>
                </td>
              </tr>
            ) : (
              contatosFiltrados.map((contato) => (
                <tr key={contato.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-5 font-bold text-slate-900 flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg shrink-0">
                      <Mail className="size-4 text-emerald-700" />
                    </div>
                    <div>
                      <p>{contato.email}</p>
                      <p className="text-xs text-slate-400 font-normal">{contato.nome}</p>
                    </div>
                  </td>
                  
                  <td className="p-5 text-slate-600 font-medium text-sm">
                    <span className="bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                      {contato.listas?.nome || 'Lista Excluída'}
                    </span>
                  </td>

                  <td className="p-5 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide ${contato.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      {contato.status || 'Ativo'}
                    </span>
                  </td>
                  
                  <td className="p-5">
                    <div className="flex items-center justify-end">
                      <button 
                        onClick={() => deletarContato(contato.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" 
                        title="Deletar Contato"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}

          </tbody>
        </table>
      </div>
      
    </div>
  )
}