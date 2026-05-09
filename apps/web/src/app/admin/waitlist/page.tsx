'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type WaitlistEntry = {
  id: string
  email: string
  created_at: string
  metadata?: {
    name?: string
    feedback?: string
    source?: string
  } | null
}

export default function WaitlistAdminPage() {
  const router = useRouter()
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login?redirectTo=/admin/waitlist')
        return
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/v1/admin/waitlist`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const payload = await response.json()

        if (!active) return

        if (!response.ok) {
          setErrorMsg(payload.detail || 'Failed to fetch waitlist')
          return
        }

        setWaitlist(payload.entries || [])
      } catch (err: unknown) {
        if (!active) return
        setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch waitlist')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()

    return () => {
      active = false
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--color-border-main)]">
          <div>
            <h1 className="text-2xl font-display font-bold">Waitlist Interest</h1>
            <p className="text-[var(--color-text-sub)] text-sm mt-1">Review users who have joined the waitlist and their feedback.</p>
          </div>
          <div className="badge badge-yellow">
            <span className="text-[10px]">{waitlist.length} ENTRIES</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 mb-8 bg-[rgba(255,71,87,0.1)] border border-[var(--color-red)] rounded-lg text-[var(--color-red)] text-sm">
            Error loading waitlist: {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {waitlist.length === 0 && !errorMsg ? (
            <p className="text-[var(--color-text-muted)] text-sm">No waitlist entries found.</p>
          ) : (
            waitlist.map((entry) => (
              <div key={entry.id || entry.email} className="card flex flex-col justify-between hover:border-[var(--color-border-sub)] transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-white">{entry.metadata?.name || 'Anonymous'}</h3>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                  <a href={`mailto:${entry.email}`} className="text-sm font-mono text-[var(--color-accent)] hover:underline mb-4 block break-all">
                    {entry.email}
                  </a>

                  {entry.metadata?.source && (
                    <p className="text-[10px] text-[var(--color-text-muted)] font-mono mb-3 uppercase tracking-widest">
                      Source: {entry.metadata.source}
                    </p>
                  )}
                  
                  {entry.metadata?.feedback && (
                    <div className="mt-4 pt-4 border-t border-[var(--color-border-sub)]">
                      <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-mono mb-2">Feedback</p>
                      <p className="text-sm text-[var(--color-text-sub)] italic">&quot;{entry.metadata.feedback}&quot;</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
