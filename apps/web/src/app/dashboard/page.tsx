'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [repos, setRepos] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanPath, setScanPath] = useState('')
  const [scanName, setScanName] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const loadRepos = async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('repos')
      .select(`
        *,
        scan_jobs ( status, created_at ),
        graph_nodes ( id )
      `)
      .order('updated_at', { ascending: false })

    setLoading(false)
    if (err) {
      setError(`Could not load repos: ${err.message}. Make sure the Supabase 'repos' table has read access.`)
      return
    }

    const mappedRepos = (data || []).map((r: any) => {
      const latestJob = r.scan_jobs?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())?.[0]
      return {
        ...r,
        full_name: r.repo_name,
        scan_status: latestJob?.status || 'pending',
        node_count: r.graph_nodes?.length || 0,
        last_scanned_at: r.updated_at
      }
    })

    setRepos(mappedRepos)
    setLoaded(true)
  }

  // Auto-load repos on mount once the session is confirmed
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserId(data.session.user.id)
        loadRepos()
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanPath || !scanName) return
    setScanning(true)
    setScanMsg('')

    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session
    const user_id = session?.user?.id

    if (!user_id) {
      setScanMsg('You must be logged in to scan a repo.')
      setScanning(false)
      return
    }

    // 1. Insert repo row
    const { data: repo, error: repoErr } = await supabase
      .from('repos')
      .insert([{ 
        user_id,
        github_repo_id: `local_${Date.now()}`,
        repo_name: scanName, 
        default_branch: 'main' 
      }])
      .select()
      .single()

    if (repoErr || !repo) {
      setScanMsg(`Failed to create repo: ${repoErr?.message}`)
      setScanning(false)
      return
    }

    // 2. Trigger scan via backend API
    const token = session?.access_token

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/repos/${repo.id}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ repo_id: repo.id, repo_path: scanPath })
      })
      const result = await res.json()
      if (res.ok) {
        setScanMsg(`✓ Scan started! Job ID: ${result.job_id}. Refreshing repos...`)
        await loadRepos()
      } else {
        setScanMsg(`Scan error: ${result.detail || JSON.stringify(result)}`)
      }
    } catch (e: any) {
      setScanMsg(`Could not reach API: ${e.message}`)
    }
    setScanning(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--color-border-main)]">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="text-[var(--color-text-sub)] text-sm mt-1">Manage and monitor connected TypeScript and Python repositories.</p>
        </div>
        <button onClick={loadRepos} disabled={loading} className="btn-primary flex items-center gap-2 text-xs disabled:opacity-60">
          {loading ? 'Loading...' : loaded ? '↻ Refresh' : 'Load Repos'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-[rgba(255,71,87,0.1)] border border-[var(--color-red)] rounded-lg text-[var(--color-red)] text-sm">
          <p className="font-bold mb-1">⚠ Error</p>
          <p>{error}</p>
          <p className="mt-2 text-xs opacity-70">
            → <a href="/login" className="underline">Sign in</a> to access your repositories, or check Supabase RLS policies.
          </p>
        </div>
      )}

      {/* Scan a local repo */}
      <div className="mb-8 p-6 border border-dashed border-[var(--color-border-sub)] rounded-xl bg-[var(--color-background-2)]">
        <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-3 uppercase">Scan a Local Repository</p>
        <p className="text-sm text-[var(--color-text-sub)] mb-4">
          Enter the name and the absolute path to a local repo. The backend must have access to this path (it's mounted at <code className="text-[var(--color-accent)] bg-[var(--color-accent-bg)] px-1 rounded">/tmp/Life_Quest</code> in Docker by default).
        </p>
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text" value={scanName} onChange={e => setScanName(e.target.value)}
            placeholder="Repo name (e.g. my-org/frontend)"
            className="flex-1 bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
          />
          <input
            type="text" value={scanPath} onChange={e => setScanPath(e.target.value)}
            placeholder="Server path (e.g. /tmp/Life_Quest)"
            className="flex-1 bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
          />
          <button type="submit" disabled={scanning || !scanPath || !scanName}
            className="btn-primary text-xs px-5 disabled:opacity-60 whitespace-nowrap">
            {scanning ? 'Scanning...' : '▶ Start Scan'}
          </button>
        </form>
        {scanMsg && (
          <p className={`mt-3 text-xs font-mono ${scanMsg.startsWith('✓') ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
            {scanMsg}
          </p>
        )}
      </div>

      {/* Initial loading / empty state */}
      {!loaded && !error && loading && (
        <div className="text-center py-16 text-[var(--color-text-muted)] font-mono text-sm">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading repositories...</p>
        </div>
      )}

      {loaded && repos.length === 0 && (
        <div className="text-center py-16 text-[var(--color-text-muted)] font-mono text-sm">
          <p>No repositories found. Use the form above to scan your first repo.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repos.map(repo => (
          <a key={repo.id} href={`/dashboard/${repo.id}`} className="card hover:border-[var(--color-accent-sub)] transition-colors cursor-pointer group block">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-mono text-sm font-medium text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] transition-colors">
                {repo.full_name}
              </h3>
              {repo.scan_status === 'done' ? (
                <span className="badge border border-[rgba(46,213,115,0.2)] bg-[rgba(46,213,115,0.1)] text-[var(--color-green)]">SCANNED</span>
              ) : (
                <span className="badge border border-[rgba(255,165,2,0.2)] bg-[rgba(255,165,2,0.1)] text-[var(--color-amber)] animate-pulse">
                  {repo.scan_status?.toUpperCase() || 'PENDING'}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-[var(--color-text-muted)]">
              <div><span className="text-[var(--color-text-sub)]">{repo.node_count}</span> NODES</div>
              <div>BRANCH: <span className="text-[var(--color-text-sub)]">{repo.default_branch}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--color-border-sub)] text-[10px] font-mono text-[var(--color-text-muted)]">
              LAST SCANNED: {repo.last_scanned_at ? new Date(repo.last_scanned_at).toLocaleDateString() : 'N/A'}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
