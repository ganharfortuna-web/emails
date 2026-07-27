import Link from 'next/link';
import '../globals.css';

const navItems = [
  { label: 'Visão Geral', href: '/dashboard' },
  { label: 'Contas de Envio', href: '/dashboard#accounts' },
  { label: 'Gestão de Listas', href: '/dashboard#lists' },
  { label: 'Landing Pages', href: '/dashboard#pages' },
  { label: 'Respostas Automáticas', href: '/dashboard#automation' },
];

export const metadata = {
  title: 'Painel administrativo',
  description: 'Dashboard profissional para automação de e-mails',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#020817] text-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-800 bg-slate-950/90 p-6 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">Email OS</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Painel do Cliente</h2>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-sky-500 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-300">Status do sistema</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">Rotação ativa e entregas monitoradas em tempo real.</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(135deg,_#020817_0%,_#07111f_100%)] p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
