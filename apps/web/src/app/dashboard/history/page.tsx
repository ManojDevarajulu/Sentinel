'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type AnalysisRow = {
  id: string;
  pr_number: number;
  pr_title?: string | null;
  risk_level?: string | null;
  risk_score?: number | null;
  blast_radius_count?: number | null;
  commit_sha?: string | null;
  repos?: {
    repo_name?: string | null;
  } | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login?redirectTo=/dashboard/history');
        return;
      }

      const { data, error } = await supabase
        .from('pr_analyses')
        .select('id, pr_number, pr_title, risk_level, risk_score, blast_radius_count, commit_sha, repos(repo_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!active) return;

      if (error) {
        setErrorMsg(error.message);
      } else {
        setAnalyses((data || []) as AnalysisRow[]);
      }
      setLoading(false);
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--color-border-main)]">
        <div>
          <h1 className="text-2xl font-bold">PR Analysis History</h1>
          <p className="text-[var(--color-text-sub)] text-sm mt-1">Timeline of scanned pull requests and their blast radius snapshots.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-[rgba(255,71,87,0.1)] border border-[var(--color-red)] rounded-lg text-[var(--color-red)] text-sm">
          Error loading PR history: {errorMsg}
        </div>
      )}

      <div className="bg-[var(--color-background-2)] border border-[var(--color-border-main)] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[var(--color-background-3)] border-b border-[var(--color-border-main)]">
            <tr>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">Repository</th>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">PR</th>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">Risk Level</th>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">Blast Radius</th>
              <th className="p-4 font-mono text-xs text-[var(--color-text-sub)] uppercase tracking-wider">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-sub)]">
            {analyses.length > 0 ? analyses.map((analysis) => (
              <tr key={analysis.id} className="hover:bg-[var(--color-background-3)] transition-colors">
                <td className="p-4 font-mono text-sm">{analysis.repos?.repo_name || 'Unknown'}</td>
                <td className="p-4">
                  <div className="text-sm font-medium">
                    {analysis.pr_title || `PR #${analysis.pr_number}`}
                  </div>
                  {analysis.commit_sha && (
                    <div className="text-[10px] text-[var(--color-text-muted)] font-mono mt-1">
                      {analysis.commit_sha.slice(0, 8)}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <span className={`badge border text-xs ${
                    analysis.risk_level === 'HIGH' || analysis.risk_level === 'high' ? 'border-[rgba(255,71,87,0.2)] bg-[rgba(255,71,87,0.1)] text-[var(--color-red)]' :
                    analysis.risk_level === 'MEDIUM' || analysis.risk_level === 'medium' ? 'border-[rgba(255,165,2,0.2)] bg-[rgba(255,165,2,0.1)] text-[var(--color-amber)]' :
                    'border-[rgba(46,213,115,0.2)] bg-[rgba(46,213,115,0.1)] text-[var(--color-green)]'
                  }`}>
                    {(analysis.risk_level || 'UNKNOWN').toUpperCase()}
                  </span>
                </td>
                <td className="p-4 font-mono text-sm text-[var(--color-text-sub)]">
                  {analysis.blast_radius_count ?? 0} files
                </td>
                <td className="p-4 font-mono text-sm">
                  {analysis.risk_score ?? 0}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--color-text-sub)]">
                  No PR analyses found yet. Run the GitHub action or call the blast-radius API to populate this history.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
