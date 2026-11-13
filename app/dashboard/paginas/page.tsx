'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Plus, ExternalLink, Image as ImageIcon, LayoutTemplate } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// @ts-ignore
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(async () => {
  const { default: RQ } = await import('react-quill')
  const Quill = (await import('quill')).default
  const Size = Quill.import('attributors/class/size') as any
  Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '24px', '32px']
  Quill.register(Size, true)
  return RQ
}, { ssr: false, loading: () => <p className="p-4 text-slate-400 text-sm">Carregando editor...</p> })

const modulosEditor = {
  toolbar: [
    [{ 'size': ['10px', '12px', '14px', '16px', '18px', '24px', '32px', false] }],
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    ['link'],
    ['clean']
  ],
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function PaginasBuilderPage() {
  const [listas, setListas] = useState<any[]>([])
  const [paginas, setPaginas] = useState<any[]>([])
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')

  // Estados do formulário
  const [titulo, setTitulo] = useState('')
  const [subtitulo, setSubtitulo] = useState('')
  const [slug, setSlug] = useState('')
  const [listaId, setListaId] = useState('')
  const [assunto, setAssunto] = useState('')
  const [corpo, setCorpo] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  
  // Estados Visuais
  const [bgColor, setBgColor] = useState('#0f172a')
  const [btnColor, setBtnColor] = useState('#ea580c')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [layoutType, setLayoutType] = useState('left')

  useEffect(() => {
    supabase.from('listas').select('id, nome').then(({data}) => setListas(data || []))
    carregarPaginas()
  }, [])

  const carregarPaginas = async () => {
    const { data } = await supabase.from('landing_pages').select('*').order('created_at', { ascending: false })
    setPaginas(data || [])
  }

  // Função para aplicar templates prontos
  const aplicarTemplate = (tipo: string) => {
    if (tipo === 'ebook') {
      setTitulo('Baixe o E-book Grátis: O Guia Definitivo')
      setSubtitulo('Preencha os dados abaixo e receba o material exclusivo direto no seu e-mail.')
      setAssunto('Aqui está o seu E-book exclusivo!')
      setCorpo('<h2>Olá, {{nome}}!</h2><p>Obrigado por se inscrever. Clique no link abaixo para baixar o seu material.</p><p><a href="LINK_DO_PDF">Clique aqui para baixar o E-book</a></p>')
      setBgColor('#0f172a')
      setBtnColor('#ea580c')
    } else if (tipo === 'webinar') {
      setTitulo('Webinar Exclusivo: Como Dobrar suas Vendas')
      setSubtitulo('Garanta sua vaga gratuita e receba o link de acesso no seu e-mail.')
      setAssunto('Sua vaga para o Webinar está garantida!')
      setCorpo('<h2>Olá, {{nome}}!</h2><p>Sua vaga está reservada. O link de acesso será enviado minutos antes do evento.</p><p><a href="LINK_DO_EVENTO">Acessar a sala do Webinar</a></p>')
      setBgColor('#1e1b4b')
      setBtnColor('#10b981')
    } else if (tipo === 'consultoria') {
      setTitulo('Descubra como escalar o seu negócio')
      setSubtitulo('Preencha o formulário e receba um diagnóstico gratuito da sua empresa.')
      setAssunto('Recebemos seu pedido de diagnóstico!')
      setCorpo('<h2>Olá, {{nome}}!</h2><p>Nossa equipe já recebeu os seus dados e entrará em contato pelo WhatsApp em breve.</p>')
      setBgColor('#111827')
      setBtnColor('#3b82f6')
    }
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setSucesso('')
    const slugFormatado = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const { error } = await supabase.from('landing_pages').insert([{
      titulo, subtitulo, slug: slugFormatado, lista_id: listaId,
      email_assunto: assunto, email_corpo: corpo, redirect_url: redirectUrl,
      bg_color: bgColor, button_color: btnColor, hero_image_url: heroImageUrl, layout_type: layoutType
    }])

    if (error) {
      alert('Erro ao criar página: ' + error.message)
    } else {
      setSucesso(`Página criada! Link: /${slugFormatado}`)
      setTitulo(''); setSubtitulo(''); setSlug(''); setAssunto(''); setCorpo(''); setRedirectUrl(''); setHeroImageUrl('')
      carregarPaginas()
    }
    setSalvando(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Construtor de Páginas</h2>
          <p className="text-slate-600 mt-1">Crie landing pages de alta conversão.</p>
        </div>
      </div>

      {/* TEMPLATES PRONTOS */}
      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
        <h3 className="text-indigo-900 font-bold mb-3 flex items-center gap-2"><LayoutTemplate className="size-5" /> Comece com um Template</h3>
        <div className="flex gap-3 flex-wrap">
          <button type="button" onClick={() => aplicarTemplate('ebook')} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">📚 E-book / Material</button>
          <button type="button" onClick={() => aplicarTemplate('webinar')} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">🎥 Webinar / Evento</button>
          <button type="button" onClick={() => aplicarTemplate('consultoria')} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">💼 Consultoria / Contato</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleCriar} className="space-y-6">
          
          {/* SEÇÃO 1: TEXTOS BÁSICOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Título Principal</label>
              <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Link (Slug)</label>
              <div className="flex items-center">
                <span className="p-3 bg-slate-100 border border-r-0 rounded-l-lg text-slate-500 font-bold">/</span>
                <input type="text" required value={slug} onChange={e => setSlug(e.target.value)} className="w-full p-3 border rounded-r-lg focus:ring-2 focus:ring-blue-500" placeholder="ex: ebook-gratis" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Subtítulo (Chamada para ação)</label>
            <input type="text" required value={subtitulo} onChange={e => setSubtitulo(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Preencha os dados abaixo para receber..." />
          </div>

          {/* SEÇÃO 2: DESIGN E IMAGEM */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2"><ImageIcon className="size-4"/> Design Visual</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Cor de Fundo</label>
                <div className="flex gap-2">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-12 w-12 rounded cursor-pointer border-0 p-0" />
                  <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full p-3 border rounded-lg text-sm uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Cor do Botão</label>
                <div className="flex gap-2">
                  <input type="color" value={btnColor} onChange={e => setBtnColor(e.target.value)} className="h-12 w-12 rounded cursor-pointer border-0 p-0" />
                  <input type="text" value={btnColor} onChange={e => setBtnColor(e.target.value)} className="w-full p-3 border rounded-lg text-sm uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Posição da Imagem</label>
                <select value={layoutType} onChange={e => setLayoutType(e.target.value)} className="w-full p-3 border rounded-lg bg-white">
                  <option value="left">Imagem na Esquerda</option>
                  <option value="right">Imagem na Direita</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">URL da Imagem ou Vídeo (Hero)</label>
              <input type="url" value={heroImageUrl} onChange={e => setHeroImageUrl(e.target.value)} className="w-full p-3 border rounded-lg text-sm" placeholder="https://exemplo.com/imagem-do-ebook.png" />
              <p className="text-[10px] text-slate-400 mt-1">Dica: Cole o link de uma imagem hospedada externamente (ex: Imgur, Drive público ou na sua pasta /public).</p>
            </div>
          </div>

          {/* SEÇÃO 3: CONFIGURAÇÕES DE E-MAIL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Integrar com qual lista?</label>
              <select required value={listaId} onChange={e => setListaId(e.target.value)} className="w-full p-3 border rounded-lg bg-white">
                <option value="">Selecione...</option>
                {listas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Link de Obrigado (Redirect pós-cadastro)</label>
              <input type="url" required value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="https://seusite.com/obrigado" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Assunto do E-mail Automático</label>
            <input type="text" required value={assunto} onChange={e => setAssunto(e.target.value)} className="w-full p-3 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Corpo do E-mail <span className="text-slate-400 font-normal">(Use &#123;&#123;nome&#125;&#125; para personalizar)</span></label>
            <div className="bg-white rounded-xl border border-slate-200 overflow-visible [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[200px]">
              <ReactQuill theme="snow" value={corpo} onChange={setCorpo} modules={modulosEditor} placeholder="Escreva o e-mail que o lead vai receber..." />
            </div>
          </div>

          <button type="submit" disabled={salvando} className="bg-blue-600 text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors w-full md:w-auto">
            {salvando ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />} Salvar e Publicar Página
          </button>
          {sucesso && <p className="text-emerald-600 font-bold text-sm bg-emerald-50 p-3 rounded-lg text-center">{sucesso}</p>}
        </form>
      </div>

      {/* LISTA DE PÁGINAS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4">Suas Páginas Publicadas</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {paginas.map(p => (
            <div key={p.id} className="flex justify-between items-center p-4 border rounded-xl hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-bold text-slate-800 truncate max-w-[200px]">{p.titulo}</p>
                <p className="text-sm text-slate-500">/ {p.slug}</p>
              </div>
              <Link href={`/${p.slug}`} target="_blank" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold bg-blue-50 px-4 py-2 rounded-lg">
                Ver <ExternalLink className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
