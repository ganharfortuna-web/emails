import { Plus, Bot, Play, Pause, Settings, ArrowRight } from 'lucide-react'

export default function AutomacoesPage() {
  return (
    <div className="max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            Respostas Automáticas
          </h2>
          
          <br />
          
          <p className="text-lg text-slate-600">
            Crie sequências de e-mails automáticos para nutrir seus leads assim que eles se cadastrarem.
          </p>
        </div>
        
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm">
          <Plus className="size-5" />
          Nova Automação
        </button>
      </div>

      {/* LISTA DE AUTOMAÇÕES */}
      <div className="grid gap-6 mt-12">
        
        {/* Automação 1 (Ativa) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-6">
            <div className="bg-emerald-100 p-4 rounded-xl">
              <Bot className="size-8 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-bold text-slate-900">Entrega Ebook + Boas-vindas</h3>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                  Ativo
                </span>
              </div>
              <p className="text-slate-500 font-medium">
                Gatilho: Entrou na lista <strong className="text-slate-700">"Leads - Ebook Masterclass"</strong>
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Sequência de 3 e-mails configurada.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Pausar">
              <Pause className="size-5" />
            </button>
            <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Configurações">
              <Settings className="size-5" />
            </button>
            <button className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-lg transition-colors">
              Editar Funil <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Automação 2 (Pausada) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-6">
            <div className="bg-orange-100 p-4 rounded-xl">
              <Bot className="size-8 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-bold text-slate-900">Recuperação de Carrinho - Mentoria</h3>
                <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
                  Pausado
                </span>
              </div>
              <p className="text-slate-500 font-medium">
                Gatilho: Tag <strong className="text-slate-700">"Abandono_Mentoria"</strong> adicionada
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Sequência de 2 e-mails configurada.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Ativar">
              <Play className="size-5" />
            </button>
            <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Configurações">
              <Settings className="size-5" />
            </button>
            <button className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-lg transition-colors">
              Editar Funil <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

      </div>
      
    </div>
  )
}