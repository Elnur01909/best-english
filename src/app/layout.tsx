import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BattleChallengePopup from '@/components/BattleChallengePopup'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

// latin-ext Azərbaycan hərflərini (ə, ğ, ı, ş...) əhatə edir
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
})

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
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="az" className={inter.variable}>
      <body className="min-h-screen">
        {children}
        <BattleChallengePopup />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
