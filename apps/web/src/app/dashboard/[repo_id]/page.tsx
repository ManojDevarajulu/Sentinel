import ReactFlowCanvas from '@/components/graph/ReactFlowCanvas'
import { mockNodes, mockEdges } from '@/lib/supabase/client'

export default function RepoGraphPage({ params }: { params: { repo_id: string } }) {
  // In a real app we'd fetch the repo graph using params.repo_id
  
  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      <div className="flex-shrink-0 bg-[var(--color-background-2)] border-b border-[var(--color-border-main)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-[var(--color-text-muted)] hover:text-white transition-colors">
            &larr; Back
          </a>
          <div className="w-px h-4 bg-[var(--color-border-main)]"></div>
          <h2 className="font-mono text-sm font-medium">manoj/sentinel-demo</h2>
          <span className="badge border border-[var(--color-border-sub)] bg-[var(--color-background-3)] text-[var(--color-text-sub)]">
            {mockNodes.length} NODES
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 text-xs font-mono border border-[var(--color-border-main)] rounded bg-[var(--color-background-3)] hover:bg-[var(--color-border-main)] transition-colors">
            RE-SCAN REPO
          </button>
        </div>
      </div>
      
      <div className="flex-grow relative">
        <ReactFlowCanvas initialNodes={mockNodes} initialEdges={mockEdges} />
      </div>
    </div>
  )
}
