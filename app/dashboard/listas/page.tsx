"use client"

import { useState, useEffect } from 'react'
import { Plus, Users, ArrowRight, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Inicialização do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ListasPage() {
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Estados para o modo de criação
  const [modoCriacao, setModoCriacao] = useState(false)
  const [nomeNovaLista, setNomeNovaLista] = useState('')

  useEffect(() => {
    buscarListas()
  }, [])

  const buscarListas = async () => {
    setCarregando(true)
    
    // Busca as listas e já conta automaticamente quantos contatos tem em cada uma!
    const { data, error } = await supabase
      .from('listas')
      .select('*, contatos(count)')
      .order('created_at', { ascending: false })
    
    if (data) {
      setListas(data)
    }
    setCarregando(false)
  }

  const salvarNovaLista = async () => {
    if (!nomeNovaLista.trim()) return

    const { error } = await supabase
      .from('listas')
      .insert([{ nome: nomeNovaLista }])

    if (!error) {
      setNomeNovaLista('')
      setModoCriacao(false)
      buscarListas() // Atualiza a tabela com a nova lista
    } else {
      alert('Erro ao criar lista. Verifique a conexão.')
    }
  }

  const deletarLista = async (id: number) => {
    if (!confirm('Tem certeza que deseja apagar esta lista?')) return

    const { error } = await supabase
      .from('listas')
      .delete()
      .eq('id', id)

    if (!error) {
      buscarListas() // Atualiza a tabela removendo a lista
    } else {
      alert('Erro ao deletar. Verifique se não há contatos presos a ela.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            Gestão de Listas
          </h2>
          <p className="text-lg text-slate-600 mt-2">
            Organize seus contatos e leads para direcionar suas campanhas de forma estratégica.
          </p>
        </div>
        
        <button 
          onClick={() => setModoCriacao(!modoCriacao)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <Plus className="size-5" />
          Criar Nova Lista
        </button>
      </div>

      {/* ÁREA DE CRIAÇÃO (Aparece ao clicar no botão acima) */}
      {modoCriacao && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl mb-8 flex flex-col sm:flex-row items-center gap-4 transition-all">
          <input
            type="text"
            value={nomeNovaLista}
            onChange={e => setNomeNovaLista(e.target.value)}
            placeholder="Digite o nome da nova lista (Ex: Alunos Masterclass 2026)"
            className="flex-1 w-full p-4 rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && salvarNovaLista()}
          />
          <div className="flex w-full sm:w-auto gap-3">
            <button 
              onClick={salvarNovaLista} 
              className="flex-1 sm:flex-none bg-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Salvar Lista
            </button>
            <button 
              onClick={() => { setModoCriacao(false); setNomeNovaLista(''); }} 
              className="flex-1 sm:flex-none bg-white text-slate-600 font-bold py-4 px-6 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* LISTAS EXISTENTES (Tabela) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="p-6 font-bold">Nome da Lista</th>
              <th className="p-6 font-bold">Total de Leads</th>
              <th className="p-6 font-bold">Último Envio</th>
              <th className="p-6 font-bold">Ação</th>
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
            ) : listas.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-slate-500 text-lg">
                  Você ainda não possui nenhuma lista. Clique no botão azul acima para criar a primeira!
                </td>
              </tr>
            ) : (
              listas.map((lista) => (
                <tr key={lista.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 font-bold text-slate-900 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Users className="size-5 text-blue-700" />
                    </div>
                    {lista.nome}
                  </td>
                  
                  {/* Puxa a contagem real de contatos ligados a esta lista no banco */}
                  <td className="p-6 text-slate-600 font-medium text-lg">
                    {lista.contatos[0]?.count || 0}
                  </td>
                  
                  <td className="p-6 text-slate-400 text-sm italic">
                    Aguardando disparos...
                  </td>
                  
                  <td className="p-6">
                    <div className="flex items-center gap-6">
                      <button className="text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1 transition-colors">
                        Ver contatos <ArrowRight className="size-4" />
                      </button>
                      
                      <button 
                        onClick={() => deletarLista(lista.id)}
                        className="text-slate-300 hover:text-red-600 transition-colors" 
                        title="Deletar Lista"
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