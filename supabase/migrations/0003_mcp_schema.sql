-- Add embeddings vector column to graph_nodes using ivfflat
-- We use 1536 dimensions as standard for OpenAI/Claude embeddings
ALTER TABLE graph_nodes ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_graph_nodes_embedding ON graph_nodes USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- MCP Queries table for usage tracking
CREATE TABLE IF NOT EXISTS mcp_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_type TEXT NOT NULL, -- e.g., 'get_blast_radius', 'find_component'
    query_params JSONB,
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for mcp_queries
ALTER TABLE mcp_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mcp queries" ON mcp_queries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mcp queries" ON mcp_queries FOR INSERT WITH CHECK (auth.uid() = user_id);
