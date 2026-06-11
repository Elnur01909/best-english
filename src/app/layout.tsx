import type { Metadata, Viewport } from 'next'
import './globals.css'
import BattleChallengePopup from '@/components/BattleChallengePopup'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'Best English — TOLES Hazırlıq Platforması',
  description: 'İngilis dilini və TOLES sertifikatını elmi metodlarla öyrən',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Best English',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
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
        <BattleChallengePopup />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
