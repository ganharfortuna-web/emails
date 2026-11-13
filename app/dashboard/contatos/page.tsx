'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Search, Filter, Trash2, UserCircle2, MessageCircle, Download, Loader2, Upload, X, FileText, ClipboardPaste } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ContatosPage() {
  const [contatos, setContatos] = useState<any[]>([])
  const [listas, setListas] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [filtroLista, setFiltroLista] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [exportando, setExportando] = useState(false)

  // Estados para Importação
  const [modalImportar, setModalImportar] = useState(false)
  const [modoImportacao, setModoImportacao] = useState<'arquivo' | 'colar'>('arquivo')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [textoColado, setTextoColado] = useState('')
  const [listaDestino, setListaDestino] = useState('')
  const [importando, setImportando] = useState(false)

  useEffect(() => {
    carregarListas()
  }, [])

  useEffect(() => {
    carregarContatos()
  }, [busca, filtroLista])

  const carregarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome')
    if (data) setListas(data)
  }

  const carregarContatos = async () => {
    setCarregando(true)
    let query = supabase.from('contatos').select('*, listas(nome)').order('created_at', { ascending: false }).limit(100)

    if (filtroLista) query = query.eq('lista_id', filtroLista)
    if (busca) query = query.ilike('email', `%${busca}%`)

    const { data } = await query
    if (data) setContatos(data)
    setCarregando(false)
  }

  const deletarContato = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar este contato?')) return
    await supabase.from('contatos').delete().eq('id', id)
    carregarContatos()
  }

  const formatarWhatsApp = (numero: string) => {
    if (!numero) return null
    let numLimpo = numero.replace(/\D/g, '')
    if (numLimpo.length === 10 || numLimpo.length === 11) {
      numLimpo = `55${numLimpo}`
    }
    return `https://wa.me/${numLimpo}`
  }

  // ✅ FUNÇÃO DE IMPORTAR SIMPLIFICADA (SÓ EXTRAI OS E-MAILS)
  const processarImportacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listaDestino) {
      alert('Selecione uma lista de destino.')
      return
    }

    setImportando(true)

    const processarTexto = async (texto: string) => {
      // Regex que encontra qualquer e-mail válido no texto
      const regexEmail = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const matches = texto.match(regexEmail) || [];
      
      if (matches.length === 0) {
        alert('Nenhum e-mail válido encontrado no texto/arquivo.')
        setImportando(false)
        return;
      }

      // Remove duplicatas e formata
      const emailsUnicos = [...new Set(matches.map(email => email.toLowerCase().trim()))];

      const novosContatos = emailsUnicos.map(email => ({
        nome: 'Lead', // Nome padrão
        email: email,
        whatsapp: null, // Sem whatsapp
        lista_id: listaDestino, 
        status: 'ativo'
      }))

      try {
        // Insere em blocos de 500
        for (let i = 0; i < novosContatos.length; i += 500) {
          const bloco = novosContatos.slice(i, i + 500)
          const { error } = await supabase.from('contatos').upsert(bloco, { onConflict: 'email' })
          if (error) throw error
        }

        alert(`✅ ${novosContatos.length} e-mails importados com sucesso!`)
        setModalImportar(false)
        setArquivo(null)
        setTextoColado('')
        setListaDestino('')
        carregarContatos()
      } catch (err: any) {
        alert('Erro ao importar: ' + err.message)
      }
      
      setImportando(false)
    }

    if (modoImportacao === 'colar') {
      if (!textoColado.trim()) {
        alert('Cole alguns e-mails na caixa de texto.')
        setImportando(false)
        return;
      }
      await processarTexto(textoColado)
    } else {
      if (!arquivo) {
        alert('Selecione um arquivo.')
        setImportando(false)
        return;
      }
      const reader = new FileReader()
      reader.onload = async (event) => {
        const csvText = event.target?.result as string
        await processarTexto(csvText)
      }
      reader.readAsText(arquivo)
    }
  }

  const baixarCSV = async () => {
    setExportando(true)
    try {
      let todosContatosExport: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        let query = supabase.from('contatos').select('*, listas(nome)').eq('status', 'ativo').range(page * pageSize, (page + 1) * pageSize - 1)
        if (filtroLista) query = query.eq('lista_id', filtroLista)
        
        const { data, error } = await query
        if (error) throw error

        if (data && data.length > 0) {
          todosContatosExport = [...todosContatosExport, ...data]
          if (data.length < pageSize) hasMore = false
          else page++
        } else {
          hasMore = false
        }
      }

      if (todosContatosExport.length === 0) {
        alert('Nenhum contato ativo para exportar.')
        setExportando(false)
        return
      }

      const cabecalho = "Nome,Email,WhatsApp,Lista,Status\n"
      const linhas = todosContatosExport.map(c => 
        `"${c.nome || ''}","${c.email}","${c.whatsapp || ''}","${c.listas?.nome || ''}","${c.status}"`
      ).join("\n")
      
      const csvContent = "\uFEFF" + cabecalho + linhas
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `contatos_limpos_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (err: any) {
      alert(err.message)
    }
    setExportando(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Contatos</h2>
          <p className="text-slate-600 mt-1">Gerencie a sua base de leads.</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setModalImportar(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-colors">
            <Upload className="size-4" /> Importar
          </button>
          
          <button onClick={baixarCSV} disabled={exportando || carregando} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50">
            {exportando ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {exportando ? 'Gerando...' : 'Baixar CSV'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input type="text" placeholder="Buscar por e-mail..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" />
        </div>
        <div className="relative sm:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <select value={filtroLista} onChange={e => setFiltroLista(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none text-slate-800">
            <option value="">Todas as Listas</option>
            {listas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500">
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4 text-center">Lista</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Data</th>
                <th className="px-6 py-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500"><Loader2 className="size-6 animate-spin mx-auto text-blue-500" /></td></tr>
              ) : contatos.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhum contato encontrado.</td></tr>
              ) : (
                contatos.map((c) => {
                  const waLink = formatarWhatsApp(c.whatsapp)
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserCircle2 className="size-10 text-slate-300" />
                          <div>
                            <p className="font-bold text-slate-800">{c.nome || 'Sem nome'}</p>
                            <p className="text-sm text-slate-500">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {waLink ? (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm">
                            <MessageCircle className="size-4" /> {c.whatsapp}
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Não informado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-md">{c.listas?.nome || c.lista_id || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-md ${c.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : c.status === 'bounced' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {c.status || 'ativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => deletarContato(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="size-5" /></button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-sm text-slate-500">
          <span>Mostrando os {contatos.length} contatos mais recentes na tela (use o CSV para ver todos)</span>
        </div>
      </div>

      {/* ✅ MODAL DE IMPORTAÇÃO MELHORADO */}
      {modalImportar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b bg-blue-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-blue-900 flex items-center gap-2"><Upload className="size-5" /> Importar Contatos</h2>
                <p className="text-blue-700 text-sm mt-1">Adicione e-mails à sua lista.</p>
              </div>
              <button onClick={() => { setModalImportar(false); setArquivo(null); setTextoColado('') }} className="text-blue-400 hover:text-blue-700"><X className="size-5" /></button>
            </div>
            
            <form onSubmit={processarImportacao} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Selecione a Lista de Destino *</label>
                <select required value={listaDestino} onChange={e => setListaDestino(e.target.value)} className="w-full p-3 border rounded-lg bg-white text-slate-800">
                  <option value="">Escolha uma lista...</option>
                  {listas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>

              {/* ABAS DE IMPORTAÇÃO */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button type="button" onClick={() => setModoImportacao('arquivo')} className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 ${modoImportacao === 'arquivo' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><FileText className="size-4"/> Enviar Arquivo</button>
                <button type="button" onClick={() => setModoImportacao('colar')} className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 ${modoImportacao === 'colar' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><ClipboardPaste className="size-4"/> Colar E-mails</button>
              </div>

              {modoImportacao === 'arquivo' ? (
                <div>
                  <input type="file" accept=".csv,.txt" onChange={e => setArquivo(e.target.files?.[0] || null)} className="w-full p-2 border rounded-lg text-sm bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" />
                  <p className="text-xs text-slate-500 mt-2">Aceita CSV ou TXT. O sistema vai extrair todos os e-mails válidos.</p>
                </div>
              ) : (
                <div>
                  <textarea 
                    value={textoColado}
                    onChange={e => setTextoColado(e.target.value)}
                    placeholder="Cole aqui a lista de e-mails. Pode ser um por linha, separados por vírgula, ou copiados de uma planilha."
                    className="w-full p-3 border rounded-lg h-32 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-2">O sistema vai varrer o texto e encontrar todos os e-mails.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => { setModalImportar(false); setArquivo(null); setTextoColado('') }} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Cancelar</button>
                <button type="submit" disabled={importando} className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
                  {importando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {importando ? 'Importando...' : 'Iniciar Importação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
