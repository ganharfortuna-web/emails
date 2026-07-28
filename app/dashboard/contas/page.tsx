"use client"

import { useState } from 'react'
import { Plus, Mail, X } from 'lucide-react'

export default function ContasPage() {
  // Isso controla se o formulário (modal) está aberto ou fechado
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            Contas de Envio (Gmails e SMTP)
          </h2>
          
          <br />
          
          <p className="text-lg text-slate-600">
            Gerencie as contas conectadas e configure os limites seguros para disparo rotativo.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="size-5" />
          Adicionar Conta
        </button>
      </div>

      {/* ÁREA DE CONTAS VAZIA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center mt-12">
        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
          <Mail className="size-10 text-slate-400" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-700 mb-2">
          Nenhuma conta conectada
        </h3>
        
        <br />
        
        <p className="text-slate-500 max-w-md mx-auto">
          Você ainda não adicionou nenhum Gmail ou SMTP para realizar os envios. Clique no botão acima para configurar sua primeira conexão.
        </p>
      </div>
      
      {/* MODAL (FORMULÁRIO DE ADICIONAR CONTA) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl relative">
            
            {/* Botão de Fechar */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="size-6" />
            </button>

            <h3 className="text-2xl font-bold text-slate-900">
              Nova Conta de Envio
            </h3>
            
            <br />
            
            <p className="text-slate-600 mb-6">
              Insira as credenciais e defina os limites para evitar bloqueios.
            </p>

            <form className="space-y-5">
              {/* Tipo de Conexão */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Conexão</label>
                <select className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700">
                  <option>Gmail (App Passwords)</option>
                  <option>SMTP Externo (AWS, SendGrid, etc)</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Endereço de E-mail</label>
                <input type="email" placeholder="exemplo@gmail.com" className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700" />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Senha de Aplicativo (ou Senha SMTP)</label>
                <input type="password" placeholder="••••••••••••" className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700" />
              </div>

              {/* Limites de Segurança */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Limite Diário</label>
                  <input type="number" placeholder="Ex: 50" className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700" />
                  <span className="text-xs text-slate-500 mt-1.5 block font-medium">Qtd. máx de e-mails/dia</span>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Intervalo (Segundos)</label>
                  <input type="number" placeholder="Ex: 90" className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700" />
                  <span className="text-xs text-slate-500 mt-1.5 block font-medium">Espera entre cada disparo</span>
                </div>
              </div>

              {/* Botão Salvar */}
              <button type="button" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-lg transition-colors mt-6">
                Salvar Conta e Limites
              </button>
            </form>

          </div>
        </div>
      )}
      
    </div>
  )
}