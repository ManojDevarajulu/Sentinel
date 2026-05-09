'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getRepos, type Repo } from '@/lib/api'

type ScanApiResponse = {
  job_id?: string
  detail?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [repos, setRepos] = useState<Repo[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanName, setScanName] = useState('')
  const [hasGithub, setHasGithub] = useState(false)

  const [githubUrl, setGithubUrl] = useState('')
  const [scanningGithub, setScanningGithub] = useState(false)
  const [githubMsg, setGithubMsg] = useState('')

  const [zipFile, setZipFile] = useState<File | null>(null)
  const [uploadingZip, setUploadingZip] = useState(false)
  const [zipMsg, setZipMsg] = useState('')

  const loadRepos = async () => {
    setLoading(true)
    setError('')
    const repoList = await getRepos()
    setRepos(repoList)
    setLoaded(true)
    setLoading(false)
  }

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      const { data } = await supabase.auth.getSession()

      if (!active) return

      if (data.session) {
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user?.identities) {
           setHasGithub(userData.user.identities.some(id => id.provider === 'github'))
        }
        await loadRepos()
      } else {
        router.replace('/login?redirectTo=/dashboard')
      }
    }

    loadInitialData()

    return () => {
      active = false
    }
  }, [router])

  const linkGithub = async () => {
    const { error } = await supabase.auth.linkIdentity({ provider: 'github', options: { redirectTo: window.location.href } })
    if (error) alert(error.message)
  }

  const handleGithubScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!githubUrl || !scanName) return
    setScanningGithub(true)
    setGithubMsg('')

    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session
    if (!session?.user?.id) return

    const { data: repo, error: repoErr } = await supabase
      .from('repos')
      .insert([{ user_id: session.user.id, github_repo_id: `github_${Date.now()}`, repo_name: scanName, default_branch: 'main' }])
      .select('id').single()

    if (repoErr || !repo) {
      setGithubMsg(`Failed to create repo: ${repoErr?.message || 'Unknown error'}`); setScanningGithub(false); return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/repos/${repo.id}/scan-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ repo_id: repo.id, github_url: githubUrl })
      })
      const result = await res.json() as ScanApiResponse
      if (res.ok) { setGithubMsg(`Scan started. Job ID: ${result.job_id}. Refreshing...`); await loadRepos(); } 
      else { setGithubMsg(`Error: ${result.detail || JSON.stringify(result)}`); }
    } catch (err: unknown) { setGithubMsg(`Could not reach API: ${err instanceof Error ? err.message : String(err)}`) }
    setScanningGithub(false)
  }

  const handleZipUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!zipFile || !scanName) return
    setUploadingZip(true)
    setZipMsg('')

    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session
    if (!session?.user?.id) return

    const { data: repo, error: repoErr } = await supabase
      .from('repos')
      .insert([{ user_id: session.user.id, github_repo_id: `upload_${Date.now()}`, repo_name: scanName, default_branch: 'main' }])
      .select('id').single()

    if (repoErr || !repo) {
      setZipMsg(`Failed to create repo: ${repoErr?.message || 'Unknown error'}`); setUploadingZip(false); return;
    }

    const formData = new FormData()
    formData.append('file', zipFile)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/repos/${repo.id}/upload`, {
        method: 'POST',
        headers: { ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: formData
      })
      const result = await res.json() as ScanApiResponse
      if (res.ok) { setZipMsg(`Scan started. Job ID: ${result.job_id}. Refreshing...`); await loadRepos(); setZipFile(null); } 
      else { setZipMsg(`Error: ${result.detail || JSON.stringify(result)}`); }
    } catch (err: unknown) { setZipMsg(`Could not reach API: ${err instanceof Error ? err.message : String(err)}`) }
    setUploadingZip(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--color-border-main)]">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="text-[var(--color-text-sub)] text-sm mt-1">Manage and monitor connected TypeScript and Python repositories.</p>
        </div>
        <button onClick={loadRepos} disabled={loading} className="btn-primary flex items-center gap-2 text-xs disabled:opacity-60">
          {loading ? 'Loading...' : loaded ? 'Refresh' : 'Load Repos'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[rgba(255,71,87,0.1)] border border-[var(--color-red)] rounded-lg text-[var(--color-red)] text-sm">
          <p className="font-bold mb-1">Error</p>
          <p>{error}</p>
          <p className="mt-2 text-xs opacity-70">
            <Link href="/login" className="underline">Sign in</Link> to access your repositories, or check Supabase RLS policies.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* GitHub Scan Section */}
        <div className="p-6 border border-dashed border-[var(--color-border-sub)] rounded-xl bg-[var(--color-background-2)]">
          <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-3 uppercase">Scan a GitHub Repository</p>
          <p className="text-sm text-[var(--color-text-sub)] mb-4">
            Connect your GitHub account and enter a public repository URL to scan.
          </p>
          {!hasGithub ? (
            <button onClick={linkGithub} className="w-full bg-[#f0f0f2] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-wider py-3 rounded-lg flex items-center justify-center gap-3 transition-colors mb-2">
              <svg height="16" viewBox="0 0 16 16" width="16" className="fill-current">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
              Connect GitHub Account
            </button>
          ) : (
            <form onSubmit={handleGithubScan} className="flex flex-col gap-3">
              <input
                type="text" value={scanName} onChange={e => setScanName(e.target.value)} placeholder="Project Name (e.g. My App)"
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
              />
              <input
                type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/user/repo"
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
              />
              <button type="submit" disabled={scanningGithub || !githubUrl || !scanName} className="btn-primary text-xs py-2.5 disabled:opacity-60">
                {scanningGithub ? 'Scanning...' : 'Scan GitHub'}
              </button>
            </form>
          )}
          {githubMsg && (
            <p className={`mt-3 text-xs font-mono ${githubMsg.startsWith('Scan started') ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
              {githubMsg}
            </p>
          )}
        </div>

        {/* Local ZIP Upload Section */}
        <div className="p-6 border border-dashed border-[var(--color-border-sub)] rounded-xl bg-[var(--color-background-2)]">
          <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-3 uppercase">Upload Local Repository (.zip)</p>
          <p className="text-sm text-[var(--color-text-sub)] mb-4">
            Zip your local code folder and upload it directly. The scanner will extract and analyze it.
          </p>
          <form onSubmit={handleZipUpload} className="flex flex-col gap-3">
            <input
              type="text" value={scanName} onChange={e => setScanName(e.target.value)} placeholder="Project Name (e.g. My App)"
              className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
            />
            <input
              type="file" accept=".zip" onChange={e => setZipFile(e.target.files ? e.target.files[0] : null)}
              className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-2 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-[var(--color-background-2)] file:text-[var(--color-text-main)] hover:file:bg-[var(--color-border-main)] focus:outline-none transition-colors"
            />
            <button type="submit" disabled={uploadingZip || !zipFile || !scanName} className="btn-primary text-xs py-2.5 disabled:opacity-60">
              {uploadingZip ? 'Uploading & Scanning...' : 'Upload & Scan'}
            </button>
          </form>
          {zipMsg && (
            <p className={`mt-3 text-xs font-mono ${zipMsg.startsWith('Scan started') ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
              {zipMsg}
            </p>
          )}
        </div>
      </div>

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
          <Link key={repo.id} href={`/dashboard/${repo.id}`} className="card hover:border-[var(--color-accent-sub)] transition-colors cursor-pointer group block">
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
          </Link>
        ))}
      </div>
    </div>
  )
}
