const metrics = [
  { label: 'E-mails enviados hoje', value: '12.480', detail: '+18% em relação a ontem' },
  { label: 'Taxa de abertura', value: '68.4%', detail: 'Média consolidada' },
  { label: 'Cliques no relatório', value: '3.120', detail: 'Últimas 24 horas' },
];

const accounts = [
  { name: 'Gmail Marketing 01', status: 'Ativo', rotation: 'Rotação automática' },
  { name: 'SMTP Corporativo', status: 'Em validação', rotation: 'Fallback pronto' },
];

const lists = [
  { name: 'Leads Quentes', size: '4.280 contatos', health: 'Limpeza inteligente ativa' },
  { name: 'Clientes Ativos', size: '1.120 contatos', health: 'Sem inatividade há 30 dias' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 shadow-2xl shadow-black/20 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">Visão Geral</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Campanhas, contas e automações em um só painel</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Estrutura profissional para gerenciar disparos, listas, páginas de captura e respostas automáticas com controle completo.
          </p>
        </div>
        <button className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600">
          Nova campanha
        </button>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-6">
            <p className="text-sm text-slate-400">{metric.label}</p>
            <p className="mt-4 text-3xl font-semibold text-white">{metric.value}</p>
            <p className="mt-2 text-sm text-emerald-400">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section id="accounts" className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">Contas de envio</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Múltiplos provedores com rotação automática</h2>
          </div>
          <button className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
            Adicionar conta
          </button>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <div key={account.name} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{account.name}</h3>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                  {account.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-400">{account.rotation}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="lists" className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">Gestão de listas</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Listas com segmentação inteligente</h2>
          <div className="mt-6 space-y-3">
            {lists.map((list) => (
              <div key={list.name} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">{list.name}</h3>
                  <span className="text-sm text-sky-300">{list.size}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-400">{list.health}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">Limpeza inteligente</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Remoção por inatividade</h2>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">Filtrar contatos sem clique há 1 mês</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">Filtrar contatos sem clique há 2 meses</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">Filtrar contatos sem clique há 3 meses</div>
          </div>
        </div>
      </section>

      <section id="pages" className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">Criador de landing pages</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Páginas de captura com links e encurtamento</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Título</p>
            <p className="mt-2 text-lg font-semibold text-white">Receba um material premium</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Link da lista</p>
            <p className="mt-2 text-lg font-semibold text-white">https://lista.exemplo.com</p>
          </div>
        </div>
      </section>

      <section id="automation" className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">Respostas automáticas</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Autoreponder diário com duração de 1 mês</h2>
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm leading-7 text-slate-400">
            Configure mensagens automáticas para nutrir leads, reforçar ofertas e manter comunicação ativa no período ideal.
          </p>
        </div>
      </section>
    </div>
  );
}
