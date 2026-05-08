import { supabase } from './supabase/client';

export interface Repo {
  id: string;
  full_name: string;
  scan_status: string;
  node_count: number;
  last_scanned_at: string | null;
  default_branch: string;
}

export const getRepos = async (): Promise<Repo[]> => {
  try {
    const { data, error } = await supabase
      .from('repos')
      .select(`
        *,
        scan_jobs ( status, created_at ),
        graph_nodes ( id )
      `)
      .order('updated_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching repos:", error?.message || error?.code || JSON.stringify(error));
      return [];
    }
    
    return (data || []).map((r: any) => {
      const latestJob = r.scan_jobs?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())?.[0]
      return {
        ...r,
        full_name: r.repo_name,
        scan_status: latestJob?.status || 'pending',
        node_count: r.graph_nodes?.length || 0,
        last_scanned_at: r.updated_at
      }
    }) as Repo[];
  } catch (err: any) {
    console.error("Exception fetching repos:", err?.message || String(err));
    return [];
  }
};

export const triggerScan = async (repoId: string, repoPath: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/repos/${repoId}/scan`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ repo_id: repoId, repo_path: repoPath })
  });
  return response.json();
};

export const getRepo = async (id: string): Promise<Repo | undefined> => {
  const { data, error } = await supabase.from('repos').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return data as Repo;
};

export const getRepoGraph = async (id: string) => {
  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from('graph_nodes').select('*').eq('repo_id', id),
    supabase.from('graph_edges').select('*').eq('repo_id', id)
  ]);
  
  return {
    nodes: nodes || [],
    edges: edges || []
  };
};
