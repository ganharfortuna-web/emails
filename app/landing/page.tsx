'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, Download } from 'lucide-react'

export default function LandingPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  // 🔴 ATENÇÃO: Substitua pelo ID real da sua lista no Supabase
  const LISTA_ID = 'COLOQUE_O_ID_DA_SUA_LISTA_AQUI' 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, lista_id: LISTA_ID })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar')
      }

      setSucesso(true)
      setNome('')
      setEmail('')
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col md:flex-row">
        
        {/* Lado Esquerdo: Imagem do E-book */}
        <div className="md:w-1/2 bg-blue-950 p-8 flex items-center justify-center relative">
          {/* Se você não tiver a imagem ainda, deixe esse texto abaixo */}
          <div className="text-center text-white z-10">
            <h2 className="text-2xl font-black mb-4">Material Exclusivo</h2>
            <p className="text-blue-200 mb-6 text-sm">Descubra os segredos para escalar suas vendas.</p>
            
            {/* 👇 AQUI ESTÁ A SUA IMAGEM DO E-BOOK 👇 */}
            <img 
              src="/ebook.jpg" 
              alt="Capa do E-book" 
              className="w-48 md:w-64 mx-auto rounded-lg shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="md:w-1/2 p-8 md:p-12">
          {sucesso ? (
            <div className="text-center space-y-4 h-full flex flex-col justify-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Tudo Certo!</h2>
              <p className="text-slate-600">
                Seu cadastro foi recebido. Verifique sua caixa de entrada, o e-mail com o link do material já está a caminho!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full mb-4">
                  <Download className="size-3" /> Download Gratuito
                </span>
                <h1 className="text-3xl font-black text-slate-900 mb-2 leading-tight">
                  Baixe o Guia Definitivo Agora
                </h1>
                <p className="text-slate-600">Preencha os dados abaixo e receba o material exclusivo direto no seu e-mail.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Seu Nome</label>
                  <input 
                    type="text" 
                    value={nome} 
                    onChange={e => setNome(e.target.value)}
                    required
                    className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium bg-slate-50"
                    placeholder="Como podemos te chamar?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Seu Melhor E-mail</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium bg-slate-50"
                    placeholder="voce@email.com"
                  />
                </div>

                {erro && <p className="text-sm text-red-600 font-bold bg-red-50 p-3 rounded-lg">{erro}</p>}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-xl transition-all shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
                >
                  {loading ? <><Loader2 className="size-5 animate-spin" /> Enviando...</> : 'Quero Receber o E-book'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}