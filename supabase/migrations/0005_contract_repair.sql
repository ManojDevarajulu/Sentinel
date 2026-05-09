-- Contract-repair migration to align parser, API, and UI expectations.

ALTER TABLE graph_nodes
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS importance_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE graph_edges
  ADD COLUMN IF NOT EXISTS weight INTEGER NOT NULL DEFAULT 1;

ALTER TABLE pr_analyses
  ADD COLUMN IF NOT EXISTS pr_title TEXT,
  ADD COLUMN IF NOT EXISTS blast_radius_count INTEGER,
  ADD COLUMN IF NOT EXISTS critical_paths JSONB;
