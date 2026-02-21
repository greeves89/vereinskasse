import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import CookieConsent from '@/components/cookie-consent'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'VereinsKasse',
    template: '%s | VereinsKasse',
  },
  description: 'Professionelle Kassenverwaltung für deutsche Vereine',
  keywords: ['Kassenverwaltung', 'Verein', 'Buchhaltung', 'Mitgliederverwaltung'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}
