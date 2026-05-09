import { supabase } from './supabase/client';

export interface Repo {
  id: string;
  full_name: string;
  scan_status: string;
  node_count: number;
  last_scanned_at: string | null;
  default_branch: string;
}

type RepoRow = {
  id: string;
  repo_name: string;
  default_branch: string;
  updated_at: string | null;
  scan_jobs?: Array<{ status?: string | null; created_at?: string | null }>;
  graph_nodes?: Array<{ id: string }>;
};

type GraphNodeRow = {
  id: string;
  file_path: string;
  node_type?: string | null;
  display_name?: string | null;
  importance_score?: number | null;
  ai_summary?: string | null;
  imports?: unknown;
  exports?: unknown;
};

type GraphEdgeRow = {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type?: string | null;
  weight?: number | null;
};

export interface GraphViewNode {
  id: string;
  filePath: string;
  nodeType: string;
  displayName: string;
  aiSummary: string;
  importanceScore: number;
  imports: string[];
  exports: string[];
}

export interface GraphViewEdge {
  id: string;
  source: string;
  target: string;
  edgeType: string;
  weight: number;
}

export interface RepoGraph {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
}

const normalizeStatus = (status?: string | null) => {
  if (!status) return 'pending';
  if (status === 'completed') return 'done';
  if (status === 'in_progress') return 'running';
  return status;
};

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
    
    return ((data || []) as RepoRow[]).map((r) => {
      const latestJob = r.scan_jobs?.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())?.[0];
      return {
        id: r.id,
        full_name: r.repo_name,
        scan_status: normalizeStatus(latestJob?.status),
        node_count: r.graph_nodes?.length || 0,
        last_scanned_at: r.updated_at,
        default_branch: r.default_branch,
      };
    });
  } catch (err: unknown) {
    console.error("Exception fetching repos:", err instanceof Error ? err.message : String(err));
    return [];
  }
};

export const triggerScan = async (repoId: string, repoPath: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/repos/${repoId}/scan`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ repo_id: repoId, repo_path: repoPath })
  });
  return response.json();
};

export const getRepo = async (id: string): Promise<Repo | undefined> => {
  const { data, error } = await supabase.from('repos').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return {
    id: data.id,
    full_name: data.repo_name,
    scan_status: 'pending',
    node_count: 0,
    last_scanned_at: data.updated_at,
    default_branch: data.default_branch,
  };
};

export const getRepoGraph = async (id: string): Promise<RepoGraph> => {
  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase
      .from('graph_nodes')
      .select('id, file_path, node_type, display_name, importance_score, ai_summary, imports, exports')
      .eq('repo_id', id),
    supabase
      .from('graph_edges')
      .select('id, source_node_id, target_node_id, edge_type, weight')
      .eq('repo_id', id)
  ]);

  return {
    nodes: ((nodes || []) as GraphNodeRow[]).map((node) => ({
      id: node.id,
      filePath: node.file_path,
      nodeType: node.node_type || 'other',
      displayName: node.display_name || node.file_path?.split('/').pop() || 'Unknown',
      aiSummary: node.ai_summary || '',
      importanceScore: node.importance_score || 0,
      imports: Array.isArray(node.imports) ? (node.imports as string[]) : [],
      exports: Array.isArray(node.exports) ? (node.exports as string[]) : [],
    })),
    edges: ((edges || []) as GraphEdgeRow[]).map((edge) => ({
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      edgeType: edge.edge_type || 'import',
      weight: edge.weight || 1,
    }))
  };
};
