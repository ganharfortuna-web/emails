'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// @ts-ignore
import 'react-quill/dist/quill.snow.css'

// Configuração do Editor Visual (ReactQuill)
const ReactQuill = dynamic(async () => {
  const { default: RQ } = await import('react-quill')
  const Quill = (await import('quill')).default
  const Size = Quill.import('attributors/class/size') as any
  Size.whitelist = ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '22px', '24px', '28px', '32px']
  Quill.register(Size, true)
  const Font = Quill.import('attributors/class/font') as any
  Font.whitelist = ['arial', 'helvetica', 'verdana', 'georgia', 'times-new-roman', 'courier-new', 'tahoma']
  Quill.register(Font, true)
  return RQ
}, {
  ssr: false,
  loading: () => <p className="p-4 text-slate-400 text-sm font-medium">Carregando editor visual...</p>
})

const modulosEditor = {
  toolbar: [
    [{ 'font': ['arial', 'helvetica', 'verdana', 'georgia', 'times-new-roman', 'courier-new', 'tahoma'] }],
    [{ 'size': ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', false] }],
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'], // 👈 Opção de inserir link habilitada
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
  const [slug, setSlug] = useState('')
  const [listaId, setListaId] = useState('')
  const [assunto, setAssunto] = useState('')
  const [corpo, setCorpo] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')

  useEffect(() => {
    supabase.from('listas').select('id, nome').then(({data}) => setListas(data || []))
    carregarPaginas()
  }, [])

  const carregarPaginas = async () => {
    const { data } = await supabase.from('landing_pages').select('*').order('created_at', { ascending: false })
    setPaginas(data || [])
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Valida se o editor de texto não está vazio
    const textoLimpo = corpo.replace(/<[^>]*>?/gm, '').trim()
    if (!textoLimpo) {
      alert("O corpo do e-mail não pode estar vazio.")
      return
    }

    setSalvando(true)
    setSucesso('')

    const slugFormatado = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const { error } = await supabase.from('landing_pages').insert([{
      titulo, slug: slugFormatado, lista_id: listaId,
      email_assunto: assunto, email_corpo: corpo, redirect_url: redirectUrl
    }])

    if (error) {
      alert('Erro ao criar página: ' + error.message)
    } else {
      setSucesso(`Página criada com sucesso! Link: /${slugFormatado}`)
      setTitulo(''); setSlug(''); setAssunto(''); setCorpo(''); setRedirectUrl('')
      carregarPaginas()
    }
    setSalvando(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-black text-slate-900">Construtor de Páginas</h2>
        <p className="text-slate-600 mt-1">Crie páginas de captura integradas com suas listas.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleCriar} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Título da Página</label>
              <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Baixe o E-book Grátis" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Link (Slug)</label>
              <div className="flex items-center">
                <span className="p-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-slate-500 text-sm font-bold">/</span>
                <input type="text" required value={slug} onChange={e => setSlug(e.target.value)} className="w-full p-3 border border-slate-200 rounded-r-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="ex: ebook-gratis" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Integrar com qual lista?</label>
              <select required value={listaId} onChange={e => setListaId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {listas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Link de Obrigado (Redirect)</label>
              <input type="url" required value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://seusite.com/obrigado" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Assunto do E-mail Automático</label>
            <input type="text" required value={assunto} onChange={e => setAssunto(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Aqui está o seu material!" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Corpo do E-mail <span className="text-slate-400 font-normal">(Use &#123;&#123;nome&#125;&#125; para personalizar)</span></label>
            
            {/* EDITOR VISUAL AVANÇADO */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-visible
              [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-toolbar]:bg-slate-50 [&_.ql-toolbar]:rounded-t-xl
              [&_.ql-container]:border-none [&_.ql-container]:rounded-b-xl
              [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:text-slate-700 [&_.ql-editor]:text-base
              [&_.ql-tooltip]:!absolute [&_.ql-tooltip]:!bg-white [&_.ql-tooltip]:!text-slate-900 [&_.ql-tooltip]:!border [&_.ql-tooltip]:!border-slate-200 [&_.ql-tooltip]:!shadow-xl [&_.ql-tooltip]:!rounded-xl [&_.ql-tooltip]:!p-4 [&_.ql-tooltip]:!z-50
              [&_.ql-tooltip_input]:!bg-white [&_.ql-tooltip_input]:!text-slate-900 [&_.ql-tooltip_input]:!border [&_.ql-tooltip_input]:!border-slate-300 [&_.ql-tooltip_input]:!rounded-md [&_.ql-tooltip_input]:!px-3 [&_.ql-tooltip_input]:!py-1.5 [&_.ql-tooltip_input]:!text-sm [&_.ql-tooltip_input]:focus:!outline-none [&_.ql-tooltip_input]:focus:!border-blue-500 [&_.ql-tooltip_input]:focus:!ring-1 [&_.ql-tooltip_input]:focus:!ring-blue-500
              [&_.ql-tooltip_a]:!text-blue-600 [&_.ql-tooltip_a]:!font-bold [&_.ql-tooltip_a]:!ml-2 [&_.ql-tooltip_a]:hover:!underline
              [&_.ql-picker]:!text-slate-700
              [&_.ql-picker-label]:!text-slate-700 [&_.ql-picker-label]:hover:!text-slate-900
              [&_.ql-picker-options]:!bg-white [&_.ql-picker-options]:!border [&_.ql-picker-options]:!border-slate-200 [&_.ql-picker-options]:!shadow-lg [&_.ql-picker-options]:!rounded-lg
              [&_.ql-stroke]:!stroke-slate-600
              [&_.ql-fill]:!fill-slate-600
              [&_.ql-picker-item]:!text-slate-700
              [&_.ql-active_.ql-stroke]:!stroke-blue-600
              [&_.ql-active_.ql-fill]:!fill-blue-600
            ">
              <ReactQuill 
                theme="snow" 
                value={corpo} 
                onChange={setCorpo} 
                modules={modulosEditor}
                placeholder="Escreva o e-mail que o lead vai receber após preencher o formulário..." 
              />
            </div>
          </div>

          <button type="submit" disabled={salvando} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50">
            {salvando ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />} Criar Página
          </button>
          {sucesso && <p className="text-emerald-600 font-bold text-sm mt-2 bg-emerald-50 p-3 rounded-lg">{sucesso}</p>}
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4">Suas Páginas Criadas</h3>
        <div className="space-y-3">
          {paginas.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Nenhuma página criada ainda.</p>
          ) : (
            paginas.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-bold text-slate-800">{p.titulo}</p>
                  <p className="text-sm text-slate-500">Link: /{p.slug}</p>
                </div>
                <Link href={`/${p.slug}`} target="_blank" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold bg-blue-50 px-4 py-2 rounded-lg">
                  Abrir Página <ExternalLink className="size-4" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
