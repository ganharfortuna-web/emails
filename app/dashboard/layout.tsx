"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  GitMerge, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Loader2
} from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  
  // NOVO: Estado para segurar a tela enquanto verifica o "crachá"
  const [verificandoAcesso, setVerificandoAcesso] = useState(true) 
  
  const router = useRouter()
  const pathname = usePathname()

  // --- NOVA BARREIRA DE SEGURANÇA BLINDADA ---
  useEffect(() => {
    const checarAcesso = async () => {
      // Pergunta pro Supabase se tem alguém logado neste navegador
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // Se não tiver crachá (sessão), expulsa direto pra tela de login
        router.push('/login')
      } else {
        // Se tiver, libera a catraca escondendo a tela de carregamento
        setVerificandoAcesso(false)
      }
    }

    checarAcesso()

    // Fica de plantão: se a sessão do usuário expirar do nada, expulsa ele
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/login')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  const fazerLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const linksMenu = [
    { nome: 'Visão Geral', rota: '/dashboard', icone: LayoutDashboard },
    { nome: 'Contatos', rota: '/dashboard/contatos', icone: Users },
    { nome: 'Listas', rota: '/dashboard/listas', icone: Mail },
    { nome: 'Automações', rota: '/dashboard/automacoes', icone: GitMerge },
    { nome: 'Páginas', rota: '/dashboard/paginas', icone: Settings },
  ]

  // Se ainda estiver verificando, mostra uma tela de carregamento pra ninguém ver o painel
  if (verificandoAcesso) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="size-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold animate-pulse">Autenticando segurança...</p>
      </div>
    )
  }

  // Se passou da verificação ali em cima, renderiza o painel normal
  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* Menu Lateral (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-white">Sistema Envios</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {linksMenu.map((link) => {
            const Icone = link.icone
            const ativo = pathname === link.rota
            
            return (
              <Link 
                key={link.nome} 
                href={link.rota}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  ativo 
                    ? 'bg-blue-600 text-white font-semibold' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icone className="size-5" />
                {link.nome}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={fazerLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="size-5" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Cabeçalho Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
          <h1 className="text-lg font-black">Sistema Envios</h1>
          <button onClick={() => setMenuAberto(!menuAberto)} className="p-2">
            {menuAberto ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </header>

        {/* Menu Mobile Aberto */}
        {menuAberto && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 text-slate-300">
            <nav className="p-4 space-y-2">
              {linksMenu.map((link) => {
                const Icone = link.icone
                return (
                  <Link 
                    key={link.nome} 
                    href={link.rota}
                    onClick={() => setMenuAberto(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white"
                  >
                    <Icone className="size-5" />
                    {link.nome}
                  </Link>
                )
              })}
              <button 
                onClick={fazerLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-slate-800"
              >
                <LogOut className="size-5" />
                Sair
              </button>
            </nav>
          </div>
        )}

        {/* Área onde as páginas vão renderizar */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}