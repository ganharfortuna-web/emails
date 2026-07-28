"use client"

import { useState } from 'react'
import { Plus, LayoutTemplate, ExternalLink, Edit, X, Image as ImageIcon, Layout, Columns } from 'lucide-react'

export default function PaginasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

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
        
        {/* Exemplo de Página 1 */}
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

        {/* Exemplo de Página 2 */}
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

      {/* MODAL DE TEMPLATES */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-4xl shadow-xl relative max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="size-6" />
            </button>

            <h3 className="text-2xl font-bold text-slate-900">
              Escolha um Template Elegante
            </h3>
            
            <br />
            
            <p className="text-slate-600 mb-8">
              Selecione uma estrutura pronta de alta conversão. Você só precisará editar os textos e subir as suas fotos reais.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Template 1 */}
              <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group">
                <div className="bg-slate-50 h-32 rounded-lg mb-4 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 transition-colors">
                  <Columns className="size-10 text-slate-400 group-hover:text-blue-500" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Captura Clássica (Lado a Lado)</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Layout limpo com a sua fotografia real em destaque à esquerda e formulário elegante à direita. Ideal para Ebooks.
                </p>
                <button className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg text-sm">Usar Template</button>
              </div>

              {/* Template 2 */}
              <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group">
                <div className="bg-slate-50 h-32 rounded-lg mb-4 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 transition-colors">
                  <Layout className="size-10 text-slate-400 group-hover:text-blue-500" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Página de Vendas (Minimalista)</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Foco absoluto em tipografia sofisticada e espaços para fotografias humanas autênticas. Sem poluição visual.
                </p>
                <button className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg text-sm">Usar Template</button>
              </div>

              {/* Template 3 */}
              <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group">
                <div className="bg-slate-50 h-32 rounded-lg mb-4 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 transition-colors">
                  <ImageIcon className="size-10 text-slate-400 group-hover:text-blue-500" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Masterclass (Fundo Fotográfico)</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Uma única imagem real e de alta qualidade no fundo, com um box elegante centralizado para a captura do lead.
                </p>
                <button className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg text-sm">Usar Template</button>
              </div>

            </div>

          </div>
        </div>
      )}
      
    </div>
  )
}