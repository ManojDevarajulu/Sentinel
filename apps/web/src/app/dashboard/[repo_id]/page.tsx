'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ReactFlowCanvas from '@/components/graph/ReactFlowCanvas'
import { getRepo, getRepoGraph, type Repo, type GraphViewNode, type GraphViewEdge } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export default function RepoGraphPage() {
  const params = useParams<{ repo_id: string }>()
  const router = useRouter()
  const repoId = params.repo_id

  const [repo, setRepo] = useState<Repo | null>(null)
  const [nodes, setNodes] = useState<GraphViewNode[]>([])
  const [edges, setEdges] = useState<GraphViewEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')

  const loadGraph = useCallback(async () => {
    const [repoData, graphData] = await Promise.all([getRepo(repoId), getRepoGraph(repoId)])
    if (repoData) {
      setRepo(repoData)
      setNodes(graphData.nodes)
      setEdges(graphData.edges)
    }
  }, [repoId])

  useEffect(() => {
    let active = true
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.replace(`/login?redirectTo=/dashboard/${repoId}`); return }
      const [repoData, graphData] = await Promise.all([getRepo(repoId), getRepoGraph(repoId)])
      if (!active) return
      if (!repoData) { setError('Repository not found or you do not have access.'); setLoading(false); return }
      setRepo(repoData)
      setNodes(graphData.nodes)
      setEdges(graphData.edges)
      setLoading(false)
    }
    init()
    return () => { active = false }
  }, [repoId, router])

  const handleRescan = async () => {
    setScanning(true)
    setScanMsg('Starting scan...')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) { setScanMsg('Not authenticated'); setScanning(false); return }

      const ghToken = typeof window !== 'undefined' ? localStorage.getItem('gh_token') : null
      const githubUrl = `https://github.com/${repo?.full_name}`

      const res = await fetch(`${API_URL}/repos/${repoId}/scan-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ repo_id: repoId, github_url: githubUrl, github_token: ghToken }),
      })
      const result = await res.json()
      if (!res.ok) { setScanMsg(result.detail || 'Scan failed'); setScanning(false); return }

      setScanMsg('Scanning... refreshing in 30s')
      // Poll every 8 seconds up to 40 seconds for completion
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        await loadGraph()
        if (attempts >= 5) {
          clearInterval(poll)
          setScanning(false)
          setScanMsg('Scan complete! Graph refreshed.')
          setTimeout(() => setScanMsg(''), 3000)
        }
      }, 8000)
    } catch (e) {
      setScanMsg(e instanceof Error ? e.message : 'Network error')
      setScanning(false)
    }
  }

  // Stats computed from graph data
  const criticalCount = nodes.filter(n => n.nodeType === 'middleware' || n.nodeType === 'layout').length
  const edgeNodeIds = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)])
  const isolatedCount = nodes.filter(n => !edgeNodeIds.has(n.id)).length
  const topNode = [...nodes].sort((a, b) => b.importanceScore - a.importanceScore)[0]

  if (loading) {
    return (
      <div className="h-[calc(100vh-65px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-[var(--color-text-muted)]">Loading repository graph...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="rounded-xl border border-[var(--color-red)] bg-[rgba(255,71,87,0.08)] p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-red)] mb-3">Repository Error</p>
          <p className="text-sm text-[var(--color-text-main)] mb-4">{error}</p>
          <Link href="/dashboard" className="btn-primary text-[10px] px-4 py-2">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 bg-[var(--color-background-2)] border-b border-[var(--color-border-main)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-[var(--color-text-muted)] hover:text-white transition-colors">
            &larr; Back
          </Link>
          <div className="w-px h-4 bg-[var(--color-border-main)]" />
          <h2 className="font-mono text-sm font-medium">{repo?.full_name || 'Unknown Repo'}</h2>

          {/* Stats pills */}
          <div className="hidden md:flex items-center gap-2">
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[var(--color-border-sub)] bg-[var(--color-background-3)] text-[var(--color-text-sub)]">
              {nodes.length} FILES
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[var(--color-border-sub)] bg-[var(--color-background-3)] text-[var(--color-text-sub)]">
              {edges.length} EDGES
            </span>
            {criticalCount > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[rgba(255,71,87,0.4)] bg-[rgba(255,71,87,0.08)] text-[var(--color-red)]">
                {criticalCount} CRITICAL
              </span>
            )}
            {isolatedCount > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[var(--color-border-sub)] bg-[var(--color-background-3)] text-[var(--color-text-muted)]">
                {isolatedCount} ISOLATED
              </span>
            )}
            {topNode && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[rgba(255,165,2,0.4)] bg-[rgba(255,165,2,0.08)] text-[#ffa502]" title={`Most important: ${topNode.filePath}`}>
                ★ {topNode.displayName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {scanMsg && (
            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{scanMsg}</span>
          )}
          <button
            onClick={handleRescan}
            disabled={scanning}
            className={`px-3 py-1.5 text-xs font-mono border rounded transition-colors flex items-center gap-2 ${
              scanning
                ? 'border-[var(--color-border-main)] bg-[var(--color-background-3)] text-[var(--color-text-muted)] cursor-not-allowed'
                : 'border-[var(--color-accent)] bg-[rgba(71,184,255,0.08)] text-[var(--color-accent)] hover:bg-[rgba(71,184,255,0.15)]'
            }`}
          >
            {scanning && <span className="w-3 h-3 border border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />}
            {scanning ? 'SCANNING...' : 'RE-SCAN'}
          </button>
        </div>
      </div>

      <div className="flex-grow relative">
        <ReactFlowCanvas initialNodes={nodes} initialEdges={edges} />
      </div>
    </div>
  )
}
