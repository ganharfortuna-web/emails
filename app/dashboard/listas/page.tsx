"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Users, ArrowRight, Trash2, Loader2, UploadCloud, X, FileText } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

// Inicialização do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipagem rigorosa para agradar o TypeScript
type ContatoImportado = {
  nome: string
  email: string
  lista_id: number
}

type ModalImportacao = {
  aberto: boolean
  listaId: number | null
  listaNome: string
}

export default function ListasPage() {
  const router = useRouter()
  
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Estados para o modo de criação de lista
  const [modoCriacao, setModoCriacao] = useState(false)
  const [nomeNovaLista, setNomeNovaLista] = useState('')

  // Estados para o Modal de Importação de Contatos
  const [modalImportacao, setModalImportacao] = useState<ModalImportacao>({ aberto: false, listaId: null, listaNome: '' })
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

  // --- EXCLUSÃO CORRIGIDA (EFEITO CASCATA) ---
  const deletarLista = async (id: number) => {
    if (!confirm('🚨 ATENÇÃO: Apagar esta lista também apagará TODOS os contatos que estão dentro dela. Tem certeza?')) return

    // 1º Passo: Apaga os contatos vinculados a esta lista para liberar a trava do banco
    await supabase.from('contatos').delete().eq('lista_id', id)

    // 2º Passo: Apaga a lista vazia
    const { error } = await supabase.from('listas').delete().eq('id', id)

    if (!error) {
      buscarListas() 
    } else {
      alert('Erro ao deletar a lista. Tente novamente.')
      console.error(error)
    }
  }

  const lidarComUploadArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const conteudo = event.target?.result as string
      if (!conteudo) return

      const regexEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      const emailsEncontrados = conteudo.match(regexEmail) || []

      if (emailsEncontrados.length === 0) {
        alert('Nenhum e-mail válido foi encontrado dentro deste arquivo.')
        return
      }

      const emailsUnicos = emailsEncontrados.filter((email, index, array) => array.indexOf(email) === index)
      const textoAtual = textoImportacao.trim()
      const novosEmailsFormatados = emailsUnicos.join('\n')
      
      setTextoImportacao(textoAtual ? `${textoAtual}\n${novosEmailsFormatados}` : novosEmailsFormatados)
      
      alert(`🎉 Sucesso! O sistema filtrou ${emailsUnicos.length} e-mails limpos do seu arquivo. Revise a lista abaixo.`)
    }
    
    reader.readAsText(file)
    e.target.value = ''
  }

  const processarImportacao = async () => {
    if (!textoImportacao.trim() || !modalImportacao.listaId) return
    setImportando(true)

    const linhas = textoImportacao.split('\n')
    const regexEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

    const novosContatos: ContatoImportado[] = []
    const emailsJaAdicionados = new Set<string>() 

    for (const linha of linhas) {
      const match = linha.match(regexEmail)
      if (match) {
        const emailLimpo = match[0].toLowerCase()
        if (!emailsJaAdicionados.has(emailLimpo)) {
          emailsJaAdicionados.add(emailLimpo)
          novosContatos.push({
            nome: 'Lead Importado', 
            email: emailLimpo,
            lista_id: modalImportacao.listaId 
          })
        }
      }
    }

    if (novosContatos.length === 0) {
      alert('Nenhum e-mail válido foi encontrado nesse texto para importar.')
      setImportando(false)
      return
    }

    const { error } = await supabase.from('contatos').insert(novosContatos)

    if (error) {
      alert('Erro ao importar. O banco de dados recusou.')
      console.error(error)
    } else {
      alert(`🎉 Sucesso! ${novosContatos.length} e-mails puros foram importados!`)
      setModalImportacao({ aberto: false, listaId: null, listaNome: '' })
      setTextoImportacao('')
      buscarListas() 
    }
    
    setImportando(false)
  }

  return (
    <div className="max-w-6xl mx-auto relative">
      
      {/* MODAL DE IMPORTAÇÃO */}
      {modalImportacao.aberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            
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
              
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Extrator Inteligente</h3>
                  <p className="text-xs text-slate-500 mt-1">Envie um arquivo e o sistema vai garimpar apenas os e-mails.</p>
                </div>
                
                <label className="cursor-pointer bg-white text-blue-700 hover:bg-blue-50 font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors border border-blue-200 shadow-sm shrink-0">
                  <FileText className="size-4" />
                  Selecionar Arquivo (.txt, .csv)
                  <input type="file" accept=".txt,.csv" className="hidden" onChange={lidarComUploadArquivo} />
                </label>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600 font-bold">Cole manualmente ou revise os e-mails extraídos:</p>
                <span className="text-xs text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-md">1 por linha</span>
              </div>
              
              <textarea 
                rows={8} 
                className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-slate-700 bg-white"
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
            className="bg-white flex-1 w-full p-4 rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
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
                      
                      {/* BOTÃO: Importar */}
                      <button 
                        onClick={() => setModalImportacao({ aberto: true, listaId: lista.id, listaNome: lista.nome })}
                        className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors border border-emerald-100 shadow-sm"
                        title="Importar Contatos"
                      >
                        <UploadCloud className="size-4" /> 
                        <span className="hidden xl:inline">Importar</span>
                      </button>

                      {/* --- BOTÃO VER CONTATOS CORRIGIDO --- */}
                      <button 
                        onClick={() => router.push('/dashboard/contatos')}
                        className="text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors border border-blue-100 shadow-sm cursor-pointer"
                      >
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