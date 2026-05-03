// MOCKED SUPABASE CLIENT FOR UI DEVELOPMENT
import { createClient } from '@supabase/supabase-js'

// These are dummy values to prevent crash if initializing the real client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// MOCK DATA for Sentinel Dashboard
export const mockRepos = [
  {
    id: "uuid-1",
    full_name: "manoj/sentinel-demo",
    scan_status: "done",
    node_count: 142,
    last_scanned_at: new Date().toISOString(),
    default_branch: "main"
  },
  {
    id: "uuid-2",
    full_name: "manoj/intern-react",
    scan_status: "running",
    node_count: 0,
    last_scanned_at: null,
    default_branch: "master"
  }
];

export const mockNodes = [
  { id: "1", type: "middleware", display_name: "middleware.ts", ai_summary: "Main authentication guard.", file_path: "middleware.ts", importance_score: 95 },
  { id: "2", type: "hook", display_name: "useAuth", ai_summary: "Authentication hook.", file_path: "hooks/useAuth.ts", importance_score: 80 },
  { id: "3", type: "page", display_name: "LoginPage", ai_summary: "User login screen.", file_path: "app/login/page.tsx", importance_score: 40 },
  { id: "4", type: "component", display_name: "Button", ai_summary: "UI button.", file_path: "components/Button.tsx", importance_score: 10 }
];

export const mockEdges = [
  { source: "3", target: "2", weight: 1 },
  { source: "2", target: "1", weight: 1 },
  { source: "3", target: "4", weight: 2 }
];
