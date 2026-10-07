'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Trash2, Loader2, UserCircle, Filter, Eraser, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, ClipboardPaste, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ContatosPage() {
  const [contatos, setContatos] = useState<any[]>([])
  const [listas, setListas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  const [pagina, setPagina] = useState(1)
  const [totalContatos, setTotalContatos] = useState(0)
  const itensPorPagina = 50

  const [busca, setBusca] = useState('')
  const [filtroLista, setFiltroLista] = useState('todas')

  const [modalAberto, setModalAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaListaId, setNovaListaId] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal limpeza
  const [modalLimpeza, setModalLimpeza] = useState(false)
  const [mesesFrios, setMesesFrios] = useState(3)
  const [limpando, setLimpando] = useState(false)

  // Modal de importação
  const [modalImport, setModalImport] = useState(false)
  const [modoImport, setModoImport] = useState<'csv' | 'colar'>('colar')
  const [importListaId, setImportListaId] = useState('')
  const [textoImport, setTextoImport] = useState('')
  const [csvArquivo, setCsvArquivo] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState<{ inseridos: number; duplicados: number; invalidos: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { buscarListas() }, [])

  useEffect(() => {
    buscarContatos()
  }, [pagina, filtroLista, busca])

  const buscarListas = async () => {
    const { data } = await supabase.from('listas').select('id, nome').order('nome')
    if (data) setListas(data)
  }

  const buscarContatos = async () => {
    setCarregando(true)
    let query = supabase.from('contatos').select('*, listas(nome)', { count: 'exact' })
    if (filtroLista !== 'todas') query = query.eq('lista_id', filtroLista)
    if (busca) query = query.ilike('email', `%${busca}%`)

    const de = (pagina - 1) * itensPorPagina
    const ate = de + itensPorPagina - 1

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(de, ate)

    if (data) setContatos(data)
    if (count !== null) setTotalContatos(count)
    setCarregando(false)
  }

  const salvarContato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoEmail.trim() || !novaListaId) return
    setSalvando(true)

    const { error } = await supabase.from('contatos').insert([{
      nome: novoNome || 'Lead Manual',
      email: novoEmail.toLowerCase().trim(),
      lista_id: novaListaId,
      status: 'ativo'
    }])

    if (!error) {
      setNovoNome(''); setNovoEmail(''); setNovaListaId(''); setModalAberto(false); buscarContatos()
    } else {
      alert('Erro ao salvar contato: ' + error.message)
    }
    setSalvando(false)
  }

  const deletarContato = async (id: string) => {
    if (!confirm('Apagar este contato permanentemente?')) return
    const { error } = await supabase.from('contatos').delete().eq('id', id)
    if (!error) buscarContatos()
  }

  const executarLimpezaFrios = async () => {
    setLimpando(true)
    const dataLimite = new Date()
    dataLimite.setMonth(dataLimite.getMonth() - mesesFrios)

    const { error } = await supabase
      .from('contatos')
      .delete()
      .lt('created_at', dataLimite.toISOString())

    if (!error) {
      alert('Limpeza concluída!')
      setModalLimpeza(false)
      setPagina(1)
      buscarContatos()
    } else {
      alert('Erro: ' + error.message)
    }
    setLimpando(false)
  }

  // ===== IMPORTAÇÃO =====
  const processarTexto = (texto: string) => {
    const linhas = texto.split('\n').filter(l => l.trim())
    const resultado: { nome: string; email: string }[] = []
    const vistos = new Set<string>()

    for (const linha of linhas) {
      const partes = linha.split(/[,;\t]/).map(p => p.trim())
      let nome = ''
      let email = ''

      // Detecta qual coluna é email
      for (const p of partes) {
        if (p.includes('@') && p.includes('.')) {
          email = p.toLowerCase()
        } else if (p && !nome) {
          nome = p
        }
      }

      if (email && !vistos.has(email)) {
        vistos.add(email)
        resultado.push({ nome: nome || 'Lead', email })
      }
    }

    return resultado
  }

  const lerArquivoCSV = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(String(e.target?.result || ''))
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const executarImportacao = async () => {
    if (!importListaId) {
      alert('Selecione uma lista de destino.')
      return
    }

    setImportando(true)
    setResultadoImport(null)

    try {
      let texto = ''
      if (modoImport === 'csv' && csvArquivo) {
        texto = await lerArquivoCSV(csvArquivo)
      } else if (modoImport === 'colar') {
        texto = textoImport
      }

      if (!texto.trim()) {
        alert('Nenhum dado para importar.')
        setImportando(false)
        return
      }

      const parsed = processarTexto(texto)
      if (parsed.length === 0) {
        alert('Nenhum e-mail válido encontrado no texto.')
        setImportando(false)
        return
      }

      // Busca e-mails já existentes nessa lista
      const emails = parsed.map(p => p.email)
      const { data: existentes } = await supabase
        .from('contatos')
        .select('email')
        .eq('lista_id', importListaId)
        .in('email', emails)

      const emailsExistentes = new Set((existentes || []).map(e => e.email.toLowerCase()))

      const novos = parsed.filter(p => !emailsExistentes.has(p.email))
      const duplicados = parsed.length - novos.length

      if (novos.length === 0) {
        setResultadoImport({ inseridos: 0, duplicados, invalidos: 0 })
        setImportando(false)
        return
      }

      // Insere em lotes de 500
      let inseridos = 0
      for (let i = 0; i < novos.length; i += 500) {
        const lote = novos.slice(i, i + 500).map(c => ({
          nome: c.nome,
          email: c.email,
          lista_id: importListaId,
          status: 'ativo'
        }))
        const { error } = await supabase.from('contatos').insert(lote)
        if (!error) inseridos += lote.length
      }

      setResultadoImport({ inseridos, duplicados, invalidos: 0 })
      buscarContatos()
      buscarListas()
    } catch (e: any) {
      alert('Erro na importação: ' + e.message)
    }

    setImportando(false)
  }

  const fecharImport = () => {
    setModalImport(false)
    setTextoImport('')
    setCsvArquivo(null)
    setImportListaId('')
    setResultadoImport(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const totalPaginas = Math.ceil(totalContatos / itensPorPagina) || 1

  return (
    <div className="max-w-6xl mx-auto relative">

      {/* MODAL IMPORTAR */}
      {modalImport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 bg-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Upload className="size-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-emerald-900">Importar Contatos</h2>
                  <p className="text-emerald-700 text-sm">Adicione vários leads de uma vez</p>
                </div>
              </div>
              <button onClick={fecharImport} className="text-emerald-700 hover:bg-emerald-100 p-2 rounded-lg">
                <X className="size-5" />
              </button>
            </div>

            {resultadoImport ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Importação concluída!</h3>
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-3xl font-black text-emerald-700">{resultadoImport.inseridos}</p>
                    <p className="text-xs font-bold text-emerald-700 uppercase">Inseridos</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-3xl font-black text-amber-700">{resultadoImport.duplicados}</p>
                    <p className="text-xs font-bold text-amber-700 uppercase">Duplicados</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <p className="text-3xl font-black text-rose-700">{resultadoImport.invalidos}</p>
                    <p className="text-xs font-bold text-rose-700 uppercase">Inválidos</p>
                  </div>
                </div>
                <button onClick={fecharImport}
                  className="mt-6 px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md">
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-5">
                  {/* Seletor de modo */}
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => setModoImport('colar')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-colors ${
                        modoImport === 'colar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}>
                      <ClipboardPaste className="size-4" /> Colar lista
                    </button>
                    <button
                      onClick={() => setModoImport('csv')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-colors ${
                        modoImport === 'csv' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}>
                      <FileSpreadsheet className="size-4" /> Arquivo CSV
                    </button>
                  </div>

                  {/* Lista destino */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Salvar na lista *</label>
                    <select
                      value={importListaId}
                      onChange={e => setImportListaId(e.target.value)}
                      required
                      className="w-full p-3.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900">
                      <option value="">Selecione uma lista...</option>
                      {listas.map(l => (
                        <option key={l.id} value={l.id}>{l.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Modo: Colar */}
                  {modoImport === 'colar' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Cole os e-mails (um por linha)
                      </label>
                      <textarea
                        value={textoImport}
                        onChange={e => setTextoImport(e.target.value)}
                        rows={8}
                        placeholder={"joao@email.com\nMaria Silva, maria@email.com\npedro@empresa.com"}
                        className="w-full p-4 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        💡 Aceita: só e-mail, ou <strong>Nome, email</strong> separado por vírgula. Um por linha.
                      </p>
                    </div>
                  )}

                  {/* Modo: CSV */}
                  {modoImport === 'csv' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Arquivo CSV</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={e => setCsvArquivo(e.target.files?.[0] || null)}
                        className="w-full p-3 border border-slate-300 rounded-xl text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-bold file:cursor-pointer"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        💡 Exporte do Excel/Google Sheets como CSV. A primeira coluna pode ser o nome e a segunda o e-mail.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button onClick={fecharImport}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200">
                    Cancelar
                  </button>
                  <button onClick={executarImportacao} disabled={importando || !importListaId}
                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md disabled:opacity-50 flex items-center gap-2">
                    {importando ? <><Loader2 className="size-4 animate-spin" /> Importando...</> : <><Upload className="size-4" /> Importar</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR MANUAL */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-black text-slate-900">Adicionar Contato</h2>
              <p className="text-slate-500 text-sm mt-1">Insira um lead manualmente.</p>
            </div>

            <form onSubmit={salvarContato}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome</label>
                  <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
                    className="bg-white w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    placeholder="Ex: João Silva" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">E-mail *</label>
                  <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} required
                    className="bg-white w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    placeholder="joao@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Salvar na Lista *</label>
                  <select value={novaListaId} onChange={e => setNovaListaId(e.target.value)} required
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900">
                    <option value="" disabled>Selecione uma lista...</option>
                    {listas.map(l => (<option key={l.id} value={l.id}>{l.nome}</option>))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md disabled:opacity-50 flex items-center gap-2">
                  {salvando ? <Loader2 className="size-5 animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIMPEZA */}
      {modalLimpeza && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-rose-100 bg-rose-50 flex items-center gap-4">
              <div className="bg-rose-200 p-3 rounded-full text-rose-700"><Eraser className="size-6" /></div>
              <div>
                <h2 className="text-xl font-black text-rose-900">Limpeza de Base</h2>
                <p className="text-rose-700 text-sm mt-1">Exclua leads antigos para proteger a reputação.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <select value={mesesFrios} onChange={e => setMesesFrios(Number(e.target.value))}
                className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-rose-500 bg-white font-bold text-slate-900">
                <option value={1}>Mais de 1 Mês</option>
                <option value={2}>Mais de 2 Meses</option>
                <option value={3}>Mais de 3 Meses (Recomendado)</option>
                <option value={6}>Mais de 6 Meses</option>
              </select>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setModalLimpeza(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200">Cancelar</button>
              <button onClick={executarLimpezaFrios} disabled={limpando}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md disabled:opacity-50 flex items-center gap-2">
                {limpando ? <Loader2 className="size-5 animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Base de Contatos</h2>
          <p className="text-lg text-slate-600 mt-2">
            Total na base: <strong>{totalContatos}</strong>
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={() => setModalLimpeza(true)}
            className="flex items-center gap-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-3 px-5 rounded-lg transition-colors shadow-sm">
            <Eraser className="size-5" /> Limpar
          </button>
          <button onClick={() => setModalImport(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-lg transition-colors shadow-sm">
            <Upload className="size-5" /> Importar
          </button>
          <button onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg transition-colors shadow-sm">
            <Plus className="size-5" /> Adicionar
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input
            type="text"
            placeholder="Buscar por e-mail..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(1) }}
            className="bg-white w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
          <Filter className="size-5 text-slate-400" />
          <select value={filtroLista}
            onChange={e => { setFiltroLista(e.target.value); setPagina(1) }}
            className="bg-transparent outline-none text-slate-900 font-bold cursor-pointer">
            <option value="todas">Todas as Listas</option>
            {listas.map(l => (<option key={l.id} value={l.id}>{l.nome}</option>))}
          </select>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-6 font-bold">Contato</th>
                <th className="p-6 font-bold">Lista</th>
                <th className="p-6 font-bold text-center">Status</th>
                <th className="p-6 font-bold text-center">Data</th>
                <th className="p-6 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr><td colSpan={5} className="p-12 text-center">
                  <Loader2 className="size-8 animate-spin text-blue-500 mx-auto" />
                </td></tr>
              ) : contatos.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-500">
                  Nenhum contato encontrado.
                </td></tr>
              ) : (
                contatos.map(contato => (
                  <tr key={contato.id} className="hover:bg-slate-50">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <UserCircle className="size-8 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{contato.nome}</p>
                          <p className="text-sm text-slate-500 truncate">{contato.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                        {contato.listas?.nome || 'Excluída'}
                      </span>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        contato.status === 'ativo' ? 'bg-emerald-50 text-emerald-700'
                        : contato.status === 'bounced' ? 'bg-rose-50 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                      }`}>
                        {contato.status || 'ativo'}
                      </span>
                    </td>
                    <td className="p-6 text-slate-500 text-sm text-center whitespace-nowrap">
                      {new Date(contato.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-6 text-right">
                      <button onClick={() => deletarContato(contato.id)}
                        className="text-slate-300 hover:text-rose-600 p-2 rounded-lg">
                        <Trash2 className="size-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!carregando && totalContatos > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-bold hidden sm:block">
              {((pagina - 1) * itensPorPagina) + 1} a {Math.min(pagina * itensPorPagina, totalContatos)} de {totalContatos}
            </p>
            <div className="flex items-center gap-4 mx-auto sm:mx-0">
              <button onClick={() => setPagina(p => p - 1)} disabled={pagina === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 font-bold text-sm">
                <ChevronLeft className="size-4" /> Anterior
              </button>
              <span className="text-sm font-bold text-slate-900">Página {pagina} de {totalPaginas}</span>
              <button onClick={() => setPagina(p => p + 1)} disabled={pagina >= totalPaginas}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 font-bold text-sm">
                Próxima <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
