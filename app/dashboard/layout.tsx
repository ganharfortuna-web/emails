"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Send, Users, FileText, Bot, LogOut } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Essa ferramenta descobre em qual URL nós estamos agora
  const pathname = usePathname()

  // Função para saber se o link deve ficar azul (ativo) ou não
  const linkAtivo = (caminho: string) => {
    return pathname === caminho
      ? "flex items-center gap-3 bg-blue-900/50 text-white px-4 py-3 rounded-lg transition-colors" // Estilo quando está selecionado
      : "flex items-center gap-3 text-slate-400 hover:bg-slate-900 hover:text-white px-4 py-3 rounded-lg transition-colors" // Estilo normal
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* MENU LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col fixed h-full">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-white font-black text-xl tracking-tight">Sistema Envios</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className={linkAtivo("/dashboard")}>
            <LayoutDashboard className="size-5" />
            Visão Geral
          </Link>
          <Link href="/dashboard/contas" className={linkAtivo("/dashboard/contas")}>
            <Send className="size-5" />
            Contas de Envio
          </Link>
          <Link href="/dashboard/listas" className={linkAtivo("/dashboard/listas")}>
            <Users className="size-5" />
            Gestão de Listas
          </Link>
          <Link href="/dashboard/paginas" className={linkAtivo("/dashboard/paginas")}>
            <FileText className="size-5" />
            Landing Pages
          </Link>
          <Link href="/dashboard/automacoes" className={linkAtivo("/dashboard/automacoes")}>
            <Bot className="size-5" />
            Respostas Automáticas
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="/" className="flex items-center gap-3 text-slate-400 hover:text-white px-4 py-3 transition-colors">
            <LogOut className="size-5" />
            Sair do Painel
          </Link>
        </div>
      </aside>

      {/* ÁREA CENTRAL (ONDE O CONTEÚDO MUDA) */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center px-8 shadow-sm">
          <h1 className="text-lg font-bold text-slate-800">Área do Cliente</h1>
        </header>
        
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}