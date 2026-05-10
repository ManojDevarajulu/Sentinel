'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getRepos, type Repo } from '@/lib/api'

type GHRepo = {
  id: number
  full_name: string
  private: boolean
  description: string | null
  language: string | null
  updated_at: string
  default_branch: string
  html_url: string
}

type ScanApiResponse = { job_id?: string; detail?: string }
type Tab = 'github' | 'zip' | 'scanned'

export default function DashboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('github')
  const [repos, setRepos] = useState<Repo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)

  // GitHub picker state
  const [ghToken, setGhToken] = useState<string | null>(null)
  const [ghRepos, setGhRepos] = useState<GHRepo[]>([])
  const [ghLoading, setGhLoading] = useState(false)
  const [ghSearch, setGhSearch] = useState('')
  const [importingId, setImportingId] = useState<number | null>(null)
  const [importMsg, setImportMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null)

  // ZIP state
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [zipName, setZipName] = useState('')
  const [uploadingZip, setUploadingZip] = useState(false)
  const [zipMsg, setZipMsg] = useState('')

  const loadScannedRepos = useCallback(async () => {
    setLoadingRepos(true)
    const list = await getRepos()
    setRepos(list)
    setLoadingRepos(false)
  }, [])

  // Auth guard + load gh_token from localStorage
  useEffect(() => {
    let active = true

    async function init(session: any) {
      if (!active) return
      if (session) {
        const token = localStorage.getItem('gh_token')
        setGhToken(token)
        await loadScannedRepos()
      } else if (!window.location.hash.includes('access_token')) {
        router.replace('/login?redirectTo=/dashboard')
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) init(data.session)
      else if (!window.location.hash.includes('access_token')) router.replace('/login?redirectTo=/dashboard')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        if (session.provider_token) {
          localStorage.setItem('gh_token', session.provider_token)
          setGhToken(session.provider_token)
        }
        init(session)
      } else if (!window.location.hash.includes('access_token')) {
        router.replace('/login?redirectTo=/dashboard')
      }
    })

    return () => { active = false; subscription.unsubscribe() }
  }, [router, loadScannedRepos])

  // Fetch GitHub repos when token is available and tab is 'github'
  useEffect(() => {
    if (tab !== 'github' || !ghToken || ghRepos.length > 0) return
    setGhLoading(true)
    fetch('https://api.github.com/user/repos?sort=updated&per_page=100&visibility=all', {
      headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json' }
    })
      .then(r => r.json())
      .then((data: GHRepo[] | { message: string }) => {
        if (Array.isArray(data)) setGhRepos(data)
        else {
          // Token expired or invalid — clear it so user can re-auth
          localStorage.removeItem('gh_token')
          setGhToken(null)
        }
      })
      .catch(() => { localStorage.removeItem('gh_token'); setGhToken(null) })
      .finally(() => setGhLoading(false))
  }, [tab, ghToken, ghRepos.length])

  // Clear Supabase error params from URL on load (e.g. identity_already_exists)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('error') || url.hash.includes('error=')) {
      url.searchParams.delete('error')
      url.searchParams.delete('error_code')
      url.searchParams.delete('error_description')
      // Also clear hash errors
      const cleanUrl = url.origin + url.pathname
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [])

  const reAuthorizeGitHub = async () => {
    // Identity is already linked — just do a fresh OAuth sign-in to get a new provider_token
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/dashboard', scopes: 'repo read:user' }
    })
  }

  const handleImport = async (ghRepo: GHRepo) => {
    setImportingId(ghRepo.id)
    setImportMsg(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session
    if (!session?.user?.id) return

    const { data: repo, error: repoErr } = await supabase
      .from('repos')
      .insert([{
        user_id: session.user.id,
        github_repo_id: String(ghRepo.id),
        repo_name: ghRepo.full_name,
        default_branch: ghRepo.default_branch
      }])
      .select('id').single()

    if (repoErr || !repo) {
      setImportMsg({ id: ghRepo.id, msg: repoErr?.message || 'Failed to create repo', ok: false })
      setImportingId(null)
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/repos/${repo.id}/scan-github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          repo_id: repo.id,
          github_url: ghRepo.html_url,
          github_token: ghToken
        })
      })
      const result = await res.json() as ScanApiResponse
      if (res.ok) {
        setImportMsg({ id: ghRepo.id, msg: `✓ Scan started! Job: ${result.job_id}`, ok: true })
        await loadScannedRepos()
        setTab('scanned')
      } else {
        setImportMsg({ id: ghRepo.id, msg: result.detail || 'Unknown error', ok: false })
      }
    } catch (e: unknown) {
      setImportMsg({ id: ghRepo.id, msg: e instanceof Error ? e.message : 'Network error', ok: false })
    }
    setImportingId(null)
  }

  const handleZipUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!zipFile || !zipName) return
    setUploadingZip(true)
    setZipMsg('')

    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session
    if (!session?.user?.id) return

    const { data: repo, error: repoErr } = await supabase
      .from('repos')
      .insert([{ user_id: session.user.id, github_repo_id: `upload_${Date.now()}`, repo_name: zipName, default_branch: 'main' }])
      .select('id').single()

    if (repoErr || !repo) {
      setZipMsg(`Failed: ${repoErr?.message || 'Unknown error'}`)
      setUploadingZip(false)
      return
    }

    const formData = new FormData()
    formData.append('file', zipFile)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/repos/${repo.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      })
      const result = await res.json() as ScanApiResponse
      if (res.ok) {
        setZipMsg(`✓ Scan started. Job: ${result.job_id}`)
        await loadScannedRepos()
        setZipFile(null)
        setZipName('')
        setTab('scanned')
      } else {
        setZipMsg(`Error: ${result.detail}`)
      }
    } catch (err: unknown) {
      setZipMsg(`Network error: ${err instanceof Error ? err.message : String(err)}`)
    }
    setUploadingZip(false)
  }

  const filteredGhRepos = ghRepos.filter(r =>
    r.full_name.toLowerCase().includes(ghSearch.toLowerCase())
  )

  const LANG_COLORS: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3572A5',
    Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', default: '#8888a0'
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Import Repository</h1>
        <p className="text-[var(--color-text-sub)] text-sm">
          Pick a GitHub repository to scan, or upload a local .zip archive.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--color-background-2)] border border-[var(--color-border-main)] rounded-xl mb-6 w-fit">
        {([
          { key: 'github', label: '⎇  GitHub Repos' },
          { key: 'zip', label: '⬆  Upload ZIP' },
          { key: 'scanned', label: `✦  My Scans (${repos.length})` },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all ${
              tab === t.key
                ? 'bg-[var(--color-accent)] text-black font-bold shadow'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── GITHUB TAB ─── */}
      {tab === 'github' && (
        <div className="border border-[var(--color-border-main)] rounded-xl overflow-hidden">
          {!ghToken ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div className="w-14 h-14 rounded-full bg-[var(--color-background-2)] border border-[var(--color-border-main)] flex items-center justify-center">
                <svg height="28" viewBox="0 0 16 16" width="28" className="fill-white">
                  <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-bold text-white mb-1">GitHub access required</p>
                <p className="text-sm text-[var(--color-text-sub)] max-w-xs">
                  Authorize Sentinel to read your repositories. Private repos included.
                </p>
              </div>
              <button
                onClick={reAuthorizeGitHub}
                className="bg-white hover:bg-[#f0f0f2] text-black font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <svg height="16" viewBox="0 0 16 16" width="16" className="fill-current">
                  <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                </svg>
                Authorize with GitHub
              </button>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div className="p-4 border-b border-[var(--color-border-main)] bg-[var(--color-background-2)] flex items-center gap-3">
                <svg className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={ghSearch}
                  onChange={e => setGhSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none font-mono"
                />
                {ghLoading && (
                  <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
              </div>

              {/* Repo list */}
              <div className="divide-y divide-[var(--color-border-main)] max-h-[520px] overflow-y-auto">
                {ghLoading && filteredGhRepos.length === 0 ? (
                  <div className="py-16 text-center text-[var(--color-text-muted)] font-mono text-sm">
                    <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Fetching your repositories...
                  </div>
                ) : filteredGhRepos.length === 0 ? (
                  <div className="py-16 text-center text-[var(--color-text-muted)] font-mono text-sm">
                    No repositories found.
                  </div>
                ) : (
                  filteredGhRepos.map(ghRepo => (
                    <div
                      key={ghRepo.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-[var(--color-background-2)] transition-colors group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Repo icon */}
                        <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-md bg-[var(--color-background-3)] border border-[var(--color-border-main)] flex items-center justify-center">
                          {ghRepo.private ? (
                            <svg className="w-4 h-4 text-[var(--color-amber)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-semibold text-white truncate">{ghRepo.full_name}</span>
                            <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                              ghRepo.private
                                ? 'border-[rgba(255,165,2,0.3)] text-[var(--color-amber)] bg-[rgba(255,165,2,0.08)]'
                                : 'border-[var(--color-border-main)] text-[var(--color-text-muted)]'
                            }`}>
                              {ghRepo.private ? 'Private' : 'Public'}
                            </span>
                          </div>
                          {ghRepo.description && (
                            <p className="text-xs text-[var(--color-text-sub)] mt-0.5 truncate max-w-xs">{ghRepo.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {ghRepo.language && (
                              <div className="flex items-center gap-1">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: LANG_COLORS[ghRepo.language] || LANG_COLORS.default }}
                                />
                                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{ghRepo.language}</span>
                              </div>
                            )}
                            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                              Updated {new Date(ghRepo.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 ml-4 flex-shrink-0">
                        <button
                          onClick={() => handleImport(ghRepo)}
                          disabled={importingId === ghRepo.id}
                          className="btn-primary text-[10px] py-1.5 px-4 disabled:opacity-60 whitespace-nowrap"
                        >
                          {importingId === ghRepo.id ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
                              Importing...
                            </span>
                          ) : 'Import →'}
                        </button>
                        {importMsg?.id === ghRepo.id && (
                          <span className={`font-mono text-[9px] ${importMsg.ok ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                            {importMsg.msg}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── ZIP TAB ─── */}
      {tab === 'zip' && (
        <div className="border border-dashed border-[var(--color-border-sub)] rounded-xl bg-[var(--color-background-2)] p-8 max-w-lg">
          <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-3 uppercase">Upload Local Repository</p>
          <p className="text-sm text-[var(--color-text-sub)] mb-6">Zip your code folder and upload it. Sentinel will extract and analyze it.</p>
          <form onSubmit={handleZipUpload} className="flex flex-col gap-4">
            <div>
              <label className="block font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Project Name</label>
              <input
                type="text" required value={zipName} onChange={e => setZipName(e.target.value)} placeholder="my-app"
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-2">ZIP File</label>
              <input
                type="file" accept=".zip" required onChange={e => setZipFile(e.target.files?.[0] ?? null)}
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-2 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-[var(--color-background-2)] file:text-[var(--color-text-main)] hover:file:bg-[var(--color-border-main)] focus:outline-none"
              />
            </div>
            <button type="submit" disabled={uploadingZip || !zipFile || !zipName} className="btn-primary text-xs py-3 disabled:opacity-60">
              {uploadingZip ? 'Uploading & Scanning...' : 'Upload & Scan'}
            </button>
            {zipMsg && (
              <p className={`text-xs font-mono ${zipMsg.startsWith('✓') ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>{zipMsg}</p>
            )}
          </form>
        </div>
      )}

      {/* ─── SCANNED REPOS TAB ─── */}
      {tab === 'scanned' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[var(--color-text-sub)]">
              {repos.length} repository{repos.length !== 1 ? 's' : ''} scanned
            </p>
            <button onClick={loadScannedRepos} disabled={loadingRepos} className="btn-primary text-xs px-4 py-2 disabled:opacity-60">
              {loadingRepos ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {loadingRepos && repos.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-muted)] font-mono text-sm">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              Loading...
            </div>
          ) : repos.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-muted)] font-mono text-sm border border-dashed border-[var(--color-border-main)] rounded-xl">
              <p>No scanned repositories yet.</p>
              <button onClick={() => setTab('github')} className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[var(--color-accent)] hover:underline">
                Import your first repo →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map(repo => (
                <Link key={repo.id} href={`/dashboard/${repo.id}`} className="card hover:border-[var(--color-accent-sub)] transition-colors cursor-pointer group block">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-mono text-sm font-medium text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                      {repo.full_name}
                    </h3>
                    {repo.scan_status === 'done' ? (
                      <span className="badge border border-[rgba(46,213,115,0.2)] bg-[rgba(46,213,115,0.1)] text-[var(--color-green)] flex-shrink-0">SCANNED</span>
                    ) : (
                      <span className="badge border border-[rgba(255,165,2,0.2)] bg-[rgba(255,165,2,0.1)] text-[var(--color-amber)] animate-pulse flex-shrink-0">
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
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
