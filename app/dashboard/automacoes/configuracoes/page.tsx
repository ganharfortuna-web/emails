'use client'

import React, { useState, useEffect } from 'react'
import { Server, Plus, Trash2, Power, Loader2, Mail, Globe } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ConfiguracoesPage() {
  const [servidores, setServidores] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modoCriacao, setModoCriacao] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [novoServidor, setNovoServidor] = useState({
    nome: '',
    tipo: 'gmail',
    host: '',
    porta: '',
    usuario: '',
    senha: '',
    remetente: ''
  })

  useEffect(() => {
    carregarServidores()
  }, [])

  const carregarServidores = async () => {
    setCarregando(true)
    const { data } = await supabase.from('servidores_email').select('*').order('created_at', { ascending: false })
    if (data) setServidores(data)
    setCarregando(false)
  }

  const salvarServidor = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    const { error } = await supabase.from('servidores_email').insert([novoServidor])

    if (!error) {
      setModoCriacao(false)
      setNovoServidor({ nome: '', tipo: 'gmail', host: '', porta: '', usuario: '', senha: '', remetente: '' })
      carregarServidores()
    } else {
      alert('Erro ao salvar o servidor. Verifique sua conexão.')
    }
    setSalvando(false)
  }

  const alternarStatus = async (id: string, statusAtual: boolean) => {
    await supabase.from('servidores_email').update({ ativo: !statusAtual }).eq('id', id)
    carregarServidores()
  }

  const deletarServidor = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este servidor permanentemente?')) return
    await supabase.from('servidores_email').delete().eq('id', id)
    carregarServidores()
  }

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Arsenal de Servidores</h2>
          <p className="text-lg text-slate-600 mt-2">Cadastre e gerencie suas contas de Gmail e SMTP para rotacionar os envios.</p>
        </div>
        <button 
          onClick={() => setModoCriacao(!modoCriacao)} 
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <Plus className="size-5" /> Adicionar Servidor
        </button>
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO */}
      {modoCriacao && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl mb-8 shadow-sm animate-in fade-in zoom-in duration-200">
          <h3 className="font-bold text-slate-800 text-lg mb-4">Novo Servidor</h3>
          <form onSubmit={salvarServidor} className="space-y-4">
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome de Identificação</label>
                <input required type="text" value={novoServidor.nome} onChange={e => setNovoServidor({...novoServidor, nome: e.target.value})} placeholder="Ex: Gmail Atendimento 01" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Servidor</label>
                <select value={novoServidor.tipo} onChange={e => setNovoServidor({...novoServidor, tipo: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="gmail">Google Gmail</option>
                  <option value="smtp">SMTP Externo (Hostinger, AWS, etc)</option>
                </select>
              </div>
            </div>

            {novoServidor.tipo === 'smtp' && (
              <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Host SMTP</label>
                  <input required={novoServidor.tipo === 'smtp'} type="text" value={novoServidor.host} onChange={e => setNovoServidor({...novoServidor, host: e.target.value})} placeholder="Ex: smtp.hostinger.com" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Porta SMTP</label>
                  <input required={novoServidor.tipo === 'smtp'} type="text" value={novoServidor.porta} onChange={e => setNovoServidor({...novoServidor, porta: e.target.value})} placeholder="Ex: 465" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail de Login (Usuário)</label>
                <input required type="email" value={novoServidor.usuario} onChange={e => setNovoServidor({...novoServidor, usuario: e.target.value})} placeholder="email@gmail.com" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Senha (ou Senha de App)</label>
                <input required type="password" value={novoServidor.senha} onChange={e => setNovoServidor({...novoServidor, senha: e.target.value})} placeholder="••••••••••••" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">E-mail do Remetente (O que o cliente vê na caixa de entrada)</label>
              <input required type="email" value={novoServidor.remetente} onChange={e => setNovoServidor({...novoServidor, remetente: e.target.value})} placeholder="contato@seudominio.com" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModoCriacao(false)} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" disabled={salvando} className="px-6 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
                {salvando ? <Loader2 className="size-5 animate-spin" /> : 'Salvar Servidor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTA DE SERVIDORES */}
      <div className="grid lg:grid-cols-2 gap-6">
        {carregando ? (
           <div className="col-span-full p-12 flex justify-center">
             <Loader2 className="size-8 animate-spin text-blue-500" />
           </div>
        ) : servidores.length === 0 ? (
           <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
             Nenhum servidor cadastrado. Clique no botão azul acima para adicionar sua primeira conta.
           </div>
        ) : (
          servidores.map(servidor => (
            <div key={servidor.id} className={`bg-white rounded-2xl border ${servidor.ativo ? 'border-slate-200 shadow-sm' : 'border-dashed border-slate-300 opacity-60'} p-6 transition-all`}>
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${servidor.tipo === 'gmail' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {servidor.tipo === 'gmail' ? <Mail className="size-6" /> : <Globe className="size-6" />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg leading-tight">{servidor.nome}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{servidor.tipo}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => alternarStatus(servidor.id, servidor.ativo)} 
                    className={`p-2 rounded-lg transition-colors ${servidor.ativo ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} 
                    title={servidor.ativo ? 'Pausar Conta' : 'Ativar Conta'}
                  >
                    <Power className="size-5" />
                  </button>
                  <button 
                    onClick={() => deletarServidor(servidor.id)} 
                    className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" 
                    title="Deletar"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 break-words">
                <p><strong className="text-slate-800">Login:</strong> {servidor.usuario}</p>
                <p><strong className="text-slate-800">Remetente:</strong> {servidor.remetente}</p>
                {servidor.tipo === 'smtp' && (
                   <p><strong className="text-slate-800">Host:</strong> {servidor.host}:{servidor.porta}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}