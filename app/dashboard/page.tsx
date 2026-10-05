import { 
  MailCheck, 
  MousePointerClick, 
  AlertCircle, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Settings 
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      
      {/* CABEÇALHO */}
      <div>
        <h2 className="text-3xl font-black text-slate-900">
          Visão Geral das Métricas
        </h2>
        <p className="text-lg text-slate-600 mt-2">
          Acompanhe o desempenho diário das suas campanhas e a saúde da sua infraestrutura de envios.
        </p>
      </div>
      
      {/* CARDS DE MÉTRICAS */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600">E-mails Enviados Hoje</h3>
            <div className="bg-blue-100 p-3 rounded-xl">
              <MailCheck className="size-6 text-blue-700" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900">12.450</p>
          <p className="text-sm text-emerald-600 mt-2 font-bold">+15% em relação a ontem</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600">Taxa de Abertura Média</h3>
            <div className="bg-emerald-100 p-3 rounded-xl">
              <MousePointerClick className="size-6 text-emerald-700" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900">28.4%</p>
          <p className="text-sm text-emerald-600 mt-2 font-bold">Saudável - Acima da média</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600">Avisos do Sistema</h3>
            <div className="bg-orange-100 p-3 rounded-xl">
              <AlertCircle className="size-6 text-orange-600" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900">2</p>
          <p className="text-sm text-orange-600 mt-2 font-bold">Gmails precisam de reconexão</p>
        </div>
      </div>

      {/* BLOCOS INFERIORES LADO A LADO */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* RELATÓRIO DE CLIQUES */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Relatório Rápido de Cliques
          </h3>
          <p className="text-slate-600 mb-8">
            Acompanhe quais foram os links mais clicados nas suas últimas campanhas de disparo.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Link: /promocao-vitalicia</span>
              <span className="bg-blue-50 text-blue-800 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-100">
                342 cliques
              </span>
            </div>
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Link: /video-apresentacao</span>
              <span className="bg-blue-50 text-blue-800 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-100">
                128 cliques
              </span>
            </div>
            <div className="flex items-center justify-between py-4">
              <span className="text-slate-700 font-bold">Link: /checkout</span>
              <span className="bg-blue-50 text-blue-800 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-100">
                89 cliques
              </span>
            </div>
          </div>
        </div>

        {/* CONFIGURAÇÕES DE SMTP */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Server className="size-5 text-slate-700" />
              Configurações de SMTPs
            </h3>
            <button className="text-slate-500 hover:text-blue-600 transition-colors p-2 bg-slate-50 hover:bg-blue-50 rounded-xl">
              <Settings className="size-5" />
            </button>
          </div>
          
          <p className="text-slate-600 mb-8">
            Status atual e gerenciamento das suas contas de envio conectadas ao sistema.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex flex-col">
                <span className="text-slate-700 font-bold">contato@suaempresa.com</span>
                <span className="text-xs text-slate-400 mt-1 font-medium">smtp.hostinger.com • Porta 465</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-bold border border-emerald-100">
                <CheckCircle2 className="size-4" />
                Conectado
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex flex-col">
                <span className="text-slate-700 font-bold">marketing@suaempresa.com</span>
                <span className="text-xs text-slate-400 mt-1 font-medium">smtp.sendgrid.net • Porta 587</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-bold border border-emerald-100">
                <CheckCircle2 className="size-4" />
                Conectado
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col">
                <span className="text-slate-700 font-bold">vendas@gmail.com</span>
                <span className="text-xs text-slate-400 mt-1 font-medium">smtp.gmail.com • Porta 465</span>
              </div>
              <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-bold border border-red-100">
                <XCircle className="size-4" />
                Reconectar
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}