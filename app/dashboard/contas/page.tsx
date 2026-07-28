import { Plus, Mail } from 'lucide-react'

export default function ContasPage() {
  return (
    <div className="max-w-6xl mx-auto">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            Contas de Envio (Gmails)
          </h2>
          
          <br />
          
          <p className="text-lg text-slate-600">
            Gerencie as contas conectadas que farão o disparo rotativo das suas campanhas.
          </p>
        </div>
        
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm">
          <Plus className="size-5" />
          Adicionar Conta
        </button>
      </div>

      {/* ÁREA DE CONTAS VAZIA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center mt-12">
        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
          <Mail className="size-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhuma conta conectada</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Você ainda não adicionou nenhum Gmail para realizar os envios. Clique no botão acima para conectar sua primeira conta usando App Passwords.
        </p>
      </div>
      
    </div>
  )
}