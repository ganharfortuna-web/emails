'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, CheckCircle2 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function PublicCapturePage() {
  const { slug } = useParams()
  const [pageConfig, setPageConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

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
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, whatsapp, slug })
      })
      const data = await res.json()
      if (data.redirect) {
        window.location.href = data.redirect
      } else {
        setSucesso(true)
      }
    } catch (err) {
      alert('Erro de conexão.')
    }
    setEnviando(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-white size-10" /></div>
  if (!pageConfig) return <div className="min-h-screen flex items-center justify-center font-bold text-2xl bg-slate-950 text-white">Página não encontrada.</div>

  // Cores dinâmicas configuradas no painel
  const bgColor = pageConfig.bg_color || '#0f172a'
  const btnColor = pageConfig.button_color || '#ea580c'
  const isLayoutLeft = pageConfig.layout_type === 'left'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 transition-colors duration-500" style={{ backgroundColor: bgColor }}>
      <div className={`w-full max-w-5xl flex flex-col md:flex-row bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl overflow-hidden shadow-2xl ${isLayoutLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
        
        {/* Lado da Imagem (Hero) */}
        {pageConfig.hero_image_url && (
          <div className="md:w-1/2 p-8 md:p-12 flex items-center justify-center relative bg-black/20">
            <img 
              src={pageConfig.hero_image_url} 
              alt="Material Exclusivo" 
              className="w-full max-w-sm object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 rounded-xl"
            />
          </div>
        )}

        {/* Lado do Formulário */}
        <div className={`${pageConfig.hero_image_url ? 'md:w-1/2' : 'w-full max-w-2xl mx-auto'} p-8 md:p-12 flex flex-col justify-center bg-white`}>
          {sucesso ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-10 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-black text-slate-900">Tudo Certo!</h2>
              <p className="text-slate-600">Seu cadastro foi recebido. Verifique sua caixa de entrada.</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 leading-tight">{pageConfig.titulo}</h1>
                <p className="text-slate-600 text-lg">{pageConfig.subtitulo}</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Seu Nome" required value={nome} onChange={e => setNome(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 font-medium" />
                <input type="email" placeholder="Seu E-mail" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 font-medium" />
                <input type="tel" placeholder="Seu WhatsApp" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 font-medium" />
                
                <button type="submit" disabled={enviando} style={{ backgroundColor: btnColor }}
                  className="w-full py-4 text-white font-black text-lg rounded-xl shadow-lg hover:opacity-90 transition-opacity flex justify-center gap-2 mt-4">
                  {enviando ? <><Loader2 className="size-5 animate-spin" /> Enviando...</> : 'Quero Receber Agora'}
                </button>
                <p className="text-center text-xs text-slate-400 mt-4">Seus dados estão 100% seguros.</p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
