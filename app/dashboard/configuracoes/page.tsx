'use client'

import { useState, useEffect } from 'react'
import { Server, Mail, Plus, Trash2, Save, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Inicializa o cliente Supabase para o front-end
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ConfiguracoesEnvioPage() {
  const [activeTab, setActiveTab] = useState<'gmail' | 'smtp'>('gmail')
  const [contas, setContas] = useState<any[]>([])
  
  // Estados do formulário
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('587')
  const [senderName, setSenderName] = useState('')

  // Busca as contas salvas no Supabase ao carregar a página
  useEffect(() => {
    carregarContas()
  }, [])

  const carregarContas = async () => {
    const { data, error } = await supabase
      .from('smtp_accounts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setContas(data)
  }

  const salvarConta = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const novaConta = {
      type: activeTab,
      email: email,
      app_password: password,
      host: activeTab === 'gmail' ? 'smtp.gmail.com' : host,
      port: activeTab === 'gmail' ? 587 : parseInt(port),
      sender_name: senderName,
      is_active: true,
      sent_today: 0,
      daily_limit: activeTab === 'gmail' ? 450 : 10000 // Gmail limitado a 450/dia
    }

    const { error } = await supabase.from('smtp_accounts').insert([novaConta])

    if (!error) {
      alert('Conta adicionada com sucesso!')
      carregarContas()
      // Limpa os campos
      setEmail(''); setPassword(''); setHost(''); setSenderName('')
    } else {
      alert('Erro ao salvar conta: ' + error.message)
    }
  }

  const deletarConta = async (id: string) => {
    if(confirm('Tem certeza que deseja remover esta conta de envio?')) {
      await supabase.from('smtp_accounts').delete().eq('id', id)
      carregarContas()
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900">Infraestrutura de Envios</h2>
        <p className="text-lg text-slate-600 mt-2">
          Cadastre suas contas de Gmail (Senha de App) ou servidores SMTP externos. O sistema irá rotacionar os envios automaticamente.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* COLUNA DO FORMULÁRIO */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="font-bold text-lg text-slate-900 mb-6">Adicionar Nova Conta</h3>

            <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
              <button 
                onClick={() => setActiveTab('gmail')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'gmail' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                Conta Gmail
              </button>
              <button 
                onClick={() => setActiveTab('smtp')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'smtp' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                SMTP Externo
              </button>
            </div>

            <form onSubmit={salvarConta} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome de Remetente</label>
                <input required value={senderName} onChange={e => setSenderName(e.target.value)} type="text" placeholder="Ex: Jose Valderi" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                <input required value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seuemail@gmail.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>

              {activeTab === 'smtp' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Host SMTP</label>
                    <input required value={host} onChange={e => setHost(e.target.value)} type="text" placeholder="smtp.sendgrid.net" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Porta</label>
                    <input required value={port} onChange={e => setPort(e.target.value)} type="text" placeholder="587" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  {activeTab === 'gmail' ? 'Senha de App (16 dígitos)' : 'Senha do SMTP'}
                </label>
                <input required value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500" />
                {activeTab === 'gmail' && (
                  <p className="text-xs text-slate-500 mt-2 flex items-start gap-1">
                    <AlertCircle className="size-3 mt-0.5 shrink-0" />
                    Use a senha de aplicativo gerada na sua conta Google, não a senha padrão.
                  </p>
                )}
              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-colors mt-2">
                <Plus className="size-5" />
                Salvar Configuração
              </button>
            </form>
          </div>
        </div>

        {/* COLUNA DA LISTAGEM */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">Contas Ativas no Rodízio</h3>
              <p className="text-sm text-slate-500">O sistema alterna entre estas contas a cada lote disparado pelo Cron.</p>
            </div>
            
            <div className="divide-y divide-slate-100">
              {contas.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Nenhuma conta configurada ainda.</div>
              ) : (
                contas.map((conta) => (
                  <div key={conta.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${conta.type === 'gmail' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {conta.type === 'gmail' ? <Mail className="size-6" /> : <Server className="size-6" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{conta.email}</h4>
                        <div className="flex items-center gap-3 text-sm mt-1">
                          <span className="text-slate-500">Host: {conta.host}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-emerald-600 font-bold">Hoje: {conta.sent_today} / {conta.daily_limit}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button onClick={() => deletarConta(conta.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}