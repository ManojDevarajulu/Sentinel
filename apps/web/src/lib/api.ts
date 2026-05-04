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
  const { data, error } = await supabase
    .from('repos')
    .select('*')
    .order('last_scanned_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching repos:", error);
    return [];
  }
  
  return data as Repo[];
};

export const triggerScan = async (repoUrl: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl })
  });
  return response.json();
};
