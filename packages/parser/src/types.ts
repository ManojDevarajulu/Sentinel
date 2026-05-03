export enum NodeType {
  PAGE = 'page',
  LAYOUT = 'layout',
  COMPONENT = 'component',
  HOOK = 'hook',
  API_ROUTE = 'api_route',
  MIDDLEWARE = 'middleware',
  UTIL = 'util',
  SUPABASE_CLIENT = 'supabase_client',
  OTHER = 'other'
}

export enum EdgeType {
  IMPORT = 'import',
  CALL = 'call',
  PROP_PASS = 'prop_pass',
  ROUTE_LINK = 'route_link'
}

export interface GraphNode {
  id: string;
  filePath: string;
  nodeType: NodeType;
  displayName: string;
  aiSummary?: string;
  importanceScore: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
  weight: number;
}

export interface ParseResult {
  repository: string;
  meta: {
    nodeCount: number;
    edgeCount: number;
    durationMs: number;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
}
