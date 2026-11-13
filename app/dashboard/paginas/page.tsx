'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'

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
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-900">Construtor de Páginas</h2>
        <p className="text-slate-600 mt-1">Crie páginas de captura integradas com suas listas.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleCriar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Título da Página</label>
              <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ex: Baixe o E-book Grátis" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Link (Slug)</label>
              <div className="flex items-center">
                <span className="p-3 bg-slate-100 border border-r-0 rounded-l-lg text-slate-500 text-sm">/</span>
                <input type="text" required value={slug} onChange={e => setSlug(e.target.value)} className="w-full p-3 border rounded-r-lg" placeholder="ex: ebook-gratis" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <input type="text" required value={assunto} onChange={e => setAssunto(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Aqui está o seu material!" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Corpo do E-mail (Use &#123;&#123;nome&#125;&#125; para personalizar)</label>
            <textarea required value={corpo} onChange={e => setCorpo(e.target.value)} className="w-full p-3 border rounded-lg h-32 font-mono text-sm" placeholder="<h1>Olá {{nome}}</h1><p>Aqui está o link do seu material...</p>" />
          </div>

          <button type="submit" disabled={salvando} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
            {salvando ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />} Criar Página
          </button>
          {sucesso && <p className="text-emerald-600 font-bold text-sm mt-2">{sucesso}</p>}
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
