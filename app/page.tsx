'use client'

import Link from 'next/link'
import { Mail, Server, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-200">
      
      {/* HERO SECTION */}
      <section className="bg-slate-950 text-white py-24 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6">
            Liberdade das mensalidades abusivas de e-mail marketing
          </h1>
          
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Tenha sua própria infraestrutura de envios com alta taxa de entrega, pague apenas uma vez pela licença e nunca mais fique refém de planos mensais que limitam o seu crescimento.
          </p>
          
          <Link 
            href="#oferta"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg py-4 px-8 rounded-lg transition-colors shadow-lg shadow-orange-500/20"
          >
            Quero meu sistema próprio
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>

      {/* BENEFÍCIOS SECTION */}
      <section className="py-24 bg-slate-50 px-4 border-b border-slate-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Tecnologia de ponta para sua operação
            </h2>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Desenvolvido para empreendedores que precisam de escala, controle absoluto e garantia de que a mensagem chegará na caixa de entrada.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="bg-blue-900/10 w-14 h-14 flex items-center justify-center rounded-xl mb-6">
                <Mail className="size-7 text-blue-900" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Gmails Rotativos
              </h3>
              <p className="text-slate-600">
                Cadastre múltiplas contas do Gmail utilizando App Passwords. O sistema rotaciona os envios automaticamente para proteger sua reputação.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="bg-blue-900/10 w-14 h-14 flex items-center justify-center rounded-xl mb-6">
                <Server className="size-7 text-blue-900" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                SMTP Externo
              </h3>
              <p className="text-slate-600">
                Precisa de envio em massa pesado? Conecte servidores SMTP externos e gerencie toda a entrega diretamente do seu painel.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="bg-emerald-100 w-14 h-14 flex items-center justify-center rounded-xl mb-6">
                <ShieldCheck className="size-7 text-emerald-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Alta Taxa de Entrega
              </h3>
              <p className="text-slate-600">
                Limpeza inteligente de listas e algoritmos de proteção garantem que seus e-mails cheguem na aba principal dos seus leads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OFERTA / PREÇO SECTION */}
      <section id="oferta" className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-950 rounded-3xl p-8 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            <h2 className="text-3xl md:text-5xl font-black mb-6">
              Acesso Vitalício ao Sistema
            </h2>
            
            <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">
              Chega de pagar mensalidades caras. Adquira a licença do software, receba a instalação completa e tenha controle total dos seus dados.
            </p>

            <div className="bg-white/10 rounded-2xl p-8 inline-block mb-10 border border-white/20">
              <span className="block text-blue-200 text-sm font-bold uppercase tracking-wider mb-2">Investimento Único</span>
              <span className="text-5xl font-black text-white">R$ 1.497,00</span>
              <span className="block text-sm text-blue-200 mt-2">(Pagamento Único pela Instalação e Licença)</span>
            </div>

            <ul className="text-left max-w-sm mx-auto space-y-4 mb-10">
              <li className="flex items-center gap-3 text-blue-50">
                <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                Sistema 100% completo e instalado
              </li>
              <li className="flex items-center gap-3 text-blue-50">
                <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                Painel Admin e Automações
              </li>
              <li className="flex items-center gap-3 text-blue-50">
                <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                Criador de Landing Pages integrado
              </li>
            </ul>

            <Link 
              href="https://wa.me/5561982096982?text=Ola!%20Gostaria%20de%20contratar%20o%20sistema%20de%20email%20marketing%20proprio."
              target="_blank"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl py-5 px-10 rounded-xl transition-all shadow-lg hover:shadow-orange-500/30 hover:-translate-y-1 w-full sm:w-auto justify-center"
            >
              Falar no WhatsApp para Contratar
            </Link>
          </div>
        </div>
      </section>

      {/* SOBRE O DESENVOLVEDOR & RODAPÉ */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-4 text-center border-t border-slate-900">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-6">
            Sobre o Desenvolvedor
          </h2>
          
          <p className="leading-relaxed mb-12 text-slate-300">
            Desenvolvido por Jose Valderi, programador e empreendedor digital com diversos projetos lançados com sucesso no mercado. Construindo soluções reais para escalar o seu negócio.
          </p>

          <div className="border-t border-slate-800 pt-8">
            <h3 className="text-white font-bold mb-6">Dúvidas? Fale diretamente comigo:</h3>
            <Link 
              href="https://wa.me/5561982096982"
              target="_blank"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              WhatsApp: (61) 98209-6982
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}