import './globals.css'
import type { Metadata } from 'next'

// O Next.js injeta isso automaticamente no <head>
export const metadata: Metadata = {
  title: 'Título do Seu Projeto',
  description: 'Descrição para aparecer no Google',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}