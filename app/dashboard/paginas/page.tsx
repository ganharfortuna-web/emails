import { Plus, LayoutTemplate, ExternalLink, Edit } from 'lucide-react'

export default function PaginasPage() {
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
        
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm">
          <Plus className="size-5" />
          Criar Nova Página
        </button>
      </div>

      {/* GRID DE PÁGINAS */}
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
    </div>
  )
}