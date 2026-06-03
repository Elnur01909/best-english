import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Best English — TOLES Hazırlıq Platforması',
  description: 'İngilis dilini və TOLES sertifikatını elmi metodlarla öyrən',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="az">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {children}
      </body>
    </html>
  )
}
