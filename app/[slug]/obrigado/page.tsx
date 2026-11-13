'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, CheckCircle2, MessageCircle, Download } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ThankYouPage() {
  const { slug } = useParams()
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('landing_pages').select('*').eq('slug', slug).single()
      setConfig(data)
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-white size-10" /></div>
  if (!config) return <div className="min-h-screen flex items-center justify-center font-bold text-2xl bg-slate-950 text-white">Página não encontrada.</div>

  const bgColor = config.bg_color || '#0f172a'

  let waLink = null
  if (config.thank_you_whatsapp) {
    let numLimpo = config.thank_you_whatsapp.replace(/\D/g, '')
    if (numLimpo.length === 10 || numLimpo.length === 11) numLimpo = `55${numLimpo}`
    waLink = `https://wa.me/${numLimpo}?text=Olá, acabei de me cadastrar e tenho uma dúvida!`
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ backgroundColor: bgColor }}>
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center relative overflow-hidden">
        
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="size-12 text-emerald-600" />
        </div>

        <h1 className="text-4xl font-black text-slate-900 mb-4">{config.thank_you_title || 'Tudo Certo!'}</h1>
        
        <div 
          className="text-slate-600 text-lg leading-relaxed mb-8 ql-editor !p-0 !text-center"
          dangerouslySetInnerHTML={{ __html: config.thank_you_text || '<p>Seu cadastro foi recebido com sucesso. Verifique sua caixa de entrada.</p>' }} 
        />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {config.thank_you_btn_link && (
            <a href={config.thank_you_btn_link} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 text-white font-bold py-4 px-8 rounded-xl shadow-lg" style={{ backgroundColor: config.button_color || '#ea580c' }}>
              <Download className="size-5" />
              {config.thank_you_btn_text || 'Baixar Material'}
            </a>
          )}

          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold py-4 px-8 rounded-xl hover:bg-emerald-100 transition-colors">
              <MessageCircle className="size-5" />
              Falar no WhatsApp
            </a>
          )}
        </div>

      </div>
    </div>
  )
}
