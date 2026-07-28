"use client"

import { useState } from 'react'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const router = useRouter()

  const fazerLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Por enquanto, apenas redireciona para o painel para testarmos o visual
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 text-center bg-slate-900">
          <h2 className="text-2xl font-black text-white">
            Sistema de Envios
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            Acesso restrito ao painel de administração
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={fazerLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-5 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-900"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition-colors shadow-md"
            >
              Entrar no Sistema <ArrowRight className="size-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}