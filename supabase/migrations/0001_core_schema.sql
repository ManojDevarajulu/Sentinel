-- Core Schema for Sentinel

CREATE TYPE plan_type AS ENUM ('free', 'solo', 'team', 'studio');
CREATE TYPE scan_status AS ENUM ('pending', 'running', 'done', 'failed');
CREATE TYPE node_type AS ENUM ('page', 'layout', 'component', 'hook', 'api_route', 'middleware', 'util', 'supabase_client', 'other');
CREATE TYPE edge_type AS ENUM ('import', 'call', 'prop_pass', 'route_link');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    github_id BIGINT UNIQUE,
    email TEXT,
    plan plan_type DEFAULT 'free',
    stripe_customer_id TEXT,
    mcp_api_key TEXT,
    trial_ends_at TIMESTAMPTZ
);

-- Repos Table
CREATE TABLE repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    github_repo_id BIGINT,
    full_name TEXT,
    scan_status scan_status DEFAULT 'pending',
    node_count INT DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    default_branch TEXT DEFAULT 'main'
);

-- Graph Nodes Table
CREATE TABLE graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    node_type node_type,
    display_name TEXT,
    ai_summary TEXT,
    importance_score INT DEFAULT 0,
    last_modified_at TIMESTAMPTZ,
    UNIQUE(repo_id, file_path)
);

-- Graph Edges Table
CREATE TABLE graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
    source_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
    edge_type edge_type DEFAULT 'import',
    weight INT DEFAULT 1,
    UNIQUE(repo_id, source_node_id, target_node_id)
);
