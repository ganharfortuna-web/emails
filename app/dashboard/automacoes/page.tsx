"use client"

import { useState, useEffect } from 'react'
import { Send, Clock, Mail, LayoutTemplate, FileText, CheckCircle2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function AutomacoesPage() {
  const [listas, setListas] = useState<any[]>([])
  
  // Estados do Formulário de Disparo
  const [listaSelecionada, setListaSelecionada] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    buscarListas()
  }, [])

  const buscarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome, contatos(count)').order('nome')
    if (data) setListas(data)
  }

  const prepararDisparo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listaSelecionada || !assunto || !mensagem) {
      alert("Preencha todos os campos antes de disparar.")
      return
    }

    setEnviando(true)
    
    // 🚧 Aqui vai entrar o motor de envio de e-mails na próxima etapa!
    setTimeout(() => {
      alert("Simulação de disparo concluída! O motor real será conectado aqui.")
      setEnviando(false)
      setAssunto('')
      setMensagem('')
    }, 2000)
  }

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900">Nova Campanha</h2>
        <p className="text-lg text-slate-600 mt-2">Crie, programe e dispare e-mails em massa para as suas listas.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* ÁREA ESQUERDA: EDITOR DE E-MAIL (Ocupa 2 colunas) */}
        <div className="lg:col-span-2">
          <form onSubmit={prepararDisparo} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                <Mail className="size-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Compositor de Mensagem</h3>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Seleção de Lista */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Para qual lista deseja enviar? *</label>
                <select 
                  value={listaSelecionada} 
                  onChange={e => setListaSelecionada(e.target.value)}
                  required
                  className="bg-white w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                >
                  <option value="" disabled>Selecione uma lista de contatos...</option>
                  {listas.map(lista => (
                    <option key={lista.id} value={lista.id}>
                      {lista.nome} ({lista.contatos[0]?.count || 0} leads)
                    </option>
                  ))}
                </select>
              </div>

              {/* Assunto */}
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

              {/* Corpo da Mensagem */}
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
                Revise sua mensagem antes de enviar.
              </p>
              
              <button 
                type="submit" 
                disabled={enviando}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md disabled:opacity-50 flex items-center justify-center gap-3 transition-colors text-lg"
              >
                {enviando ? (
                  <>Enviando...</>
                ) : (
                  <><Send className="size-5" /> Disparar Campanha</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ÁREA DIREITA: INFORMAÇÕES E HISTÓRICO (Ocupa 1 coluna) */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Clock className="size-5 text-slate-400" /> Últimos Disparos
            </h3>
            
            <div className="space-y-4">
              {/* Exemplo Estático de Histórico (Será substituído pelo banco de dados) */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Concluído
                  </span>
                  <span className="text-xs font-bold text-slate-400">Ontem</span>
                </div>
                <p className="font-bold text-slate-800 text-sm truncate">Lançamento E-book VIP</p>
                <p className="text-xs text-slate-500 mt-1">Para: Leads - Ebook Masterclass</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Concluído
                  </span>
                  <span className="text-xs font-bold text-slate-400">12/08/2026</span>
                </div>
                <p className="font-bold text-slate-800 text-sm truncate">Boas-vindas Mentoria</p>
                <p className="text-xs text-slate-500 mt-1">Para: Compradores</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
            <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2 mb-3">
              <LayoutTemplate className="size-4" /> Dicas de Disparo
            </h3>
            <ul className="text-sm text-emerald-700 space-y-2 font-medium">
              <li>• Evite palavras como "Grátis" ou "Promoção" no assunto para não cair no Spam.</li>
              <li>• Mantenha o texto limpo e direto ao ponto.</li>
              <li>• Teste seus links antes de disparar para toda a base.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}