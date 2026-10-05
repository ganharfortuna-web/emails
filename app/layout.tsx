import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Instância da fonte Inter (resolve o aviso em inter.className)
const inter = Inter({ subsets: ['latin'] })

// Metadados da aplicação para abas e SEO
export const metadata: Metadata = {
  title: 'Sistema Envios | Dashboard',
  description: 'Plataforma para automação e disparo de e-mails.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}