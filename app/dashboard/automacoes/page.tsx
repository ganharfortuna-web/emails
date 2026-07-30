"use client"

import { useState, useEffect, useRef } from 'react'
import { Send, Clock, Mail, LayoutTemplate, Loader2, Hourglass, Link2, Bold, Type } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function AutomacoesPage() {
  const [listas, setListas] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([]) 
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  
  // Estados do Formulário de Disparo
  const [listaSelecionada, setListaSelecionada] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Referência para saber onde o cursor do mouse está na caixa de texto
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    buscarListas()
    buscarCampanhas() 
  }, [])

  const buscarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome, contatos(count)').order('nome')
    if (data) setListas(data)
  }

  const buscarCampanhas = async () => {
    setCarregandoHistorico(true)
    const { data } = await supabase
      .from('campanhas')
      .select('*, listas(nome)')
      .order('created_at', { ascending: false })
      .limit(5) 
    
    if (data) setCampanhas(data)
    setCarregandoHistorico(false)
  }

  // --- MOTOR DE FORMATAÇÃO HTML ---
  const inserirFormatacao = (tagInicial: string, tagFinal: string, placeholder: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const inicio = textarea.selectionStart
    const fim = textarea.selectionEnd
    const textoSelecionado = mensagem.substring(inicio, fim) || placeholder
    
    const novoTexto = mensagem.substring(0, inicio) + tagInicial + textoSelecionado + tagFinal + mensagem.substring(fim)
    setMensagem(novoTexto)

    // Devolve o foco pra caixa de texto automaticamente
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(inicio + tagInicial.length, inicio + tagInicial.length + textoSelecionado.length)
    }, 0)
  }

  const InserirLink = () => {
    const url = window.prompt('🔗 Cole o link aqui (ex: https://seusite.com):')
    if (!url) return
    
    // Injeta o HTML com cor azul e sublinhado para ficar com cara de link no e-mail
    inserirFormatacao(
      `<a href="${url}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: underline;">`, 
      '</a>', 
      'Clique aqui para acessar'
    )
  }

  const InserirNegrito = () => inserirFormatacao('<strong>', '</strong>', 'Texto em Destaque')
  const InserirParagrafo = () => inserirFormatacao('<br><br>', '', '')

  // --- FUNÇÃO ATUALIZADA: SALVAR NO BANCO ---
  const prepararDisparo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listaSelecionada || !assunto || !mensagem) {
      alert("Preencha todos os campos antes de disparar.")
      return
    }

    setEnviando(true)
    
    const { error } = await supabase
      .from('campanhas')
      .insert([
        { 
          lista_id: Number(listaSelecionada), 
          assunto: assunto, 
          mensagem: mensagem, 
          status: 'Aguardando Disparo' 
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

              {/* MENSAGEM COM BARRA DE FERRAMENTAS */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <label className="block text-sm font-bold text-slate-700">Mensagem (HTML Suportado) *</label>
                  
                  {/* BARRA DE FERRAMENTAS HTML */}
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={InserirLink}
                      className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Link2 className="size-3.5" /> Link
                    </button>
                    <button 
                      type="button" 
                      onClick={InserirNegrito}
                      className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Bold className="size-3.5" /> Negrito
                    </button>
                    <button 
                      type="button" 
                      onClick={InserirParagrafo}
                      className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                      title="Pular linha"
                    >
                      <Type className="size-3.5" /> Pular Linha
                    </button>
                  </div>
                </div>

                <textarea 
                  ref={textareaRef}
                  rows={10} 
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  required
                  placeholder="Escreva sua mensagem... Você pode usar os botões acima para formatar o texto."
                  className="bg-white w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-mono text-sm leading-relaxed"
                />
                <p className="text-xs text-slate-400 mt-2 font-medium">Dica: Selecione um texto e clique no botão de Link para transformá-lo automaticamente.</p>
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