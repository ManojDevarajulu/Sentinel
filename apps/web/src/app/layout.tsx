import type { Metadata } from 'next'
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'

const syne = Syne({ 
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sentinel | Blast Radius Analysis',
  description: 'AI code safety layer. Map your codebase and compute blast radius on every PR.',
  icons: {
    icon: '/sentinel_favicon.svg',
  },
  openGraph: {
    title: 'Sentinel | Blast Radius Analysis',
    description: 'AI code safety layer. Map your codebase and compute blast radius on every PR.',
    siteName: 'Sentinel',
    images: [
      {
        url: '/image.png',
        width: 1200,
        height: 630,
        alt: 'Sentinel - AI code safety layer',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sentinel | Blast Radius Analysis',
    description: 'AI code safety layer. Map your codebase and compute blast radius on every PR.',
    images: ['/image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] font-sans">
        <NavBar />
        {children}
      </body>
    </html>
  )
}
