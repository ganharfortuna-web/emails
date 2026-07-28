"use client"

import { useState } from 'react'
import { Plus, LayoutTemplate, ExternalLink, Edit, X, Image as ImageIcon, Layout, Columns, ArrowLeft, Palette } from 'lucide-react'

export default function PaginasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState(1) // Controla se estamos na escolha do template (1) ou na configuração (2)
  const [templateEscolhido, setTemplateEscolhido] = useState("")

  const abrirConfiguracao = (nomeTemplate: string) => {
    setTemplateEscolhido(nomeTemplate)
    setModalStep(2)
  }

  const fecharModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setModalStep(1), 300) // Reseta o passo após a animação de fechar
  }

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            Landing Pages
          </h2>
          
          <br />
          
          <p className="text-lg text-slate-600">
            Crie, edite e acompanhe as suas páginas de vendas e de captura de leads.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="size-5" />
          Criar Nova Página
        </button>
      </div>

      {/* GRID DE PÁGINAS EXISTENTES */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="h-32 bg-slate-100 flex items-center justify-center border-b border-slate-200">
            <LayoutTemplate className="size-10 text-slate-300" />
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="font-bold text-lg text-slate-900 mb-1">Captura - Ebook Gratuito</h3>
            <p className="text-sm text-emerald-600 font-bold mb-4">Online (Ativa)</p>
            <p className="text-sm text-slate-500 mb-6 flex-1">
              Página de captura configurada para entregar o ebook em troca do e-mail.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-2 text-sm">
                <Edit className="size-4" /> Editar
              </button>
              <button className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2 px-4 rounded-lg border border-blue-200 transition-colors flex items-center justify-center gap-2 text-sm">
                <ExternalLink className="size-4" /> Acessar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="h-32 bg-slate-100 flex items-center justify-center border-b border-slate-200">
            <LayoutTemplate className="size-10 text-slate-300" />
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="font-bold text-lg text-slate-900 mb-1">Vendas - Masterclass</h3>
            <p className="text-sm text-orange-500 font-bold mb-4">Rascunho</p>
            <p className="text-sm text-slate-500 mb-6 flex-1">
              Página de vendas estruturada com integração de checkout e layout de alta conversão.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-2 text-sm">
                <Edit className="size-4" /> Continuar Edição
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PRINCIPAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-5xl shadow-xl relative max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={fecharModal}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="size-6" />
            </button>

            {/* PASSO 1: ESCOLHA DO TEMPLATE */}
            {modalStep === 1 && (
              <>
                <h3 className="text-2xl font-bold text-slate-900">
                  Escolha um Template Elegante
                </h3>
                
                <br />
                
                <p className="text-slate-600 mb-8">
                  Selecione uma estrutura de alta conversão. Espaços configurados estritamente para fotos reais (sem desenhos).
                </p>

                <div className="grid md:grid-cols-3 gap-6">
                  
                  {/* Template 1: Branco/Limpo */}
                  <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all group bg-white">
                    <div className="bg-white h-24 rounded-lg mb-4 flex items-center justify-center border border-slate-200 group-hover:border-blue-300">
                      <Columns className="size-8 text-slate-400 group-hover:text-blue-500" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">Clássico (Branco/Azul)</h4>
                    <p className="text-xs text-slate-500 mb-4 h-12">Layout claro. Foto real à esquerda e formulário à direita. Perfeito para Ebooks.</p>
                    <button onClick={() => abrirConfiguracao('Clássico (Branco/Azul)')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">Selecionar</button>
                  </div>

                  {/* Template 2: Dark Mode */}
                  <div className="border border-slate-200 rounded-xl p-6 hover:border-slate-900 hover:shadow-md transition-all group bg-slate-50">
                    <div className="bg-slate-900 h-24 rounded-lg mb-4 flex items-center justify-center border border-slate-800">
                      <Layout className="size-8 text-slate-400 group-hover:text-white" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">Minimalista (Escuro)</h4>
                    <p className="text-xs text-slate-500 mb-4 h-12">Fundo noturno (Dark Mode) focando em tipografia sofisticada e contraste.</p>
                    <button onClick={() => abrirConfiguracao('Minimalista (Escuro)')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">Selecionar</button>
                  </div>

                  {/* Template 3: Masterclass Fotográfica */}
                  <div className="border border-slate-200 rounded-xl p-6 hover:border-purple-500 hover:shadow-md transition-all group bg-white">
                    <div className="bg-slate-200 h-24 rounded-lg mb-4 flex items-center justify-center border border-slate-300 relative overflow-hidden">
                      <ImageIcon className="size-8 text-slate-500 group-hover:text-purple-600 z-10" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-300/50 to-transparent"></div>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">Masterclass (Fundo Foto)</h4>
                    <p className="text-xs text-slate-500 mb-4 h-12">Uma imagem real em tela cheia no fundo com um box central para a captura.</p>
                    <button onClick={() => abrirConfiguracao('Masterclass (Fundo Foto)')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">Selecionar</button>
                  </div>

                  {/* Template 4: Tons Terrosos */}
                  <div className="border border-slate-200 rounded-xl p-6 hover:border-amber-700 hover:shadow-md transition-all group bg-[#faf8f5]">
                    <div className="bg-[#f0e6d2] h-24 rounded-lg mb-4 flex items-center justify-center border border-[#e0cca8]">
                      <Palette className="size-8 text-[#8c6b4a] group-hover:text-[#5c4228]" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">Elegante (Tons Terrosos)</h4>
                    <p className="text-xs text-slate-500 mb-4 h-12">Cores quentes (bege/marrom). Passa muita credibilidade e acolhimento humano.</p>
                    <button onClick={() => abrirConfiguracao('Elegante (Tons Terrosos)')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">Selecionar</button>
                  </div>

                  {/* Template 5: Black & Gold */}
                  <div className="border border-slate-200 rounded-xl p-6 hover:border-yellow-500 hover:shadow-md transition-all group bg-zinc-950">
                    <div className="bg-zinc-900 h-24 rounded-lg mb-4 flex items-center justify-center border border-zinc-800">
                      <LayoutTemplate className="size-8 text-yellow-600 group-hover:text-yellow-400" />
                    </div>
                    <h4 className="font-bold text-white mb-1">Premium (Preto e Ouro)</h4>
                    <p className="text-xs text-zinc-400 mb-4 h-12">Estilo High-End. Fundo ultra escuro com botões e detalhes em tom dourado.</p>
                    <button onClick={() => abrirConfiguracao('Premium (Preto e Ouro)')} className="w-full bg-yellow-600 hover:bg-yellow-500 text-zinc-950 font-black py-2.5 rounded-lg text-sm transition-colors">Selecionar</button>
                  </div>

                  {/* Template 6: Alta Conversão */}
                  <div className="border border-slate-200 rounded-xl p-6 hover:border-emerald-500 hover:shadow-md transition-all group bg-white">
                    <div className="bg-emerald-50 h-24 rounded-lg mb-4 flex items-center justify-center border border-emerald-100">
                      <Columns className="size-8 text-emerald-600 group-hover:text-emerald-500" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">Oferta Direta (Verde)</h4>
                    <p className="text-xs text-slate-500 mb-4 h-12">Cores voltadas para ação e checkout. Títulos fortes e botões verdes chamativos.</p>
                    <button onClick={() => abrirConfiguracao('Oferta Direta (Verde)')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">Selecionar</button>
                  </div>

                </div>
              </>
            )}

            {/* PASSO 2: CONFIGURAÇÃO DE LISTAS E AUTORESPONDER */}
            {modalStep === 2 && (
              <div className="max-w-2xl mx-auto">
                <button 
                  onClick={() => setModalStep(1)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-6 transition-colors"
                >
                  <ArrowLeft className="size-4" /> Voltar aos templates
                </button>

                <h3 className="text-2xl font-bold text-slate-900">
                  Integrações do Formulário
                </h3>
                
                <br />
                
                <p className="text-slate-600 mb-8">
                  Defina o nome da sua página e para onde os contatos devem ir após o cadastro. <br/>
                  <span className="text-sm font-bold text-blue-600">Template selecionado: {templateEscolhido}</span>
                </p>

                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome Interno da Página</label>
                    <input type="text" placeholder="Ex: Captura Ebook Relacionamentos" className="w-full bg-white border border-slate-300 rounded-lg p-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Salvar contatos em qual Lista?</label>
                    <select className="w-full bg-white border border-slate-300 rounded-lg p-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900">
                      <option value="">Selecione uma lista...</option>
                      <option value="1">Leads - Ebook Masterclass</option>
                      <option value="2">Compradores - Mentoria</option>
                      <option value="nova">+ Criar nova lista agora</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Disparar qual Autoresponder?</label>
                    <select className="w-full bg-white border border-slate-300 rounded-lg p-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900">
                      <option value="">Não enviar e-mail automático</option>
                      <option value="1">Sequência Boas-vindas (3 e-mails)</option>
                      <option value="2">Entrega do Ebook (1 e-mail)</option>
                      <option value="novo">+ Criar nova automação agora</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-sm text-lg">
                      Criar Página e Abrir Editor Visual
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}
      
    </div>
  )
}