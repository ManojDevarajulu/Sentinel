-- Scan Jobs table
CREATE TABLE IF NOT EXISTS scan_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PR Analyses table
CREATE TABLE IF NOT EXISTS pr_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    pr_number INTEGER NOT NULL,
    commit_sha TEXT NOT NULL,
    changed_files JSONB NOT NULL,
    blast_radius JSONB,
    risk_score INTEGER,
    risk_level TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for rapid BFS traversal
CREATE INDEX IF NOT EXISTS idx_graph_edges_repo_id ON graph_edges(repo_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source_target ON graph_edges(source_node_id, target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target_source ON graph_edges(target_node_id, source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_repo_id ON graph_nodes(repo_id);

-- RLS for new tables
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their repo scan jobs" ON scan_jobs FOR SELECT USING (
    EXISTS (SELECT 1 FROM repos WHERE repos.id = scan_jobs.repo_id AND repos.user_id = auth.uid())
);
CREATE POLICY "Users can view their repo PR analyses" ON pr_analyses FOR SELECT USING (
    EXISTS (SELECT 1 FROM repos WHERE repos.id = pr_analyses.repo_id AND repos.user_id = auth.uid())
);
