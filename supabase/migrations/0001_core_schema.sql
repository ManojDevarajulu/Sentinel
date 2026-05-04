-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Repos table
CREATE TABLE IF NOT EXISTS repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_repo_id TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    default_branch TEXT DEFAULT 'main',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Graph Nodes table
CREATE TABLE IF NOT EXISTS graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    node_type TEXT NOT NULL, -- 'page', 'layout', 'component', 'middleware', etc.
    exports JSONB,
    imports JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(repo_id, file_path)
);

-- Graph Edges table
CREATE TABLE IF NOT EXISTS graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    edge_type TEXT NOT NULL, -- 'imports', 'calls'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(source_node_id, target_node_id)
);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own repos" ON repos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own repos" ON repos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own repos" ON repos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own repos" ON repos FOR DELETE USING (auth.uid() = user_id);

-- For graph_nodes and edges, we check if the user owns the repo
CREATE POLICY "Users can view nodes of their repos" ON graph_nodes FOR SELECT USING (
    EXISTS (SELECT 1 FROM repos WHERE repos.id = graph_nodes.repo_id AND repos.user_id = auth.uid())
);
CREATE POLICY "Users can insert nodes to their repos" ON graph_nodes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM repos WHERE repos.id = graph_nodes.repo_id AND repos.user_id = auth.uid())
);
CREATE POLICY "Users can delete nodes of their repos" ON graph_nodes FOR DELETE USING (
    EXISTS (SELECT 1 FROM repos WHERE repos.id = graph_nodes.repo_id AND repos.user_id = auth.uid())
);

CREATE POLICY "Users can view edges of their repos" ON graph_edges FOR SELECT USING (
    EXISTS (SELECT 1 FROM repos WHERE repos.id = graph_edges.repo_id AND repos.user_id = auth.uid())
);
CREATE POLICY "Users can insert edges to their repos" ON graph_edges FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM repos WHERE repos.id = graph_edges.repo_id AND repos.user_id = auth.uid())
);
CREATE POLICY "Users can delete edges of their repos" ON graph_edges FOR DELETE USING (
    EXISTS (SELECT 1 FROM repos WHERE repos.id = graph_edges.repo_id AND repos.user_id = auth.uid())
);
