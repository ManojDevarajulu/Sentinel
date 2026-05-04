import { supabase } from '@/lib/supabase/client';

export default async function HistoryPage() {
  const { data: analyses, error } = await supabase
    .from('pr_analyses')
    .select('*, repos(full_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching PR history:', error);
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--color-border-main)]">
        <div>
          <h1 className="text-2xl font-bold">PR Analysis History</h1>
          <p className="text-[var(--color-text-sub)] text-sm mt-1">Timeline of all scanned Pull Requests and their blast radius.</p>
        </div>
      </div>

      <div className="bg-[var(--color-background-2)] border border-[var(--color-border-main)] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[var(--color-background-3)] border-b border-[var(--color-border-main)]">
            <tr>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">Repository</th>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">PR Title</th>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">Risk Level</th>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">Blast Radius</th>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-sub)]">
            {analyses && analyses.length > 0 ? analyses.map(analysis => (
              <tr key={analysis.id} className="hover:bg-[var(--color-background-3)] transition-colors cursor-pointer group">
                <td className="p-4 font-mono text-sm">{analysis.repos?.full_name || 'Unknown'}</td>
                <td className="p-4">
                  <div className="text-sm font-medium group-hover:text-[var(--color-accent)] transition-colors">
                    {analysis.pr_title || `PR #${analysis.pr_number}`}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`badge border text-xs ${
                    analysis.risk_level === 'high' ? 'border-[rgba(255,71,87,0.2)] bg-[rgba(255,71,87,0.1)] text-[var(--color-red)]' : 
                    analysis.risk_level === 'medium' ? 'border-[rgba(255,165,2,0.2)] bg-[rgba(255,165,2,0.1)] text-[var(--color-amber)]' : 
                    'border-[rgba(46,213,115,0.2)] bg-[rgba(46,213,115,0.1)] text-[var(--color-green)]'
                  }`}>
                    {analysis.risk_level?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </td>
                <td className="p-4 font-mono text-sm text-[var(--color-text-sub)]">
                  {analysis.blast_radius_count} files
                </td>
                <td className="p-4 font-mono text-sm">
                  {analysis.risk_score}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--color-text-sub)]">
                  No PR analyses found. Install the GitHub action to start analyzing PRs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
