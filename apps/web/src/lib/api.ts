import { supabase } from './supabase/client';

export async function getRepos() {
  const { data, error } = await supabase
    .from('repos')
    .select('*')
    .order('last_scanned_at', { ascending: false });

  if (error) {
    console.error('Error fetching repos:', error);
    return [];
  }
  return data;
}

export async function getRepoGraph(repoId: string) {
  const [nodesResponse, edgesResponse] = await Promise.all([
    supabase.from('graph_nodes').select('*').eq('repo_id', repoId),
    supabase.from('graph_edges').select('*').eq('repo_id', repoId)
  ]);

  if (nodesResponse.error) console.error('Error fetching nodes:', nodesResponse.error);
  if (edgesResponse.error) console.error('Error fetching edges:', edgesResponse.error);

  return {
    nodes: nodesResponse.data || [],
    edges: edgesResponse.data || []
  };
}

export async function getRepo(repoId: string) {
  const { data, error } = await supabase
    .from('repos')
    .select('*')
    .eq('id', repoId)
    .single();
    
  if (error) {
    console.error('Error fetching repo:', error);
    return null;
  }
  return data;
}
