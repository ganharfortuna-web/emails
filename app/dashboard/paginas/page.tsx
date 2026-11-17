'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Plus, ExternalLink, Image as ImageIcon, LayoutTemplate, Pencil, XCircle, CheckCircle2 } from 'lucide-react'
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
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // Estados do formulário principal
  const [titulo, setTitulo] = useState('')
  const [subtitulo, setSubtitulo] = useState('')
  const [slug, setSlug] = useState('')
  const [listaId, setListaId] = useState('')
  const [assunto, setAssunto] = useState('')
  const [corpo, setCorpo] = useState('')
  
  // Design
  const [bgColor, setBgColor] = useState('#0f172a')
  const [btnColor, setBtnColor] = useState('#ea580c')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [layoutType, setLayoutType] = useState('left')

  // Configurações da Página de Obrigado
  const [thankYouType, setThankYouType] = useState('external')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [thankYouTitle, setThankYouTitle] = useState('Tudo Certo!')
  const [thankYouText, setThankYouText] = useState('')
  const [thankYouWhatsapp, setThankYouWhatsapp] = useState('')
  const [thankYouBtnLink, setThankYouBtnLink] = useState('')
  const [thankYouBtnText, setThankYouBtnText] = useState('Baixar Material')

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
    setTitulo(''); setSubtitulo(''); setSlug(''); setAssunto(''); setCorpo('');
    setHeroImageUrl(''); setListaId(''); setRedirectUrl('')
    setBgColor('#0f172a'); setBtnColor('#ea580c'); setLayoutType('left')
    setThankYouType('external')
    setThankYouTitle('Tudo Certo!'); setThankYouText(''); setThankYouWhatsapp(''); setThankYouBtnLink(''); setThankYouBtnText('Baixar Material')
    setSucesso('')
  }

  const handleEditar = (p: any) => {
    setEditandoId(p.id)
    setTitulo(p.titulo); setSubtitulo(p.subtitulo || ''); setSlug(p.slug)
    setListaId(p.lista_id ? String(p.lista_id) : ''); setAssunto(p.email_assunto); setCorpo(p.email_corpo)
    setBgColor(p.bg_color || '#0f172a'); setBtnColor(p.button_color || '#ea580c')
    setHeroImageUrl(p.hero_image_url || ''); setLayoutType(p.layout_type || 'left')
    
    setThankYouType(p.thank_you_type || 'external')
    setRedirectUrl(p.redirect_url || '')
    setThankYouTitle(p.thank_you_title || 'Tudo Certo!')
    setThankYouText(p.thank_you_text || '')
    setThankYouWhatsapp(p.thank_you_whatsapp || '')
    setThankYouBtnLink(p.thank_you_btn_link || '')
    setThankYouBtnText(p.thank_you_btn_text || 'Baixar Material')
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const aplicarTemplate = (tipo: string) => {
    limparFormulario()
    setThankYouText('<p>Seu cadastro foi recebido com sucesso.</p><p>O link do material também foi enviado para o seu e-mail.</p><p>Caso prefira, clique no botão abaixo para acessar agora mesmo:</p>')
    setThankYouType('internal')
    setThankYouWhatsapp('5561982096982')
    
    if (tipo === 'ebook') {
      setTitulo('Baixe o Guia Definitivo: Como Escalar sua Autoridade')
      setSubtitulo('Preencha os dados ao lado e receba o material exclusivo direto no seu e-mail.')
      setAssunto('O seu E-book exclusivo chegou!')
      setCorpo('<h2>Olá, {{nome}}!</h2><p>Obrigado por se inscrever. O seu material está pronto.</p><p><a href="LINK_DO_PDF">Clique aqui para fazer o download do E-book</a></p>')
      setBgColor('#0f172a'); setBtnColor('#ea580c')
      setHeroImageUrl('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop')
      setThankYouBtnLink('https://exemplo.com/seu-ebook.pdf')
      setThankYouBtnText('Baixar E-book Agora')
    } else if (tipo === 'webinar') {
      setTitulo('Webinar Exclusivo: O Futuro do Marketing Digital')
      setSubtitulo('Garanta sua vaga gratuita e receba o link de acesso diretamente no seu e-mail.')
      setAssunto('Sua vaga para o Webinar está garantida!')
      setCorpo('<h2>Olá, {{nome}}!</h2><p>Sua vaga está reservada. O link de acesso será enviado minutos antes do evento.</p><p><a href="LINK_DO_EVENTO">Acessar a sala do Webinar</a></p>')
      setBgColor('#1e1b4b'); setBtnColor('#10b981')
      setHeroImageUrl('https://images.unsplash.com/photo-1591115765373-5207764f72e7?q=80&w=1000&auto=format&fit=crop')
      setThankYouBtnLink('https://exemplo.com/sala-do-webinar')
      setThankYouBtnText('Entrar no Webinar')
    }
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true); setSucesso('')
    
    const textoLimpo = corpo.replace(/<[^>]*>?/gm, '').trim()
    if (!textoLimpo) { alert("O corpo do e-mail não pode estar vazio."); setSalvando(false); return }

    const slugFormatado = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    // ✅ INSERE O RODAPÉ AUTOMÁTICO SE NÃO EXISTIR
    let corpoFinal = corpo;
    if (!corpo.includes('descadastrar')) {
      corpoFinal += `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: #64748b;">
          <p>Este e-mail foi enviado para: <strong>{{email}}</strong></p>
          <p>Não quer mais receber nossos e-mails? <a href="{{unsubscribe_link}}" style="color: #64748b; text-decoration: underline;">Clique aqui para descadastrar</a>.</p>
        </div>
      `;
    }

    const payload = {
      titulo, subtitulo, slug: slugFormatado, lista_id: listaId,
      email_assunto: assunto, email_corpo: corpoFinal,
      bg_color: bgColor, button_color: btnColor, hero_image_url: heroImageUrl, layout_type: layoutType,
      thank_you_type: thankYouType,
      redirect_url: thankYouType === 'external' ? redirectUrl : '',
      thank_you_title: thankYouTitle,
      thank_you_text: thankYouText,
      thank_you_whatsapp: thankYouWhatsapp,
      thank_you_btn_link: thankYouBtnLink,
      thank_you_btn_text: thankYouBtnText
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
      <div>
        <h2 className="text-3xl font-black text-slate-900">Construtor de Páginas</h2>
        <p className="text-slate-600 mt-1">Crie landing pages de alta conversão.</p>
      </div>

      {!editandoId && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
          <h3 className="text-indigo-900 font-bold mb-3 flex items-center gap-2"><LayoutTemplate className="size-5" /> Comece com um Template Profissional</h3>
          <div className="flex gap-3 flex-wrap">
            <button type="button" onClick={() => aplicarTemplate('ebook')} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors shadow-sm">📚 E-book / Material</button>
            <button type="button" onClick={() => aplicarTemplate('webinar')} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors shadow-sm">🎥 Webinar / Evento</button>
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

        <form onSubmit={handleCriar} className={`space-y-8 ${editandoId ? 'mt-6' : ''}`}>
          
          {/* SEÇÃO 1: DADOS DA PÁGINA DE CAPTURA */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-slate-800 border-b pb-2">1. Configurações da Captura</h4>
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
          </div>

          {/* SEÇÃO 2: DESIGN */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-slate-800 border-b pb-2">2. Design Visual</h4>
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

          {/* SEÇÃO 3: E-MAIL E LISTA */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-slate-800 border-b pb-2">3. E-mail e Integração</h4>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Integrar com qual lista?</label>
              <select required value={listaId} onChange={e => setListaId(e.target.value)} className="w-full p-3 border rounded-lg bg-white">
                <option value="">Selecione...</option>
                {listas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Assunto do E-mail Automático</label>
              <input type="text" required value={assunto} onChange={e => setAssunto(e.target.value)} className="w-full p-3 border rounded-lg" />
            </div>
            <div>
              {/* ✅ TEXTO DE AJUDA ATUALIZADO AQUI */}
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Corpo do E-mail 
                <span className="text-slate-400 font-normal ml-1">
                  (Use &#123;&#123;nome&#125;&#125; e &#123;&#123;email&#125;&#125; para personalizar)
                </span>
              </label>
              <div className="bg-white rounded-xl border border-slate-200 overflow-visible [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:!text-black">
                <ReactQuill theme="snow" value={corpo} onChange={setCorpo} modules={modulosEditor} />
              </div>
              <p className="text-xs text-blue-600 mt-2 font-medium">✨ O rodapé com o e-mail do cliente e o link de descadastro será adicionado automaticamente ao salvar.</p>
            </div>
          </div>

          {/* SEÇÃO 4: PÁGINA DE OBRIGADO */}
          <div className="space-y-4 p-5 bg-blue-50 rounded-xl border border-blue-100">
            <h4 className="font-bold text-lg text-blue-900 border-b border-blue-200 pb-2">4. Página de Obrigado (Após o Cadastro)</h4>
            
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={thankYouType === 'external'} onChange={() => setThankYouType('external')} className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-700">Redirecionar para link externo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={thankYouType === 'internal'} onChange={() => setThankYouType('internal')} className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-700">Usar Página Pronta do Sistema</span>
              </label>
            </div>

            {thankYouType === 'external' ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Link de Obrigado Externo (URL)</label>
                <input type="url" required={thankYouType === 'external'} value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="https://seusite.com/obrigado" />
              </div>
            ) : (
              <div className="space-y-4 bg-white p-4 rounded-lg border border-blue-200">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Título da Página</label>
                  <input type="text" value={thankYouTitle} onChange={e => setThankYouTitle(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ex: Tudo Certo!" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Texto de Agradecimento</label>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-visible [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[120px] [&_.ql-editor]:!text-black">
                    <ReactQuill theme="snow" value={thankYouText} onChange={setThankYouText} modules={modulosEditor} placeholder="Ex: Seu e-book já foi enviado para o seu e-mail. Se preferir, clique abaixo para baixar agora!" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Link do Botão (Download/Link)</label>
                    <input type="url" value={thankYouBtnLink} onChange={e => setThankYouBtnLink(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="https://link-do-pdf.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Texto do Botão</label>
                    <input type="text" value={thankYouBtnText} onChange={e => setThankYouBtnText(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Baixar E-book Agora" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Número do WhatsApp (Opcional - para tirar dúvidas)</label>
                  <input type="tel" value={thankYouWhatsapp} onChange={e => setThankYouWhatsapp(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ex: 61999999999" />
                  <p className="text-xs text-slate-500 mt-1">Deixe em branco se não quiser o botão do WhatsApp.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={salvando} className="bg-blue-600 text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors flex-1 md:flex-none">
              {salvando ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />} 
              {editandoId ? 'Salvar Alterações' : 'Salvar e Publicar'}
            </button>
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
