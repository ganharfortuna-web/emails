'use client'

import React, { useState, useEffect } from 'react'
import { Server, Edit, Save, Loader2, Mail, Globe, Info, CheckCircle2, Key, Link as LinkIcon, Trash2, Zap } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// PRESETS DE PROVEDORES SMTP
// ============================================================
const PROVIDERS = [
  { id: 'gmail', nome: 'Gmail', host: 'smtp.gmail.com', porta: '587', tipo: 'gmail', precisaUsuarioEmail: true, dicaUsuario: 'Use o e-mail completo (ex: seunome@gmail.com)', dicaSenha: 'Senha de App de 16 caracteres (myaccount.google.com/apppasswords)', limiteRecomendado: 450 },
  { id: 'outlook', nome: 'Outlook / Hotmail', host: 'smtp-mail.outlook.com', porta: '587', tipo: 'smtp', precisaUsuarioEmail: true, dicaUsuario: 'E-mail completo (ex: seuemail@outlook.com)', dicaSenha: 'Senha normal ou de app', limiteRecomendado: 300 },
  { id: 'sendgrid', nome: 'SendGrid', host: 'smtp.sendgrid.net', porta: '587', tipo: 'smtp', precisaUsuarioEmail: false, dicaUsuario: 'Digite literalmente: apikey', dicaSenha: 'Cole a API Key completa (começa com SG.xxxxx)', limiteRecomendado: 5000 },
  { id: 'mailgun', nome: 'Mailgun', host: 'smtp.mailgun.org', porta: '587', tipo: 'smtp', precisaUsuarioEmail: false, dicaUsuario: 'postmaster@seu-dominio.mailgun.org', dicaSenha: 'Sua SMTP password (não é a API key)', limiteRecomendado: 5000 },
  { id: 'brevo', nome: 'Brevo (ex-Sendinblue)', host: 'smtp-relay.brevo.com', porta: '587', tipo: 'smtp', precisaUsuarioEmail: true, dicaUsuario: 'Seu e-mail da conta Brevo', dicaSenha: 'SMTP Key gerada em Configurações → SMTP', limiteRecomendado: 20000 },
  { id: 'custom', nome: 'Outro / Personalizado', host: '', porta: '587', tipo: 'smtp', precisaUsuarioEmail: false, dicaUsuario: 'Digite o usuário SMTP fornecido pelo provedor', dicaSenha: 'Digite a senha/token fornecida pelo provedor', limiteRecomendado: 500 },
]

const FORM_VAZIO = { nome: '', provider: 'gmail', host: 'smtp.gmail.com', porta: '587', usuario: '', senha: '', remetente: '', daily_limit: 450 }

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState<'smtp' | 'api'>('smtp')
  const [motorPrincipal, setMotorPrincipal] = useState<'smtp' | 'api'>('smtp')
  
  // ================= ESTADOS SMTP =================
  const [contaUnica, setContaUnica] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formData, setFormData] = useState({ ...FORM_VAZIO })

  // ================= ESTADOS API =================
  const [apiConfig, setApiConfig] = useState<any>(null)
  const [editandoApi, setEditandoApi] = useState(false)
  const [salvandoApi, setSalvandoApi] = useState(false)
  const [formApi, setFormApi] = useState({ nome: '', url: '', key: '', list_id: '' })

  const [msgDebug, setMsgDebug] = useState<string | null>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setCarregando(true)
    
    // 1. Carrega SMTP
    const { data: smtpData } = await supabase.from('smtp_accounts').select('*').limit(1).single()
    if (smtpData) {
      setContaUnica(smtpData)
      const p = PROVIDERS.find(x => x.host === smtpData.host) || PROVIDERS.find(x => x.id === 'custom')
      setFormData({
        nome: smtpData.sender_name || '', provider: p?.id || 'custom',
        host: smtpData.host || '', porta: smtpData.port ? String(smtpData.port) : '587',
        usuario: smtpData.email || '', senha: '', remetente: smtpData.sender_email || '',
        daily_limit: smtpData.daily_limit || 450,
      })
    } else {
      setEditando(true)
    }

    // 2. Carrega API
    const { data: apiData } = await supabase.from('api_providers').select('*').limit(1).single()
    if (apiData) {
      setApiConfig(apiData)
      setFormApi({ nome: apiData.name, url: apiData.api_url, key: '', list_id: apiData.list_id || '' })
    } else {
      setEditandoApi(true)
    }

    // 3. Define qual é o motor principal
    if (apiData?.is_active) {
      setMotorPrincipal('api')
      setAbaAtiva('api')
    } else if (smtpData?.is_active) {
      setMotorPrincipal('smtp')
      setAbaAtiva('smtp')
    }

    setCarregando(false)
  }

  // ================= TROCAR MOTOR PRINCIPAL =================
  const alterarMotor = async (motor: 'smtp' | 'api') => {
    setCarregando(true)
    if (motor === 'smtp') {
      // Desativa API e Ativa SMTP
      await supabase.from('api_providers').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
      if (contaUnica?.id) await supabase.from('smtp_accounts').update({ is_active: true }).eq('id', contaUnica.id)
    } else {
      // Desativa SMTP e Ativa API
      await supabase.from('smtp_accounts').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
      if (apiConfig?.id) await supabase.from('api_providers').update({ is_active: true }).eq('id', apiConfig.id)
    }
    setMotorPrincipal(motor)
    setAbaAtiva(motor)
    setMsgDebug(`✅ Motor de envio alterado para ${motor.toUpperCase()} com sucesso!`)
    setTimeout(() => setMsgDebug(null), 4000)
    await carregarDados()
  }

  // ================= FUNÇÕES SMTP =================
  const trocarProvedor = (providerId: string) => {
    const p = PROVIDERS.find(x => x.id === providerId)
    if (!p) return
    setFormData({ ...formData, provider: providerId, host: p.host, porta: p.porta, daily_limit: p.limiteRecomendado })
  }

  const salvarSMTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setMsgDebug(null)
    const p = PROVIDERS.find(p => p.id === formData.provider) || PROVIDERS[0]

    const payload: any = {
      sender_name: formData.nome, type: p.tipo, host: formData.host || 'smtp.gmail.com',
      port: Number(formData.porta) || 587, email: formData.usuario.trim(),
      sender_email: formData.remetente.trim().toLowerCase(), is_active: motorPrincipal === 'smtp', daily_limit: formData.daily_limit || 450,
    }

    if (formData.senha && formData.senha.trim() !== '') payload.app_password = formData.senha

    let error = null
    if (contaUnica?.id) {
      const res = await supabase.from('smtp_accounts').update(payload).eq('id', contaUnica.id)
      error = res.error
    } else {
      payload.sent_today = 0
      const res = await supabase.from('smtp_accounts').insert([payload])
      error = res.error
    }

    if (!error) {
      setEditando(false); setMsgDebug(`✅ Configuração SMTP salva!`); await carregarDados()
      setTimeout(() => setMsgDebug(null), 4000)
    } else { setMsgDebug(`❌ Erro SMTP: ${error.message}`) }
    setSalvando(false)
  }

  // ================= FUNÇÕES API =================
  const salvarAPI = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoApi(true)
    setMsgDebug(null)

    const payload: any = { name: formApi.nome, api_url: formApi.url, list_id: formApi.list_id, is_active: motorPrincipal === 'api' }
    
    if (formApi.key && formApi.key.trim() !== '') payload.api_key = formApi.key

    let error = null
    if (apiConfig?.id) {
      const res = await supabase.from('api_providers').update(payload).eq('id', apiConfig.id)
      error = res.error
    } else {
      const res = await supabase.from('api_providers').insert([payload])
      error = res.error
    }

    if (!error) {
      setEditandoApi(false); setMsgDebug(`✅ Configuração de API salva!`); await carregarDados()
      setTimeout(() => setMsgDebug(null), 4000)
    } else { setMsgDebug(`❌ Erro API: ${error.message}`) }
    setSalvandoApi(false)
  }

  const deletarAPI = async () => {
    if (!confirm('Apagar esta configuração de API?')) return
    await supabase.from('api_providers').delete().eq('id', apiConfig.id)
    setApiConfig(null); setFormApi({ nome: '', url: '', key: '', list_id: '' }); setEditandoApi(true)
    if (motorPrincipal === 'api') setMotorPrincipal('smtp')
  }

  if (carregando) return <div className="max-w-4xl mx-auto p-12 flex justify-center"><Loader2 className="size-8 animate-spin text-blue-500" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {msgDebug && (
        <div className={`p-4 rounded-xl border-2 font-bold ${msgDebug.startsWith('✅') ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'}`}>
          {msgDebug}
        </div>
      )}

      {/* CABEÇALHO */}
      <div>
        <h2 className="text-3xl font-black text-slate-900">Configurações de Envio</h2>
        <p className="text-slate-600 mt-1">Escolha qual motor será usado como principal para os disparos.</p>
      </div>

      {/* SELETOR DE MOTOR PRINCIPAL */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
        <button 
          onClick={() => alterarMotor('smtp')} 
          className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${motorPrincipal === 'smtp' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}
        >
          <Server className={`size-6 mb-2 ${motorPrincipal === 'smtp' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className={`font-bold ${motorPrincipal === 'smtp' ? 'text-blue-900' : 'text-slate-600'}`}>Usar Servidor SMTP</span>
          <span className="text-xs text-slate-500 mt-1">Lotes controlados, sem custo extra</span>
        </button>

        <button 
          onClick={() => alterarMotor('api')} 
          className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${motorPrincipal === 'api' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-slate-50'}`}
        >
          <Globe className={`size-6 mb-2 ${motorPrincipal === 'api' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span className={`font-bold ${motorPrincipal === 'api' ? 'text-indigo-900' : 'text-slate-600'}`}>Usar API Externa</span>
          <span className="text-xs text-slate-500 mt-1">Ultra rápido, sem limite da Vercel</span>
        </button>
      </div>

      {/* ABAS DE CONFIGURAÇÃO */}
      <div className="flex gap-2 mt-8 border-b border-slate-200 pb-px">
        <button onClick={() => setAbaAtiva('smtp')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${abaAtiva === 'smtp' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Configurar SMTP
        </button>
        <button onClick={() => setAbaAtiva('api')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${abaAtiva === 'api' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Configurar API Externa
        </button>
      </div>

      {/* CONTEÚDO: SMTP */}
      {abaAtiva === 'smtp' && (
        <>
          {!editando && contaUnica ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl">
                    {contaUnica.type === 'gmail' ? <Mail className="size-8" /> : <Server className="size-8" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900">{contaUnica.sender_name || 'Servidor SMTP'}</h3>
                      {motorPrincipal === 'smtp' && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Em Uso</span>}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">Conta utilizada para os disparos em lotes</p>
                  </div>
                </div>
                <button onClick={() => setEditando(true)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl transition-colors">
                  <Edit className="size-4" /> Editar
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm">
                <div><span className="block text-xs font-bold text-slate-400 uppercase mb-1">E-mail / Usuário</span><span className="font-mono font-bold text-slate-800">{contaUnica.email}</span></div>
                <div><span className="block text-xs font-bold text-slate-400 uppercase mb-1">Remetente (De:)</span><span className="font-bold text-slate-800">{contaUnica.sender_email}</span></div>
                <div><span className="block text-xs font-bold text-slate-400 uppercase mb-1">Host & Porta</span><span className="font-mono font-bold text-slate-800">{contaUnica.host}:{contaUnica.port}</span></div>
                <div><span className="block text-xs font-bold text-slate-400 uppercase mb-1">Limite Diário</span><span className="font-bold text-slate-800">{contaUnica.daily_limit} envios (Hoje: {contaUnica.sent_today || 0})</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <form onSubmit={salvarSMTP} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Nome de Identificação</label><input required type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Meu Servidor Oficial" className="w-full p-3 border rounded-xl text-slate-900" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Provedor</label><select value={formData.provider} onChange={e => trocarProvedor(e.target.value)} className="w-full p-3 border rounded-xl bg-white text-slate-900">{PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Host SMTP</label><input required type="text" value={formData.host} onChange={e => setFormData({ ...formData, host: e.target.value })} className="w-full p-3 border rounded-xl text-slate-900" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Porta</label><input required type="text" value={formData.porta} onChange={e => setFormData({ ...formData, porta: e.target.value })} className="w-full p-3 border rounded-xl text-slate-900" /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Usuário SMTP</label><input required type="text" value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} className="w-full p-3 border rounded-xl text-slate-900" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Senha {contaUnica && <span className="text-xs font-normal">(vazio = manter)</span>}</label><input required={!contaUnica} type="password" value={formData.senha} onChange={e => setFormData({ ...formData, senha: e.target.value })} placeholder="••••••••" className="w-full p-3 border rounded-xl text-slate-900" /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">E-mail Remetente</label><input required type="email" value={formData.remetente} onChange={e => setFormData({ ...formData, remetente: e.target.value })} className="w-full p-3 border rounded-xl text-slate-900" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Limite Diário</label><input type="number" value={formData.daily_limit} onChange={e => setFormData({ ...formData, daily_limit: Number(e.target.value) })} className="w-full p-3 border rounded-xl text-slate-900" /></div>
                </div>
                <div className="flex gap-4 justify-end pt-4 border-t">
                  {contaUnica && <button type="button" onClick={() => setEditando(false)} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl">Cancelar</button>}
                  <button type="submit" disabled={salvando} className="px-8 py-3 font-bold text-white bg-blue-600 rounded-xl flex items-center gap-2">{salvando ? <Loader2 className="animate-spin" /> : <Save />} Salvar SMTP</button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* CONTEÚDO: API EXTERNA */}
      {abaAtiva === 'api' && (
        <>
          {!editandoApi && apiConfig ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl">
                    <Globe className="size-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900">{apiConfig.name}</h3>
                      {motorPrincipal === 'api' && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Em Uso</span>}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">Conexão via API para envio em massa instantâneo</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={deletarAPI} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl" title="Excluir API"><Trash2 className="size-5" /></button>
                  <button onClick={() => setEditandoApi(true)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl transition-colors"><Edit className="size-4" /> Editar</button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm">
                <div><span className="block text-xs font-bold text-slate-400 uppercase mb-1">URL da API (Endpoint)</span><span className="font-mono font-bold text-slate-800 break-all">{apiConfig.api_url}</span></div>
                <div><span className="block text-xs font-bold text-slate-400 uppercase mb-1">Chave / Token de API</span><span className="font-mono font-bold text-slate-800">••••••••••••••••</span></div>
                <div className="md:col-span-2"><span className="block text-xs font-bold text-slate-400 uppercase mb-1">ID da Lista / Grupo</span><span className="font-mono font-bold text-slate-800">{apiConfig.list_id || 'Não informado'}</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl mb-6 text-sm flex gap-3">
                <Info className="size-5 shrink-0" />
                <p>Esta API será chamada na tela de <strong>Automações</strong> quando você clicar em <strong>"Disparar"</strong>. O envio não usará o SMTP, mas sim os servidores da sua plataforma (ex: Mailrelay), garantindo velocidade e evitando limites da Vercel.</p>
              </div>
              
              <form onSubmit={salvarAPI} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Provedor</label>
                  <input required type="text" value={formApi.nome} onChange={e => setFormApi({ ...formApi, nome: e.target.value })} placeholder="Ex: Mailrelay Principal" className="w-full p-3 border rounded-xl text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><LinkIcon className="size-4 text-slate-400" /> URL de Disparo (Endpoint de Envio)</label>
                  <input required type="url" value={formApi.url} onChange={e => setFormApi({ ...formApi, url: e.target.value })} placeholder="Ex: https://suaempresa.ipzmarketing.com/api/v1/campaigns" className="w-full p-3 border rounded-xl text-slate-900 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Key className="size-4 text-slate-400" /> Token de API {apiConfig && <span className="text-xs font-normal">(vazio = manter)</span>}</label>
                  <input required={!apiConfig} type="password" value={formApi.key} onChange={e => setFormApi({ ...formApi, key: e.target.value })} placeholder="Cole sua chave secreta" className="w-full p-3 border rounded-xl text-slate-900 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">ID da Lista / Grupo (Opcional)</label>
                  <input type="text" value={formApi.list_id} onChange={e => setFormApi({ ...formApi, list_id: e.target.value })} placeholder="Se o provedor exigir o ID do grupo de contatos" className="w-full p-3 border rounded-xl text-slate-900" />
                </div>
                
                <div className="flex gap-4 justify-end pt-4 border-t">
                  {apiConfig && <button type="button" onClick={() => setEditandoApi(false)} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl">Cancelar</button>}
                  <button type="submit" disabled={salvandoApi} className="px-8 py-3 font-bold text-white bg-indigo-600 rounded-xl flex items-center gap-2">{salvandoApi ? <Loader2 className="animate-spin" /> : <Save />} Salvar API</button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
