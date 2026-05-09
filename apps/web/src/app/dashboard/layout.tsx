'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getRepos, type Repo } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(true)

  useEffect(() => {
    let active = true

    async function loadSidebarRepos() {
      const { data } = await supabase.auth.getSession()

      if (!active) return

      if (!data.session) {
        setRepos([])
        setLoadingRepos(false)
        return
      }

      const repoList = await getRepos()

      if (!active) return

      setRepos(repoList)
      setLoadingRepos(false)
    }

    loadSidebarRepos()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setRepos([])
        setLoadingRepos(false)
        return
      }

      setLoadingRepos(true)
      loadSidebarRepos()
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      <aside className="w-64 flex-shrink-0 border-r border-[var(--color-border-main)] bg-[var(--color-background-2)] flex-col hidden md:flex">
        <div className="p-4 border-b border-[var(--color-border-main)] flex-1 overflow-y-auto">
          <h2 className="font-mono text-xs text-[var(--color-text-sub)] tracking-widest mb-4 uppercase">Repositories</h2>
          <div className="flex flex-col gap-2">
            {loadingRepos ? (
              <p className="text-[10px] text-[var(--color-text-muted)] font-mono py-2 leading-relaxed">
                Loading repositories...
              </p>
            ) : repos.length === 0 ? (
              <p className="text-[10px] text-[var(--color-text-muted)] font-mono py-2 leading-relaxed">
                No repos yet.<br />
                Use the scan form below to add your first repo.
              </p>
            ) : (
              repos.map((repo) => (
                <Link
                  key={repo.id}
                  href={`/dashboard/${repo.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-[var(--color-background-3)] border border-transparent hover:border-[var(--color-accent-sub)] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-3.5 h-3.5 text-[var(--color-text-sub)] group-hover:text-[var(--color-accent)] flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="text-xs font-medium text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] truncate transition-colors">
                      {repo.full_name}
                    </span>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-1 ${repo.scan_status === 'done' ? 'bg-[var(--color-green)]' : 'bg-[var(--color-amber)] animate-pulse'}`} />
                </Link>
              ))
            )}
          </div>

          <Link
            href="/dashboard"
            className="w-full mt-4 py-2 border border-dashed border-[var(--color-border-main)] text-[var(--color-text-sub)] text-xs font-mono uppercase tracking-wider rounded hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors flex items-center justify-center gap-1"
          >
            + Scan Repo
          </Link>
        </div>

        <div className="p-4 border-t border-[var(--color-border-main)] space-y-4">
          <Link href="/profile" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-[var(--color-background-3)] flex items-center justify-center font-mono text-xs border border-[var(--color-border-sub)] group-hover:border-[var(--color-accent-sub)] transition-colors">
              P
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-[var(--color-accent)] transition-colors">Profile</p>
              <p className="text-xs text-[var(--color-text-muted)]">Manage Account</p>
            </div>
          </Link>

        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[var(--color-background)] relative">
        {children}
      </main>
    </div>
  )
}
