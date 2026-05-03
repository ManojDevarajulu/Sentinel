import { mockRepos } from '@/lib/supabase/client'

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--color-border-main)]">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="text-[var(--color-text-sub)] text-sm mt-1">Manage and monitor connected GitHub repositories.</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-xs">
          <span>+</span> CONNECT REPO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockRepos.map(repo => (
          <a key={repo.id} href={`/dashboard/${repo.id}`} className="card hover:border-[var(--color-accent-sub)] transition-colors cursor-pointer group block">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-mono text-sm font-medium text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] transition-colors">
                {repo.full_name}
              </h3>
              {repo.scan_status === 'done' ? (
                <span className="badge border border-[rgba(46,213,115,0.2)] bg-[rgba(46,213,115,0.1)] text-[var(--color-green)]">SCANNED</span>
              ) : (
                <span className="badge border border-[rgba(255,165,2,0.2)] bg-[rgba(255,165,2,0.1)] text-[var(--color-amber)] animate-pulse">SCANNING</span>
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs font-mono text-[var(--color-text-muted)]">
              <div>
                <span className="text-[var(--color-text-sub)]">{repo.node_count}</span> NODES
              </div>
              <div>
                BRANCH: <span className="text-[var(--color-text-sub)]">{repo.default_branch}</span>
              </div>
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
