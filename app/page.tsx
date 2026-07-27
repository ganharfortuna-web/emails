import Link from 'next/link';

const benefits = [
  'Gmails rotativos com alternância automática para preservar reputação e alcance.',
  'SMTP externo configurado para performance de entrega e escalabilidade.',
  'Painel completo para campanhas, listas, landing pages e automações.',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_38%),linear-gradient(135deg,_#020817_0%,_#07111f_100%)] text-slate-100">
      <section className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16 lg:px-8 lg:py-24">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-slate-800/80 bg-slate-950/70 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">Email OS</p>
            <p className="text-xs text-slate-400">Sistema de disparo e automação</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Acessar painel
          </Link>
        </header>

        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sm font-medium text-sky-300">
              Liberdade das mensalidades abusivas de e-mail marketing
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              Um sistema próprio para disparar com autoridade, escala e alta entrega.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Conquiste mais alcance com rotas inteligentes de envio, automações profissionais e um painel completo para crescer sem depender de plataformas caras.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="#contato"
                className="rounded-full bg-orange-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                Quero meu sistema próprio
              </Link>
              <a
                href="https://wa.me/5561982096982"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-700 bg-slate-900/70 px-6 py-3.5 text-base font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl shadow-black/30">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">Oferta completa</p>
              <p className="text-3xl font-bold text-white">R$ 1.497,00</p>
              <p className="text-sm leading-7 text-slate-400">
                Pagamento único pela instalação e licença. O cliente recebe o sistema 100% completo e instalado.
              </p>
            </div>
            <div className="mt-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              {benefits.map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <p className="text-sm leading-7 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
        <div className="grid gap-6 rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 lg:grid-cols-3 lg:p-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">Entrega</p>
            <h2 className="mt-3 text-xl font-semibold text-white">Gmails rotativos e SMTP externo</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Estrutura pensada para garantir alta taxa de entrega e reduzir bloqueios com rotação inteligente.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">Automação</p>
            <h2 className="mt-3 text-xl font-semibold text-white">Campanhas, listas e landing pages</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Controle total desde o cadastro de contatos até a geração de páginas de captura e respostas automáticas.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">Escalabilidade</p>
            <h2 className="mt-3 text-xl font-semibold text-white">Plataforma profissional</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Pronto para operar com múltiplas contas, listas segmentadas e pipelines de conversão com foco comercial.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 lg:p-10">
          <h2 className="text-2xl font-semibold text-white">Sobre o desenvolvedor</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
            Desenvolvido por Jose Valderi, programador e empreendedor digital com diversos projetos lançados com sucesso no mercado. Construindo soluções reais para escalar o seu negócio.
          </p>
        </div>
      </section>

      <footer id="contato" className="border-t border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-center lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">Fechamento de contratação</p>
          <h2 className="text-3xl font-semibold text-white">Pronto para ter um sistema próprio e profissional?</h2>
          <a
            href="https://wa.me/5561982096982"
            target="_blank"
            rel="noreferrer"
            className="mx-auto rounded-full bg-orange-500 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-orange-600"
          >
            Fale agora pelo WhatsApp (61) 98209-6982
          </a>
        </div>
      </footer>
    </main>
  );
}
