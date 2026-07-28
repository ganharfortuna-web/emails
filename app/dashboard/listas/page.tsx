import { Plus, Users, ArrowRight } from 'lucide-react'

export default function ListasPage() {
  return (
    <div className="max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            Gestão de Listas
          </h2>
          
          <br />
          
          <p className="text-lg text-slate-600">
            Organize seus contatos e leads para direcionar suas campanhas de forma estratégica.
          </p>
        </div>
        
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm">
          <Plus className="size-5" />
          Criar Nova Lista
        </button>
      </div>

      {/* LISTAS EXISTENTES (Tabela) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-12">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="p-6 font-bold">Nome da Lista</th>
              <th className="p-6 font-bold">Total de Leads</th>
              <th className="p-6 font-bold">Último Envio</th>
              <th className="p-6 font-bold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            
            {/* Exemplo de Lista 1 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="p-6 font-bold text-slate-900 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Users className="size-5 text-blue-700" />
                </div>
                Leads - Ebook Masterclass
              </td>
              <td className="p-6 text-slate-600 font-medium">4.250</td>
              <td className="p-6 text-slate-600">Hoje, 09:30</td>
              <td className="p-6">
                <button className="text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1">
                  Ver contatos <ArrowRight className="size-4" />
                </button>
              </td>
            </tr>

            {/* Exemplo de Lista 2 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="p-6 font-bold text-slate-900 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Users className="size-5 text-blue-700" />
                </div>
                Compradores - Mentoria
              </td>
              <td className="p-6 text-slate-600 font-medium">842</td>
              <td className="p-6 text-slate-600">Ontem, 15:45</td>
              <td className="p-6">
                <button className="text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1">
                  Ver contatos <ArrowRight className="size-4" />
                </button>
              </td>
            </tr>

          </tbody>
        </table>
      </div>
      
    </div>
  )
}