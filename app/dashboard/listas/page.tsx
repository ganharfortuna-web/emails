"use client"

import { useState, useEffect } from 'react'
import { Plus, Users, ArrowRight, Trash2, Loader2, UploadCloud, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Inicialização do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ListasPage() {
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Estados para o modo de criação de lista
  const [modoCriacao, setModoCriacao] = useState(false)
  const [nomeNovaLista, setNomeNovaLista] = useState('')

  // Estados para o Modal de Importação de Contatos
  const [modalImportacao, setModalImportacao] = useState({ aberto: false, listaId: null as number | null, listaNome: '' })
  const [textoImportacao, setTextoImportacao] = useState('')
  const [importando, setImportando] = useState(false)

  useEffect(() => {
    buscarListas()
  }, [])

  const buscarListas = async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('listas')
      .select('*, contatos(count)')
      .order('created_at', { ascending: false })
    
    if (data) setListas(data)
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
      buscarListas() 
    } else {
      alert('Erro ao criar lista. Verifique a conexão.')
    }
  }

  const deletarLista = async (id: number) => {
    if (!confirm('Tem certeza que deseja apagar esta lista? Os contatos dentro dela também poderão ser afetados.')) return

    const { error } = await supabase
      .from('listas')
      .delete()
      .eq('id', id)

    if (!error) {
      buscarListas() 
    } else {
      alert('Erro ao deletar. Tente novamente.')
    }
  }

  // --- NOVA FUNÇÃO: PROCESSAR IMPORTAÇÃO ---
  const processarImportacao = async () => {
    if (!textoImportacao.trim() || !modalImportacao.listaId) return
    setImportando(true)

    // Separa o texto por quebras de linha e remove os espaços vazios
    const linhas = textoImportacao.split('\n').map(l => l.trim()).filter(l => l !== '')
    
    const novosContatos = linhas.map(linha => {
      const isEmail = linha.includes('@')
      return {
        nome: 'Lead Importado', // Por padrão, salva como lead importado
        email: isEmail ? linha : `sem-email-${Math.random().toString(36).substring(2,8)}@importado.com`,
        lista_id: modalImportacao.listaId // Vincula o lead à lista exata que você escolheu
      }
    })

    if (novosContatos.length === 0) {
      alert('Nenhum dado válido encontrado para importar.')
      setImportando(false)
      return
    }

    // Insere todos os contatos de uma vez só no banco de dados!
    const { error } = await supabase.from('contatos').insert(novosContatos)

    if (error) {
      alert('Erro ao importar contatos.')
      console.error(error)
    } else {
      alert(`${novosContatos.length} contatos importados com sucesso!`)
      setModalImportacao({ aberto: false, listaId: null, listaNome: '' })
      setTextoImportacao('')
      buscarListas() // Recarrega a tabela para atualizar a contagem de Leads
    }
    
    setImportando(false)
  }

  return (
    <div className="max-w-6xl mx-auto relative">
      
      {/* --- MODAL DE IMPORTAÇÃO (Sobrepõe a tela quando aberto) --- */}
      {modalImportacao.aberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            
            <div className="p-5 border-b border-slate-100 bg-blue-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-blue-900">📥 Importar Leads</h2>
                <p className="text-blue-700 text-xs mt-1">
                  Adicionando na lista: <strong>{modalImportacao.listaNome}</strong>
                </p>
              </div>
              <button 
                onClick={() => setModalImportacao({ aberto: false, listaId: null, listaNome: '' })} 
                className="text-blue-400 hover:text-blue-700 transition-colors p-1"
              >
                <X className="size-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-2 font-bold">Cole os e-mails (1 por linha):</p>
              <textarea 
                rows={8} 
                className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-slate-700 bg-slate-50"
                placeholder="exemplo@gmail.com&#10;contato@empresa.com.br&#10;..."
                value={textoImportacao}
                onChange={(e) => setTextoImportacao(e.target.value)}
                autoFocus
              />
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setModalImportacao({ aberto: false, listaId: null, listaNome: '' })} 
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={processarImportacao} 
                disabled={importando || !textoImportacao.trim()} 
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {importando ? (
                  <><Loader2 className="size-5 animate-spin" /> Importando...</>
                ) : (
                  <><UploadCloud className="size-5" /> Importar Contatos</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}


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

      {/* ÁREA DE CRIAÇÃO */}
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
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 whitespace-nowrap">
              <th className="p-6 font-bold">Nome da Lista</th>
              <th className="p-6 font-bold text-center">Total de Leads</th>
              <th className="p-6 font-bold">Último Envio</th>
              <th className="p-6 font-bold text-right">Ações</th>
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
                    <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                      <Users className="size-5 text-blue-700" />
                    </div>
                    {lista.nome}
                  </td>
                  
                  <td className="p-6 text-slate-600 font-medium text-lg text-center">
                    {lista.contatos[0]?.count || 0}
                  </td>
                  
                  <td className="p-6 text-slate-400 text-sm italic whitespace-nowrap">
                    Aguardando disparos...
                  </td>
                  
                  <td className="p-6">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      
                      {/* NOVO BOTÃO: Importar */}
                      <button 
                        onClick={() => setModalImportacao({ aberto: true, listaId: lista.id, listaNome: lista.nome })}
                        className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors border border-emerald-100 shadow-sm"
                        title="Importar Contatos"
                      >
                        <UploadCloud className="size-4" /> 
                        <span className="hidden xl:inline">Importar</span>
                      </button>

                      {/* Botão Ver Contatos */}
                      <button className="text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors border border-blue-100 shadow-sm">
                        <span className="hidden xl:inline">Ver contatos</span> 
                        <ArrowRight className="size-4" />
                      </button>
                      
                      <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

                      <button 
                        onClick={() => deletarLista(lista.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" 
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