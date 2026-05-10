'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setDropdownOpen(false)
    router.push('/')
  }

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? '??'

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[rgba(10,10,11,0.92)] border-b border-[var(--color-border-main)] backdrop-blur-md">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] animate-pulse group-hover:scale-125 transition-transform" />
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

        {user && (
          <Link
            href="/dashboard"
            className={`font-mono text-xs uppercase tracking-wider transition-colors ${pathname.startsWith('/dashboard') ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]'}`}
          >
            DASHBOARD
          </Link>
        )}

        {!user ? (
          <Link href="/login" className="btn-primary text-[10px]">
            LOGIN / SIGNUP
          </Link>
        ) : (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 focus:outline-none group"
              title="Account"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-black font-display font-bold text-xs group-hover:opacity-90 transition-opacity">
                {initials}
              </div>
              <svg
                className={`w-3 h-3 text-[var(--color-text-muted)] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-[var(--color-background-2)] border border-[var(--color-border-sub)] rounded-xl shadow-2xl overflow-hidden z-20">
                  <div className="px-4 py-3 border-b border-[var(--color-border-main)]">
                    <p className="text-xs font-bold text-[var(--color-text-main)] truncate">{user.user_metadata?.full_name || 'User'}</p>
                    <p className="text-[10px] font-mono text-[var(--color-text-muted)] truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-mono hover:bg-[var(--color-background-3)] transition-colors ${pathname === '/profile' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-sub)] hover:text-white'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      PROFILE
                    </Link>
                    <Link
                      href="/profile?tab=settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs font-mono text-[var(--color-text-sub)] hover:bg-[var(--color-background-3)] hover:text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      SETTINGS
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs font-mono text-[var(--color-text-sub)] hover:bg-[var(--color-background-3)] hover:text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      DASHBOARD
                    </Link>
                  </div>
                  <div className="border-t border-[var(--color-border-main)] py-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-mono text-[var(--color-red)] hover:bg-[rgba(255,71,87,0.08)] transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      SIGN OUT
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
