'use client'

import React, { useState, useEffect } from 'react'
import { Server, Edit, Save, Loader2, Mail, Globe, Info, CheckCircle2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// PRESETS DE PROVEDORES
// ============================================================
const PROVIDERS = [
  {
    id: 'gmail',
    nome: 'Gmail',
    host: 'smtp.gmail.com',
    porta: '587',
    tipo: 'gmail',
    precisaUsuarioEmail: true,
    dicaUsuario: 'Use o e-mail completo (ex: seunome@gmail.com)',
    dicaSenha: 'Senha de App de 16 caracteres (myaccount.google.com/apppasswords)',
    limiteRecomendado: 450,
  },
  {
    id: 'outlook',
    nome: 'Outlook / Hotmail',
    host: 'smtp-mail.outlook.com',
    porta: '587',
    tipo: 'smtp',
    precisaUsuarioEmail: true,
    dicaUsuario: 'E-mail completo (ex: seuemail@outlook.com)',
    dicaSenha: 'Senha normal ou de app',
    limiteRecomendado: 300,
  },
  {
    id: 'sendgrid',
    nome: 'SendGrid',
    host: 'smtp.sendgrid.net',
    porta: '587',
    tipo: 'smtp',
    precisaUsuarioEmail: false,
    dicaUsuario: 'Digite literalmente: apikey',
    dicaSenha: 'Cole a API Key completa (começa com SG.xxxxx)',
    limiteRecomendado: 5000,
  },
  {
    id: 'mailgun',
    nome: 'Mailgun',
    host: 'smtp.mailgun.org',
    porta: '587',
    tipo: 'smtp',
    precisaUsuarioEmail: false,
    dicaUsuario: 'postmaster@seu-dominio.mailgun.org',
    dicaSenha: 'Sua SMTP password (não é a API key)',
    limiteRecomendado: 5000,
  },
  {
    id: 'ses',
    nome: 'Amazon SES',
    host: 'email-smtp.us-east-1.amazonaws.com',
    porta: '587',
    tipo: 'smtp',
    precisaUsuarioEmail: false,
    dicaUsuario: 'SMTP Username (gerado no console SES, tipo AKIAxxxxx)',
    dicaSenha: 'SMTP Password (gerada no console SES)',
    limiteRecomendado: 50000,
  },
  {
    id: 'brevo',
    nome: 'Brevo (ex-Sendinblue)',
    host: 'smtp-relay.brevo.com',
    porta: '587',
    tipo: 'smtp',
    precisaUsuarioEmail: true,
    dicaUsuario: 'Seu e-mail da conta Brevo',
    dicaSenha: 'SMTP Key gerada em Configurações → SMTP',
    limiteRecomendado: 20000,
  },
  {
    id: 'hostinger',
    nome: 'Hostinger',
    host: 'smtp.hostinger.com',
    porta: '465',
    tipo: 'smtp',
    precisaUsuarioEmail: true,
    dicaUsuario: 'E-mail completo do domínio (ex: contato@seudominio.com)',
    dicaSenha: 'Senha do e-mail (não é a do painel Hostinger)',
    limiteRecomendado: 500,
  },
  {
    id: 'custom',
    nome: 'Outro / Personalizado',
    host: '',
    porta: '587',
    tipo: 'smtp',
    precisaUsuarioEmail: false,
    dicaUsuario: 'Digite o usuário SMTP fornecido pelo provedor',
    dicaSenha: 'Digite a senha/token fornecida pelo provedor',
    limiteRecomendado: 500,
  },
]

const FORM_VAZIO = {
  nome: '',
  provider: 'gmail',
  host: 'smtp.gmail.com',
  porta: '587',
  usuario: '',
  senha: '',
  remetente: '',
  daily_limit: 450,
}

export default function ConfiguracoesPage() {
  const [contaUnica, setContaUnica] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formData, setFormData] = useState({ ...FORM_VAZIO })
  const [msgDebug, setMsgDebug] = useState<string | null>(null)

  useEffect(() => {
    carregarContaUnica()
  }, [])

  const carregarContaUnica = async () => {
    setCarregando(true)
    // Busca sempre a primeira conta cadastrada no banco
    const { data, error } = await supabase
      .from('smtp_accounts')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      setMsgDebug(`Erro ao carregar conta: ${error.message}`)
    } else if (data) {
      setContaUnica(data)
      preencherFormularioComConta(data)
    } else {
      // Se não houver nenhuma cadastrada, abre direto para criar a primeira
      setEditando(true)
    }
    setCarregando(false)
  }

  const preencherFormularioComConta = (servidor: any) => {
    const p = PROVIDERS.find(x => x.host === servidor.host) || PROVIDERS.find(x => x.id === 'custom')
    setFormData({
      nome: servidor.sender_name || '',
      provider: p?.id || 'custom',
      host: servidor.host || '',
      porta: servidor.port ? String(servidor.port) : '587',
      usuario: servidor.email || '',
      senha: '', // Deixa vazio por segurança para não sobrescrever sem querer
      remetente: servidor.sender_email || '',
      daily_limit: servidor.daily_limit || 450,
    })
  }

  const trocarProvedor = (providerId: string) => {
    const p = PROVIDERS.find(x => x.id === providerId)
    if (!p) return
    setFormData({
      ...formData,
      provider: providerId,
      host: p.host,
      porta: p.porta,
      daily_limit: p.limiteRecomendado,
    })
  }

  const providerAtual = PROVIDERS.find(p => p.id === formData.provider) || PROVIDERS[0]

  const salvarOuCriarConta = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    const payload: any = {
      sender_name: formData.nome,
      type: providerAtual.tipo,
      host: formData.host || 'smtp.gmail.com',
      port: Number(formData.porta) || 587,
      email: formData.usuario.trim(),
      sender_email: formData.remetente.trim().toLowerCase(),
      is_active: true,
      daily_limit: formData.daily_limit || 450,
    }

    // Só atualiza a senha se o usuário digitou algo novo
    if (formData.senha && formData.senha.trim() !== '') {
      payload.app_password = formData.senha
    }

    let error = null

    if (contaUnica?.id) {
      // Atualiza a conta existente
      const res = await supabase
        .from('smtp_accounts')
        .update(payload)
        .eq('id', contaUnica.id)
      error = res.error
    } else {
      // Cria a única conta do sistema caso não exista nenhuma
      payload.sent_today = 0
      const res = await supabase
        .from('smtp_accounts')
        .insert([payload])
      error = res.error
    }

    if (!error) {
      setEditando(false)
      setMsgDebug(`✅ Configuração SMTP salva com sucesso!`)
      await carregarContaUnica()
      setTimeout(() => setMsgDebug(null), 4000)
    } else {
      setMsgDebug(`❌ Erro ao salvar: ${error.message}`)
    }
    setSalvando(false)
  }

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto p-12 flex justify-center">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {msgDebug && (
        <div className={`p-4 rounded-xl border-2 font-bold ${
          msgDebug.startsWith('✅') ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {msgDebug}
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Configuração de SMTP</h2>
          <p className="text-slate-600 mt-1">
            Gerencie a conta de e-mail oficial utilizada para disparar suas campanhas e automações.
          </p>
        </div>
        {!editando && contaUnica && (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm shrink-0"
          >
            <Edit className="size-5" /> Editar / Trocar Conta
          </button>
        )}
      </div>

      {/* MODO DE VISUALIZAÇÃO (QUANDO NÃO ESTÁ EDITANDO E HÁ CONTA) */}
      {!editando && contaUnica ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl">
                {contaUnica.type === 'gmail' ? <Mail className="size-8" /> : <Globe className="size-8" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">{contaUnica.sender_name || 'Servidor SMTP Principal'}</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Ativa
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">Provedor configurado e pronto para disparos</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm">
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail / Usuário SMTP</span>
              <span className="font-mono font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 block">
                {contaUnica.email}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Remetente (Exibido ao Lead)</span>
              <span className="font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 block">
                {contaUnica.sender_email}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Servidor Host & Porta</span>
              <span className="font-mono font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 block">
                {contaUnica.host}:{contaUnica.port}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Limite de Envios Diário</span>
              <span className="font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 block">
                {contaUnica.daily_limit || 450} e-mails / dia (Enviados hoje: {contaUnica.sent_today || 0})
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* MODO DE EDIÇÃO / CRIAÇÃO */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={salvarOuCriarConta} className="space-y-6" noValidate>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome de Identificação</label>
                <input required type="text" value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Meu Servidor Oficial"
                  className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Escolha o Provedor</label>
                <select value={formData.provider}
                  onChange={e => trocarProvedor(e.target.value)}
                  className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-medium">
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Host SMTP</label>
                <input required type="text" value={formData.host}
                  onChange={e => setFormData({ ...formData, host: e.target.value })}
                  placeholder="Ex: smtp.seudominio.com"
                  className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Porta SMTP</label>
                <input required type="text" value={formData.porta}
                  onChange={e => setFormData({ ...formData, porta: e.target.value })}
                  placeholder="Ex: 587 ou 465"
                  className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-medium" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Usuário / Login SMTP *</label>
                <input required type="text" value={formData.usuario}
                  autoComplete="off"
                  onChange={e => setFormData({ ...formData, usuario: e.target.value })}
                  placeholder={providerAtual.precisaUsuarioEmail ? 'seu-email@dominio.com' : 'Ex: apikey'}
                  className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-mono text-sm" />
                <p className="text-xs text-blue-700 mt-1.5 flex items-start gap-1">
                  <Info className="size-3.5 mt-0.5 shrink-0" /> {providerAtual.dicaUsuario}
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Senha / Token SMTP {contaUnica && <span className="text-xs font-normal text-slate-500">(vazio = manter a atual)</span>}
                </label>
                <input required={!contaUnica} type="password" value={formData.senha}
                  onChange={e => setFormData({ ...formData, senha: e.target.value })}
                  placeholder={contaUnica ? '•••••••• (deixe em branco para não alterar)' : '••••••••••••'}
                  className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-mono text-sm" />
                <p className="text-xs text-blue-700 mt-1.5 flex items-start gap-1">
                  <Info className="size-3.5 mt-0.5 shrink-0" /> {providerAtual.dicaSenha}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">E-mail do Remetente (Exibido no "De:") *</label>
                <input required type="email" value={formData.remetente}
                  onChange={e => setFormData({ ...formData, remetente: e.target.value })}
                  placeholder="contato@seudominio.com"
                  className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Limite Diário de Envios</label>
                <input type="number" min={1} max={1000000} value={formData.daily_limit}
                  onChange={e => setFormData({ ...formData, daily_limit: Number(e.target.value) || 450 })}
                  className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-bold" />
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-6 border-t border-slate-100">
              {contaUnica && (
                <button type="button" onClick={() => setEditando(false)}
                  className="px-6 py-3.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={salvando}
                className="px-8 py-3.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
                {salvando ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                Salvar Configuração SMTP
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  )
}