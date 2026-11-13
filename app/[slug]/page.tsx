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
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('landing_pages').select('*').eq('slug', slug).single()
      setPageConfig(data)
      setLoading(false)
    }
    load()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, whatsapp, slug })
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Erro desconhecido ao processar')
      }

      // Se a API retornar um link de redirecionamento, força a saída da tela
      if (data.redirect) {
        window.location.href = data.redirect
      } else {
        setErro('Cadastro feito, mas a página de destino não foi configurada.')
        setEnviando(false)
      }
    } catch (err: any) {
      setErro(err.message)
      setEnviando(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-white size-10" /></div>
  if (!pageConfig) return <div className="min-h-screen flex items-center justify-center font-bold text-2xl bg-slate-950 text-white">Página não encontrada.</div>

  const bgColor = pageConfig.bg_color || '#0f172a'
  const btnColor = pageConfig.button_color || '#ea580c'
  const isLayoutLeft = pageConfig.layout_type === 'left'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ backgroundColor: bgColor }}>
      <div className={`w-full max-w-5xl flex flex-col md:flex-row bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl overflow-hidden shadow-2xl ${isLayoutLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
        
        {pageConfig.hero_image_url && (
          <div className="md:w-1/2 p-8 md:p-12 flex items-center justify-center relative bg-black/20">
            <img src={pageConfig.hero_image_url} alt="Material" className="w-full max-w-sm object-contain drop-shadow-2xl rounded-xl" />
          </div>
        )}

        <div className={`${pageConfig.hero_image_url ? 'md:w-1/2' : 'w-full max-w-2xl mx-auto'} p-8 md:p-12 flex flex-col justify-center bg-white`}>
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 leading-tight">{pageConfig.titulo}</h1>
            <p className="text-slate-600 text-lg">{pageConfig.subtitulo}</p>
          </div>
          
          {erro && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-bold border border-red-200">Erro: {erro}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Seu Nome" required value={nome} onChange={e => setNome(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800" />
            <input type="email" placeholder="Seu E-mail" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800" />
            <input type="tel" placeholder="Seu WhatsApp" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800" />
            
            <button type="submit" disabled={enviando} style={{ backgroundColor: btnColor }} className="w-full py-4 text-white font-black text-lg rounded-xl shadow-lg flex justify-center gap-2 mt-4 disabled:opacity-50">
              {enviando ? <><Loader2 className="size-5 animate-spin" /> Enviando...</> : 'Quero Receber Agora'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
