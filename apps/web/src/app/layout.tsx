import type { Metadata } from 'next'
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] font-sans">
        {/* Navigation Bar */}
        <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[rgba(10,10,11,0.96)] border-b border-[var(--color-border-main)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] animate-pulse"></div>
            <span className="font-display font-bold tracking-wider text-sm uppercase">Sentinel</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="font-mono text-xs text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] transition-colors">DASHBOARD</a>
            <button className="btn-primary text-[10px]">LOGIN WITH GITHUB</button>
          </div>
        </nav>
        
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
