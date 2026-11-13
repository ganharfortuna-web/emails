'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Plus, ExternalLink, Image as ImageIcon, LayoutTemplate, Pencil, XCircle } from 'lucide-react'
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

  // Estado de controle de edição
  const [editandoId, setEditandoId] = useState<string | null>(null)

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

  const limparFormulario = () => {
    setEditandoId(null)
    setTitulo(''); setSubtitulo(''); setSlug(''); setAssunto(''); setCorpo(''); setRedirectUrl(''); setHeroImageUrl('')
    setListaId('')
    setBgColor('#0f172a'); setBtnColor('#ea580c'); setLayoutType('left')
    setSucesso('')
  }

  // Função para carregar página existente no formulário
  const handleEditar = (p: any) => {
    setEditandoId(p.id)
    setTitulo(p.titulo)
    setSubtitulo(p.subtitulo || '')
    setSlug(p.slug)
    setListaId(p.lista_id ? String(p.lista_id) : '')
    setAssunto(p.email_assunto)
    setCorpo(p.email_corpo)
    setRedirectUrl(p.redirect_url)
    setBgColor(p.bg_color || '#0f172a')
    setBtnColor(p.button_color || '#ea580c')
    setHeroImageUrl(p.hero_image_url || '')
    setLayoutType(p.layout_type || 'left')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Templates Profissionais
  const aplicarTemplate = (tipo: string) => {
    limparFormulario()
    if (tipo === 'ebook') {
      setTitulo('Baixe o Guia Definitivo: Como Escalar sua Autoridade')
      setSubtitulo('Preencha os dados ao lado e receba o material exclusivo direto no seu e-mail.')
      setAssunto('O seu E-book exclusivo chegou!')
      setCorpo('<h2>Olá, {{nome}}!</h2><p>Obrigado por se inscrever. O seu material está pronto.</p><p><a href="LINK_DO_PDF">Clique aqui para fazer o download do E-book</a></p>')
      setBgColor('#0f172a')
      setBtnColor('#ea580c')
      setHeroImageUrl('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop')
    } else if (tipo === 'webinar') {
      setTitulo('Webinar Exclusivo: O Futuro do Marketing Digital')
      setSubtitulo('Garanta sua vaga gratuita e receba o link de acesso diretamente no seu e-mail.')
      setAssunto('Sua vaga para o Webinar está garantida!')
      setCorpo('<h2>Olá, {{nome}}!</h2><p>Sua vaga está reservada. O link de acesso será enviado minutos antes do evento.</p><p><a href="LINK_DO_EVENTO">Acessar a sala do Webinar</a></p>')
      setBgColor('#1e1b4b')
      setBtnColor('#10b981')
      setHeroImageUrl('https://images.unsplash.com/photo-1591115765373-5207764f72e7?q=80&w=1000&auto=format&fit=crop')
    } else if (tipo === 'consultoria') {
      setTitulo('Descubra como dobrar o faturamento da sua empresa')
      setSubtitulo('Preencha o formulário e receba um diagnóstico gratuito da sua operação.')
      setAssunto('Recebemos o seu pedido de diagnóstico!')
      setCorpo('<h2>Olá, {{nome}}!</h2><p>Nossa equipe já recebeu os seus dados e entrará em contato pelo WhatsApp em breve para agendar a sua consultoria.</p>')
      setBgColor('#111827')
      setBtnColor('#3b82f6')
      setHeroImageUrl('https://images.unsplash.com/photo-1556761175-5973dc0f32d7?q=80&w=1000&auto=format&fit=crop')
    }
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setSucesso('')
    
    // Validação básica do editor
    const textoLimpo = corpo.replace(/<[^>]*>?/gm, '').trim()
    if (!textoLimpo) {
      alert("O corpo do e-mail não pode estar vazio.")
      setSalvando(false)
      return
    }

    const slugFormatado = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const payload = {
      titulo, subtitulo, slug: slugFormatado, lista_id: listaId,
      email_assunto: assunto, email_corpo: corpo, redirect_url: redirectUrl,
      bg_color: bgColor, button_color: btnColor, hero_image_url: heroImageUrl, layout_type: layoutType
    }

    let error;
    if (editandoId) {
      const res = await supabase.from('landing_pages').update(payload).eq('id', editandoId)
      error = res.error
    } else {
      const res = await supabase.from('landing_pages').insert([payload])
      error = res.error
    }

    if (error) {
      alert('Erro ao salvar página: ' + error.message)
    } else {
      setSucesso(`Página ${editandoId ? 'atualizada' : 'criada'} com sucesso! Link: /${slugFormatado}`)
      limparFormulario()
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
      {!editandoId && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
          <h3 className="text-indigo-900 font-bold mb-3 flex items-center gap-2"><LayoutTemplate className="size-5" /> Comece com um Template Profissional</h3>
          <div className="flex gap-3 flex-wrap">
            <button type="button" onClick={() => aplicarTemplate('ebook')} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors shadow-sm">📚 E-book / Material</button>
            <button type="button" onClick={() => aplicarTemplate('webinar')} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors shadow-sm">🎥 Webinar / Evento</button>
            <button type="button" onClick={() => aplicarTemplate('consultoria')} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors shadow-sm">💼 Consultoria / Contato</button>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        {editandoId && (
          <div className="absolute top-0 left-0 w-full bg-amber-100 text-amber-800 text-sm font-bold px-6 py-2 flex justify-between items-center">
            Você está editando uma página existente.
            <button onClick={limparFormulario} className="flex items-center gap-1 hover:text-amber-950"><XCircle className="size-4"/> Cancelar Edição</button>
          </div>
        )}

        <form onSubmit={handleCriar} className={`space-y-6 ${editandoId ? 'mt-6' : ''}`}>
          
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
            <input type="text" required value={subtitulo} onChange={e => setSubtitulo(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

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
              <label className="block text-xs font-bold text-slate-600 mb-1">URL da Imagem (Hero)</label>
              <input type="url" value={heroImageUrl} onChange={e => setHeroImageUrl(e.target.value)} className="w-full p-3 border rounded-lg text-sm" placeholder="https://imagem.png" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Integrar com qual lista?</label>
              <select required value={listaId} onChange={e => setListaId(e.target.value)} className="w-full p-3 border rounded-lg bg-white">
                <option value="">Selecione...</option>
                {listas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Link de Obrigado (Redirect)</label>
              <input type="url" required value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="https://seusite.com/obrigado" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Assunto do E-mail Automático</label>
            <input type="text" required value={assunto} onChange={e => setAssunto(e.target.value)} className="w-full p-3 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Corpo do E-mail <span className="text-slate-400 font-normal">(Use &#123;&#123;nome&#125;&#125; para personalizar)</span></label>
            
            {/* CORREÇÃO DA COR DO TEXTO NO EDITOR AQUI */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-visible 
              [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-none 
              [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:!text-black [&_.ql-editor_p]:!text-black [&_.ql-editor_span]:!text-black
              [&_.ql-editor.ql-blank::before]:!text-slate-400">
              <ReactQuill theme="snow" value={corpo} onChange={setCorpo} modules={modulosEditor} placeholder="Escreva o e-mail que o lead vai receber..." />
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={salvando} className="bg-blue-600 text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors flex-1 md:flex-none">
              {salvando ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />} 
              {editandoId ? 'Salvar Alterações' : 'Salvar e Publicar Página'}
            </button>
            
            {editandoId && (
              <button type="button" onClick={limparFormulario} className="bg-slate-200 text-slate-700 font-bold px-8 py-4 rounded-xl hover:bg-slate-300 transition-colors">
                Cancelar
              </button>
            )}
          </div>
          {sucesso && <p className="text-emerald-600 font-bold text-sm bg-emerald-50 p-3 rounded-lg text-center">{sucesso}</p>}
        </form>
      </div>

      {/* LISTA DE PÁGINAS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4">Suas Páginas Publicadas</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {paginas.map(p => (
            <div key={p.id} className="flex flex-col justify-between p-4 border rounded-xl hover:border-blue-300 transition-colors bg-slate-50">
              <div className="mb-4">
                <p className="font-bold text-slate-800 text-lg">{p.titulo}</p>
                <p className="text-sm text-slate-500">/ {p.slug}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/${p.slug}`} target="_blank" className="flex-1 justify-center text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold bg-blue-100 px-4 py-2 rounded-lg transition-colors">
                  Visualizar <ExternalLink className="size-4" />
                </Link>
                <button onClick={() => handleEditar(p)} className="flex-1 justify-center text-amber-700 hover:text-amber-900 flex items-center gap-1 text-sm font-bold bg-amber-100 px-4 py-2 rounded-lg transition-colors">
                  Editar <Pencil className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
