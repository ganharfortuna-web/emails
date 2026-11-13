'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function PublicCapturePage() {
  const { slug } = useParams()
  const [pageConfig, setPageConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('landing_pages').select('titulo').eq('slug', slug).single()
      setPageConfig(data)
      setLoading(false)
    }
    load()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, whatsapp, slug })
      })
      const data = await res.json()
      if (data.redirect) window.location.href = data.redirect
      else alert('Erro ao processar.')
    } catch (err) {
      alert('Erro de conexão.')
    }
    setEnviando(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-10" /></div>
  if (!pageConfig) return <div className="min-h-screen flex items-center justify-center font-bold text-2xl">Página não encontrada.</div>

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md">
        <h1 className="text-3xl font-black text-slate-900 mb-2 text-center">{pageConfig.titulo}</h1>
        <p className="text-slate-600 text-center mb-8">Preencha os dados abaixo para receber o material.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Seu Nome" required value={nome} onChange={e => setNome(e.target.value)}
            className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" />
          <input type="email" placeholder="Seu E-mail" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" />
          <input type="tel" placeholder="Seu WhatsApp" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
            className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" />
          
          <button type="submit" disabled={enviando}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-xl shadow-lg flex justify-center gap-2 transition-colors">
            {enviando ? <><Loader2 className="size-5 animate-spin" /> Enviando...</> : 'Quero Receber'}
          </button>
        </form>
      </div>
    </div>
  )
}
