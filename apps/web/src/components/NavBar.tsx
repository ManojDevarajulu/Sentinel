'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function NavBar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[rgba(10,10,11,0.92)] border-b border-[var(--color-border-main)] backdrop-blur-md">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <Image src="/sentinel_logo_dark.svg" alt="Sentinel Logo" width={24} height={24} className="group-hover:scale-110 transition-transform" />
        <span className="font-display font-bold tracking-wider text-sm uppercase hover:text-[var(--color-accent)] transition-colors">Sentinel</span>
      </Link>

      {/* Nav Links */}
      <div className="flex items-center gap-5">
        <Link
          href="/"
          className={`font-mono text-xs uppercase tracking-wider transition-colors ${isActive('/') ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]'}`}
        >
          HOME
        </Link>
      </div>
    </nav>
  )
}
