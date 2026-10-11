'use client'

import React, { useState, useEffect } from 'react'
import { Server, Plus, Trash2, Power, Loader2, Mail, Globe, Edit, X, Save, Zap } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const FORM_VAZIO = {
  nome: '',
  tipo: 'gmail',
  host: '',
  porta: '',
  usuario: '',
  senha: '',
  remetente: '',
  daily_limit: 50
}

const PRESETS = [20, 50, 100, 200, 450, 1000, 2000]

export default function ConfiguracoesPage() {
  const [servidores, setServidores] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modoCriacao, setModoCriacao] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novoServidor, setNovoServidor] = useState({ ...FORM_VAZIO })
  const [msgDebug, setMsgDebug] = useState<string | null>(null)
  const [processandoId, setProcessandoId] = useState<string | null>(null)

  useEffect(() => {
    carregarServidores()
  }, [])

  const carregarServidores = async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('smtp_accounts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setMsgDebug(`Erro ao carregar: ${error.message}`)
    } else if (data) {
      setServidores(data)
    }
    setCarregando(false)
  }

  // --- CRIAR ---
  const salvarServidor = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    const { error } = await supabase.from('smtp_accounts').insert([{
      sender_name:  novoServidor.nome,
      type:         novoServidor.tipo,
      host:         novoServidor.host || 'smtp.gmail.com',
      port:         Number(novoServidor.porta) || 587,
      email:        novoServidor.usuario,
      app_password: novoServidor.senha,
      sender_email: novoServidor.remetente,
      is_active:    true,
      sent_today:   0,
      daily_limit:  novoServidor.daily_limit || 50,
    }])

    if (!error) {
      setModoCriacao(false)
      setNovoServidor({ ...FORM_VAZIO })
      await carregarServidores()
      setMsgDebug(`✅ Servidor cadastrado com limite de ${novoServidor.daily_limit}/dia`)
      setTimeout(() => setMsgDebug(null), 3000)
    } else {
      setMsgDebug(`❌ Erro: ${error.message}`)
    }
    setSalvando(false)
  }

  // --- EDITAR ---
  const iniciarEdicao = (servidor: any) => {
    setEditandoId(servidor.id)
    setNovoServidor({
      nome: servidor.sender_name || '',
      tipo: servidor.type || 'gmail',
      host: servidor.host || '',
      porta: servidor.port ? String(servidor.port) : '',
      usuario: servidor.email || '',
      senha: '',
      remetente: servidor.sender_email || '',
      daily_limit: servidor.daily_limit || 50,
    })
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setNovoServidor({ ...FORM_VAZIO })
  }

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editandoId) return
    setSalvando(true)

    const updateData: any = {
      sender_name:  novoServidor.nome,
      type:         novoServidor.tipo,
      host:         novoServidor.host || 'smtp.gmail.com',
      port:         Number(novoServidor.porta) || 587,
      email:        novoServidor.usuario,
      sender_email: novoServidor.remetente,
      daily_limit:  novoServidor.daily_limit || 50,
    }

    if (novoServidor.senha && novoServidor.senha.trim() !== '') {
      updateData.app_password = novoServidor.senha
    }

    const { error } = await supabase
      .from('smtp_accounts')
      .update(updateData)
      .eq('id', editandoId)

    if (!error) {
      cancelarEdicao()
      await carregarServidores()
      setMsgDebug(`✅ Servidor atualizado!`)
      setTimeout(() => setMsgDebug(null), 3000)
    } else {
      setMsgDebug(`❌ Erro: ${error.message}`)
    }
    setSalvando(false)
  }

  // --- PAUSAR / ATIVAR ---
  const alternarStatus = async (id: string, statusAtual: boolean) => {
    setProcessandoId(id)
    const novoStatus = !statusAtual

    const { data, error } = await supabase
      .from('smtp_accounts')
      .update({ is_active: novoStatus })
      .eq('id', id)
      .select('id, email, is_active')

    if (error || !data || data.length === 0) {
      setMsgDebug(`❌ Erro ao atualizar`)
      setProcessandoId(null)
      return
    }

    setMsgDebug(`✅ Conta ${novoStatus ? 'ativada' : 'pausada'}: ${data[0].email}`)
    await carregarServidores()
    setProcessandoId(null)
    setTimeout(() => setMsgDebug(null), 3000)
  }

  // --- DELETAR ---
  const deletarServidor = async (id: string, email: string) => {
    const confirmacao = prompt(
      `⚠️ Excluir PERMANENTEMENTE a conta:\n\n${email}\n\n` +
      `Digite EXCLUIR para confirmar:`
    )
    if (confirmacao !== 'EXCLUIR') return

    setProcessandoId(id)
    const { error, count } = await supabase
      .from('smtp_accounts')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error || count === 0) {
      setMsgDebug(`❌ Erro ao deletar`)
    } else {
      setMsgDebug(`✅ Conta ${email} deletada`)
    }
    await carregarServidores()
    setProcessandoId(null)
    setTimeout(() => setMsgDebug(null), 4000)
  }

  // --- ALTERAR LIMITE INDIVIDUAL (rápido, direto do card) ---
  const alterarLimiteIndividual = async (id: string, email: string, novoLimite: number) => {
    setProcessandoId(id)
    const { error } = await supabase
      .from('smtp_accounts')
      .update({ daily_limit: novoLimite })
      .eq('id', id)

    if (error) {
      setMsgDebug(`❌ Erro: ${error.message}`)
    } else {
      setMsgDebug(`✅ ${email} → limite ${novoLimite}/dia`)
      await carregarServidores()
    }
    setProcessandoId(null)
    setTimeout(() => setMsgDebug(null), 3000)
  }

  // --- APLICAR LIMITE A TODAS ---
  const aplicarLimiteTodas = async (limite: number) => {
    if (!confirm(`Aplicar limite de ${limite}/dia para TODAS as contas ativas?`)) return

    setProcessandoId('todas')
    const { error, count } = await supabase
      .from('smtp_accounts')
      .update({ daily_limit: limite }, { count: 'exact' })
      .eq('is_active', true)

    if (error) {
      setMsgDebug(`❌ Erro: ${error.message}`)
    } else {
      setMsgDebug(`✅ Limite ${limite}/dia aplicado em ${count} conta(s)`)
      await carregarServidores()
    }
    setProcessandoId(null)
    setTimeout(() => setMsgDebug(null), 4000)
  }

  // --- RESETAR CONTADORES ---
  const resetarContadores = async () => {
    if (!confirm('Resetar o contador de envios de TODAS as contas?')) return
    setProcessandoId('todas')
    const { error } = await supabase
      .from('smtp_accounts')
      .update({ sent_today: 0 })
      .gte('sent_today', 0)

    if (error) {
      setMsgDebug(`❌ Erro: ${error.message}`)
    } else {
      setMsgDebug(`✅ Contadores resetados`)
      await carregarServidores()
    }
    setProcessandoId(null)
    setTimeout(() => setMsgDebug(null), 3000)
  }

  const totalAtivas = servidores.filter(s => s.is_active).length
  const totalPausadas = servidores.filter(s => !s.is_active).length
  const totalEnviadosHoje = servidores.reduce((acc, s) => acc + (s.sent_today || 0), 0)
  const totalCapacidade = servidores.filter(s => s.is_active).reduce((acc, s) => acc + (s.daily_limit || 50), 0)

  return (
    <div className="max-w-6xl mx-auto">

      {msgDebug && (
        <div className={`mb-6 p-4 rounded-xl border-2 font-bold ${
          msgDebug.startsWith('✅') ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
          : msgDebug.startsWith('⚠️') ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {msgDebug}
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Arsenal de Servidores</h2>
          <p className="text-lg text-slate-600 mt-2">
            <strong>{servidores.length}</strong> contas ·{' '}
            <strong className="text-emerald-600">{totalAtivas} ativas</strong> ·{' '}
            <strong className="text-slate-500">{totalPausadas} pausadas</strong>
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Enviados hoje: <strong>{totalEnviadosHoje}</strong> de <strong>{totalCapacidade}</strong> possíveis
          </p>
        </div>
        <button
          onClick={() => {
            if (editandoId) cancelarEdicao()
            setModoCriacao(!modoCriacao)
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <Plus className="size-5" /> Adicionar Servidor
        </button>
      </div>

      {/* AÇÕES EM LOTE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8">
        <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <Zap className="size-4 text-amber-600" /> Ações rápidas para TODAS as contas ativas
        </h3>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-500 self-center mr-2">Aplicar limite:</span>
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => aplicarLimiteTodas(p)}
              disabled={processandoId === 'todas'}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50"
            >
              {p}/dia
            </button>
          ))}
          <button
            onClick={resetarContadores}
            disabled={processandoId === 'todas'}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50 ml-auto"
          >
            Resetar contadores do dia
          </button>
        </div>
      </div>

      {/* FORMULÁRIO */}
      {(modoCriacao || editandoId) && (
        <div className={`border p-6 rounded-2xl mb-8 shadow-sm ${
          editandoId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-bold text-lg flex items-center gap-2 ${editandoId ? 'text-amber-900' : 'text-slate-800'}`}>
              {editandoId ? <><Edit className="size-5" /> Editando Servidor</> : <><Plus className="size-5" /> Novo Servidor</>}
            </h3>
            {editandoId && (
              <button type="button" onClick={cancelarEdicao} className="text-amber-700 hover:bg-amber-100 p-2 rounded-lg">
                <X className="size-5" />
              </button>
            )}
          </div>

          <form onSubmit={editandoId ? salvarEdicao : salvarServidor} className="space-y-4">

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome de Identificação</label>
                <input required type="text" value={novoServidor.nome}
                  onChange={e => setNovoServidor({ ...novoServidor, nome: e.target.value })}
                  placeholder="Ex: Gmail Atendimento 01"
                  className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Servidor</label>
                <select value={novoServidor.tipo}
                  onChange={e => setNovoServidor({ ...novoServidor, tipo: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900">
                  <option value="gmail">Google Gmail</option>
                  <option value="smtp">SMTP Externo (Hostinger, AWS, etc)</option>
                </select>
              </div>
            </div>

            {novoServidor.tipo === 'smtp' && (
              <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Host SMTP</label>
                  <input required={novoServidor.tipo === 'smtp'} type="text" value={novoServidor.host}
                    onChange={e => setNovoServidor({ ...novoServidor, host: e.target.value })}
                    placeholder="Ex: smtp.hostinger.com"
                    className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Porta SMTP</label>
                  <input required={novoServidor.tipo === 'smtp'} type="text" value={novoServidor.porta}
                    onChange={e => setNovoServidor({ ...novoServidor, porta: e.target.value })}
                    placeholder="Ex: 465"
                    className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white" />
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail de Login</label>
                <input required type="email" value={novoServidor.usuario}
                  onChange={e => setNovoServidor({ ...novoServidor, usuario: e.target.value })}
                  placeholder="email@gmail.com"
                  className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Senha de App {editandoId && <span className="text-xs font-normal text-amber-700">(vazio = manter)</span>}
                </label>
                <input required={!editandoId} type="password" value={novoServidor.senha}
                  onChange={e => setNovoServidor({ ...novoServidor, senha: e.target.value })}
                  placeholder={editandoId ? '•••• (manter senha)' : '••••••••••••'}
                  className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail do Remetente (o que o cliente vê)</label>
                <input required type="email" value={novoServidor.remetente}
                  onChange={e => setNovoServidor({ ...novoServidor, remetente: e.target.value })}
                  placeholder="contato@seudominio.com"
                  className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                  Limite diário desta conta
                </label>
                <div className="flex gap-2">
                  <input type="number" min={1} max={100000} value={novoServidor.daily_limit}
                    onChange={e => setNovoServidor({ ...novoServidor, daily_limit: Number(e.target.value) || 50 })}
                    className="w-24 p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-bold" />
                  <div className="flex flex-wrap gap-1">
                    {PRESETS.map(p => (
                      <button key={p} type="button"
                        onClick={() => setNovoServidor({ ...novoServidor, daily_limit: p })}
                        className={`text-xs font-bold px-2 py-1 rounded border transition-colors ${
                          novoServidor.daily_limit === p
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">💡 Conta Gmail nova: use 20-50. Conta antiga: 450. SMTP pago: quanto quiser.</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <button type="button"
                onClick={editandoId ? cancelarEdicao : () => { setModoCriacao(false); setNovoServidor({ ...FORM_VAZIO }) }}
                className="px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
                Cancelar
              </button>
              <button type="submit" disabled={salvando}
                className={`px-6 py-3 font-bold text-white rounded-lg flex items-center gap-2 disabled:opacity-50 ${
                  editandoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}>
                {salvando ? <><Loader2 className="size-5 animate-spin" /> Salvando...</>
                  : editandoId ? <><Save className="size-5" /> Salvar Alterações</>
                  : <><Plus className="size-5" /> Salvar Servidor</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTA */}
      <div className="grid lg:grid-cols-2 gap-6">
        {carregando ? (
          <div className="col-span-full p-12 flex justify-center">
            <Loader2 className="size-8 animate-spin text-blue-500" />
          </div>
        ) : servidores.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
            Nenhum servidor cadastrado.
          </div>
        ) : (
          servidores.map(servidor => {
            const emEdicao = editandoId === servidor.id
            const processando = processandoId === servidor.id
            const limite = servidor.daily_limit || 50
            const usado = servidor.sent_today || 0
            const percentual = limite > 0 ? Math.min((usado / limite) * 100, 100) : 0

            return (
              <div key={servidor.id}
                className={`bg-white rounded-2xl border p-6 transition-all ${
                  emEdicao ? 'border-amber-400 shadow-md ring-2 ring-amber-200'
                  : processando ? 'border-blue-400 shadow-md opacity-70'
                  : servidor.is_active ? 'border-slate-200 shadow-sm'
                  : 'border-dashed border-slate-300 opacity-60'
                }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${servidor.type === 'gmail' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {servidor.type === 'gmail' ? <Mail className="size-6" /> : <Globe className="size-6" />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-lg leading-tight">{servidor.sender_name}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{servidor.type}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => emEdicao ? cancelarEdicao() : iniciarEdicao(servidor)} disabled={processando}
                      className={`p-2 rounded-lg disabled:opacity-50 ${emEdicao ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                      {emEdicao ? <X className="size-5" /> : <Edit className="size-5" />}
                    </button>
                    <button onClick={() => alternarStatus(servidor.id, servidor.is_active)} disabled={processando}
                      className={`p-2 rounded-lg disabled:opacity-50 ${
                        servidor.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400'
                      }`}>
                      {processando ? <Loader2 className="size-5 animate-spin" /> : <Power className="size-5" />}
                    </button>
                    <button onClick={() => deletarServidor(servidor.id, servidor.email)} disabled={processando}
                      className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg disabled:opacity-50">
                      {processando ? <Loader2 className="size-5 animate-spin" /> : <Trash2 className="size-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="break-words"><strong className="text-slate-800">Login:</strong> {servidor.email}</p>
                  <p className="break-words"><strong className="text-slate-800">Remetente:</strong> {servidor.sender_email}</p>

                  {/* BARRA DE PROGRESSO */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700">Envios hoje</span>
                      <span className="text-xs font-bold text-slate-900">{usado} / {limite}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${
                        percentual >= 90 ? 'bg-rose-500' : percentual >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} style={{ width: `${percentual}%` }} />
                    </div>
                  </div>

                  {/* CONTROLE RÁPIDO DE LIMITE */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Limite diário:</label>
                    <div className="flex flex-wrap gap-1">
                      {PRESETS.map(p => (
                        <button key={p}
                          onClick={() => alterarLimiteIndividual(servidor.id, servidor.email, p)}
                          disabled={processando || limite === p}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors disabled:opacity-50 ${
                            limite === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                          }`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      servidor.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {servidor.is_active ? '● ATIVA' : '○ PAUSADA'}
                    </span>
                  </div>
                </div>

                {emEdicao && (
                  <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 text-center font-bold">
                    ✏️ Editando no formulário acima
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}