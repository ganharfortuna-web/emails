"use client"

import { useState, useEffect } from 'react'
import { Send, Clock, Mail, LayoutTemplate, CheckCircle2, Loader2, Hourglass } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function AutomacoesPage() {
  const [listas, setListas] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([]) // 🗄️ Novo estado para guardar o histórico
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  
  // Estados do Formulário de Disparo
  const [listaSelecionada, setListaSelecionada] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    buscarListas()
    buscarCampanhas() // Assim que abrir a tela, já puxa o histórico
  }, [])

  const buscarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome, contatos(count)').order('nome')
    if (data) setListas(data)
  }

  // --- NOVA FUNÇÃO: PUXAR HISTÓRICO ---
  const buscarCampanhas = async () => {
    setCarregandoHistorico(true)
    const { data } = await supabase
      .from('campanhas')
      .select('*, listas(nome)') // Puxa os dados da campanha E o nome da lista vinculada
      .order('created_at', { ascending: false })
      .limit(5) // Mostra só os 5 disparos mais recentes para não poluir
    
    if (data) setCampanhas(data)
    setCarregandoHistorico(false)
  }

  // --- FUNÇÃO ATUALIZADA: SALVAR NO BANCO ---
  const prepararDisparo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listaSelecionada || !assunto || !mensagem) {
      alert("Preencha todos os campos antes de disparar.")
      return
    }

    setEnviando(true)
    
    // Insere a campanha de verdade na tabela que você acabou de criar
    const { error } = await supabase
      .from('campanhas')
      .insert([
        { 
          lista_id: Number(listaSelecionada), 
          assunto: assunto, 
          mensagem: mensagem, 
          status: 'Aguardando Disparo' // Status inicial até o motor rodar
        }
      ])

    if (error) {
      alert("Erro ao salvar a campanha. Verifique o banco de dados.")
      console.error(error)
      setEnviando(false)
      return
    }

    alert("🎉 Campanha salva com sucesso! O histórico já foi atualizado.")
    
    setEnviando(false)
    setAssunto('')
    setMensagem('')
    setListaSelecionada('')
    
    // Atualiza a listinha lateral na mesma hora
    buscarCampanhas() 
  }

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900">Nova Campanha</h2>
        <p className="text-lg text-slate-600 mt-2">Crie, programe e dispare e-mails em massa para as suas listas.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* ÁREA ESQUERDA: EDITOR DE E-MAIL */}
        <div className="lg:col-span-2">
          <form onSubmit={prepararDisparo} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                <Mail className="size-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Compositor de Mensagem</h3>
            </div>

            <div className="p-6 space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Para qual lista deseja enviar? *</label>
                <select 
                  value={listaSelecionada} 
                  onChange={e => setListaSelecionada(e.target.value)}
                  required
                  className="bg-white w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium cursor-pointer"
                >
                  <option value="" disabled>Selecione uma lista de contatos...</option>
                  {listas.map(lista => (
                    <option key={lista.id} value={lista.id}>
                      {lista.nome} ({lista.contatos[0]?.count || 0} leads)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Assunto do E-mail *</label>
                <input 
                  type="text" 
                  value={assunto}
                  onChange={e => setAssunto(e.target.value)}
                  required
                  placeholder="Ex: Oferta exclusiva liberada!"
                  className="bg-white w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mensagem *</label>
                <textarea 
                  rows={8} 
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  required
                  placeholder="Escreva o corpo do seu e-mail aqui..."
                  className="bg-white w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                />
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Revise sua mensagem antes de salvar a campanha.
              </p>
              
              <button 
                type="submit" 
                disabled={enviando}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md disabled:opacity-50 flex items-center justify-center gap-3 transition-colors text-lg"
              >
                {enviando ? (
                  <><Loader2 className="size-5 animate-spin" /> Salvando...</>
                ) : (
                  <><Send className="size-5" /> Salvar Campanha</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ÁREA DIREITA: INFORMAÇÕES E HISTÓRICO REAL */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Clock className="size-5 text-slate-400" /> Histórico de Disparos
            </h3>
            
            <div className="space-y-4">
              
              {carregandoHistorico ? (
                <div className="flex justify-center p-4">
                   <Loader2 className="size-6 animate-spin text-blue-500" />
                </div>
              ) : campanhas.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                  <p className="text-sm text-slate-500 font-medium">Nenhuma campanha criada ainda.</p>
                </div>
              ) : (
                campanhas.map((campanha) => (
                  <div key={campanha.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 transition-colors hover:border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md flex items-center gap-1 whitespace-nowrap">
                        <Hourglass className="size-3" /> {campanha.status}
                      </span>
                      <span className="text-xs font-bold text-slate-400 whitespace-nowrap ml-2">
                        {new Date(campanha.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 text-sm truncate" title={campanha.assunto}>
                      {campanha.assunto}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      Lista: <strong>{campanha.listas?.nome || 'Lista Excluída'}</strong>
                    </p>
                  </div>
                ))
              )}

            </div>
          </div>

          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
            <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2 mb-3">
              <LayoutTemplate className="size-4" /> Dicas de Disparo
            </h3>
            <ul className="text-sm text-emerald-700 space-y-2 font-medium">
              <li>• Evite palavras como "Grátis" ou "Promoção" no assunto para não cair no Spam.</li>
              <li>• Mantenha o texto limpo e direto ao ponto.</li>
              <li>• Não anexe arquivos pesados diretamente na mensagem, use links do Google Drive.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}