'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ReactFlowCanvas from '@/components/graph/ReactFlowCanvas'
import { getRepo, getRepoGraph, type Repo } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'

type GraphNode = Awaited<ReturnType<typeof getRepoGraph>>['nodes'][number]
type GraphEdge = Awaited<ReturnType<typeof getRepoGraph>>['edges'][number]

export default function RepoGraphPage() {
  const params = useParams<{ repo_id: string }>()
  const router = useRouter()
  const repoId = params.repo_id

  const [repo, setRepo] = useState<Repo | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadRepoGraph() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.replace(`/login?redirectTo=/dashboard/${repoId}`)
        return
      }

      const [repoData, graphData] = await Promise.all([
        getRepo(repoId),
        getRepoGraph(repoId),
      ])

      if (!active) return

      if (!repoData) {
        setError('Repository not found or you do not have access to it.')
        setLoading(false)
        return
      }

      setRepo(repoData)
      setNodes(graphData.nodes)
      setEdges(graphData.edges)
      setLoading(false)
    }

    loadRepoGraph()

    return () => {
      active = false
    }
  }, [repoId, router])

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
          <Link href="/dashboard" className="btn-primary text-[10px] px-4 py-2">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      <div className="flex-shrink-0 bg-[var(--color-background-2)] border-b border-[var(--color-border-main)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-[var(--color-text-muted)] hover:text-white transition-colors">
            &larr; Back
          </Link>
          <div className="w-px h-4 bg-[var(--color-border-main)]" />
          <h2 className="font-mono text-sm font-medium">{repo?.full_name || 'Unknown Repo'}</h2>
          <span className="badge border border-[var(--color-border-sub)] bg-[var(--color-background-3)] text-[var(--color-text-sub)]">
            {nodes.length} NODES
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled
            title="Scan job history and manual re-scan controls are planned after the core graph loop is validated."
            className="px-3 py-1.5 text-xs font-mono border border-[var(--color-border-main)] rounded bg-[var(--color-background-3)] text-[var(--color-text-muted)] cursor-not-allowed opacity-70"
          >
            RE-SCAN COMING SOON
          </button>
        </div>
      </div>

      <div className="flex-grow relative">
        <ReactFlowCanvas initialNodes={nodes} initialEdges={edges} />
      </div>
    </div>
  )
}
