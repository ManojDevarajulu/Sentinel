"use client";

import { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { GraphViewEdge, GraphViewNode } from '@/lib/api';

interface GraphProps {
  initialNodes: GraphViewNode[];
  initialEdges: GraphViewEdge[];
}

type NodeTypeFilter = 'all' | 'page' | 'layout' | 'component' | 'hook' | 'api_route' | 'middleware' | 'util' | 'supabase_client' | 'other';

function getNodeStyles(node: GraphViewNode, heatmapMode: boolean) {
  const critical = node.nodeType === 'middleware' || node.nodeType === 'layout';
  const important = node.importanceScore >= 70;

  if (heatmapMode) {
    if (critical) {
      return {
        background: 'rgba(255,71,87,0.18)',
        borderColor: '#ff4757',
        boxShadow: '0 0 18px rgba(255,71,87,0.28)',
      };
    }
    if (important || node.nodeType === 'api_route' || node.nodeType === 'hook' || node.nodeType === 'supabase_client') {
      return {
        background: 'rgba(255,165,2,0.14)',
        borderColor: '#ffa502',
        boxShadow: '0 0 12px rgba(255,165,2,0.18)',
      };
    }
    return {
      background: 'rgba(71,184,255,0.1)',
      borderColor: '#47b8ff',
      boxShadow: 'none',
    };
  }

  const map: Record<string, { background: string; borderColor: string }> = {
    middleware: { background: 'rgba(255,71,87,0.1)', borderColor: 'rgba(255,71,87,0.5)' },
    layout: { background: 'rgba(255,71,87,0.08)', borderColor: 'rgba(255,71,87,0.4)' },
    api_route: { background: 'rgba(255,165,2,0.1)', borderColor: 'rgba(255,165,2,0.45)' },
    hook: { background: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.4)' },
    supabase_client: { background: 'rgba(232,255,71,0.08)', borderColor: 'rgba(232,255,71,0.4)' },
    page: { background: 'rgba(71,184,255,0.1)', borderColor: 'rgba(71,184,255,0.5)' },
    component: { background: 'rgba(71,184,255,0.07)', borderColor: 'rgba(71,184,255,0.35)' },
    util: { background: 'rgba(136,136,160,0.08)', borderColor: 'rgba(136,136,160,0.35)' },
    other: { background: 'rgba(136,136,160,0.08)', borderColor: 'rgba(136,136,160,0.35)' },
  };

  return {
    ...map[node.nodeType] || map.other,
    boxShadow: 'none',
  };
}

function getRiskLabel(node: GraphViewNode) {
  if (node.nodeType === 'middleware' || node.nodeType === 'layout') return 'HIGH';
  if (node.importanceScore >= 70) return 'HIGH';
  if (node.importanceScore >= 35 || node.nodeType === 'api_route' || node.nodeType === 'hook' || node.nodeType === 'supabase_client') return 'MEDIUM';
  return 'LOW';
}

export default function ReactFlowCanvas({ initialNodes, initialEdges }: GraphProps) {
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<NodeTypeFilter>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const adjacency = useMemo(() => {
    const deps = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();

    initialEdges.forEach((edge) => {
      deps.set(edge.source, [...(deps.get(edge.source) || []), edge.target]);
      dependents.set(edge.target, [...(dependents.get(edge.target) || []), edge.source]);
    });

    return { deps, dependents };
  }, [initialEdges]);

  const selectedNode = useMemo(
    () => initialNodes.find((node) => node.id === selectedNodeId) || null,
    [initialNodes, selectedNodeId]
  );

  const filteredNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initialNodes.filter((node) => {
      const matchesType = typeFilter === 'all' || node.nodeType === typeFilter;
      const matchesSearch =
        !query ||
        node.filePath.toLowerCase().includes(query) ||
        node.displayName.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [initialNodes, search, typeFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredEdges = useMemo(
    () => initialEdges.filter((edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)),
    [initialEdges, filteredNodeIds]
  );

  const graphNodes: Node[] = useMemo(() => {
    const grouped = new Map<string, GraphViewNode[]>();
    const order = ['middleware', 'layout', 'api_route', 'hook', 'supabase_client', 'page', 'component', 'util', 'other'];

    filteredNodes
      .slice()
      .sort((a, b) => a.filePath.localeCompare(b.filePath))
      .forEach((node) => {
        const key = order.includes(node.nodeType) ? node.nodeType : 'other';
        grouped.set(key, [...(grouped.get(key) || []), node]);
      });

    return order.flatMap((groupName, columnIndex) => {
      const groupNodes = grouped.get(groupName) || [];
      return groupNodes.map((node, rowIndex) => {
        const styles = getNodeStyles(node, heatmapMode);
        return {
          id: node.id,
          position: {
            x: 80 + columnIndex * 260,
            y: 80 + rowIndex * 150,
          },
          data: {
            label: (
              <div className="flex flex-col text-left p-2">
                <div className="font-mono text-[10px] text-[var(--color-text-sub)] uppercase tracking-wider mb-1">
                  {node.nodeType}
                </div>
                <div className="font-sans text-sm font-medium">{node.displayName}</div>
                <div className="font-mono text-[10px] text-[var(--color-text-muted)] mt-1 truncate">
                  {node.filePath}
                </div>
                <div className="text-[10px] text-[var(--color-text-sub)] mt-2">
                  Importance: {node.importanceScore}
                  {heatmapMode ? ` · Risk: ${getRiskLabel(node)}` : ''}
                </div>
              </div>
            ),
          },
          style: {
            background: styles.background,
            border: `1px solid ${styles.borderColor}`,
            color: 'var(--color-text-main)',
            borderRadius: '8px',
            width: 210,
            transition: 'all 0.2s ease',
            boxShadow: styles.boxShadow,
          },
        };
      });
    });
  }, [filteredNodes, heatmapMode]);

  const graphEdges: Edge[] = useMemo(
    () =>
      filteredEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: heatmapMode,
        style: {
          stroke: heatmapMode ? 'rgba(255,255,255,0.16)' : 'var(--color-border-sub)',
          strokeWidth: Math.max(1, edge.weight || 1),
        },
      })),
    [filteredEdges, heatmapMode]
  );

  if (initialNodes.length === 0) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-[var(--color-background)] border border-dashed border-[var(--color-border-sub)] rounded-xl">
        <div className="text-center max-w-md px-6">
          <p className="font-mono text-xs text-[var(--color-accent)] uppercase tracking-widest mb-3">No Graph Yet</p>
          <p className="text-sm text-[var(--color-text-sub)] leading-relaxed">
            This repository has no stored graph nodes yet. Run a scan first, or check the latest scan job if one recently failed.
          </p>
        </div>
      </div>
    );
  }

  const visibleSelectedNode = selectedNode && filteredNodeIds.has(selectedNode.id) ? selectedNode : null;
  const selectedDependencies = visibleSelectedNode ? adjacency.deps.get(visibleSelectedNode.id) || [] : [];
  const selectedDependents = visibleSelectedNode ? adjacency.dependents.get(visibleSelectedNode.id) || [] : [];

  return (
    <div className="w-full h-full bg-[var(--color-background)] relative overflow-hidden" style={{ minHeight: '600px' }}>
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 max-w-[70%]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search files"
          className="px-3 py-2 text-xs font-mono rounded border border-[var(--color-border-sub)] bg-[var(--color-background-2)] text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)]"
        />
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as NodeTypeFilter)}
          className="px-3 py-2 text-xs font-mono rounded border border-[var(--color-border-sub)] bg-[var(--color-background-2)] text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="all">All types</option>
          <option value="middleware">Middleware</option>
          <option value="layout">Layout</option>
          <option value="api_route">API route</option>
          <option value="hook">Hook</option>
          <option value="supabase_client">Supabase client</option>
          <option value="page">Page</option>
          <option value="component">Component</option>
          <option value="util">Utility</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setHeatmapMode(!heatmapMode)}
          className={`px-3 py-1.5 text-xs font-mono border rounded transition-colors ${
            heatmapMode
              ? 'bg-[rgba(255,71,87,0.1)] border-[var(--color-red)] text-[var(--color-red)]'
              : 'bg-[var(--color-background-2)] border-[var(--color-border-sub)] text-[var(--color-text-sub)] hover:text-white'
          }`}
        >
          {heatmapMode ? 'Heatmap: On' : 'Heatmap: Off'}
        </button>
      </div>

      <ReactFlow
        nodes={graphNodes}
        edges={graphEdges}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        fitView
        className="react-flow-dark"
      >
        <Background color="var(--color-border-sub)" gap={20} size={1} />
        <Controls style={{ backgroundColor: 'var(--color-background-2)', border: '1px solid var(--color-border-main)', fill: 'var(--color-text-main)' }} />
        <MiniMap
          nodeColor={(node) => (node.style?.background as string) || '#222'}
          maskColor="rgba(10, 10, 11, 0.7)"
          style={{ backgroundColor: 'var(--color-background-2)', border: '1px solid var(--color-border-main)' }}
        />
      </ReactFlow>

      <div className={`absolute top-0 right-0 h-full w-80 bg-[rgba(17,17,20,0.95)] backdrop-blur-md border-l border-[var(--color-border-main)] shadow-2xl transition-transform duration-300 ease-in-out z-20 ${visibleSelectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
        {visibleSelectedNode && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-[var(--color-border-main)] flex justify-between items-start">
              <div>
                <span className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest">{visibleSelectedNode.nodeType}</span>
                <h3 className="font-sans font-bold text-lg mt-1">{visibleSelectedNode.displayName}</h3>
                <p className="font-mono text-[10px] text-[var(--color-text-muted)] mt-1 break-all">{visibleSelectedNode.filePath}</p>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="text-[var(--color-text-sub)] hover:text-white">
                x
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-6 bg-[var(--color-background-3)] border border-[var(--color-border-sub)] rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-[10px] text-[var(--color-text-muted)]">RISK SIGNAL</span>
                  <span className="font-mono text-[10px] text-[var(--color-red)] font-bold">{getRiskLabel(visibleSelectedNode)}</span>
                </div>
                <div className="text-2xl font-display font-bold">
                  {visibleSelectedNode.importanceScore}
                  <span className="text-sm text-[var(--color-text-sub)] font-sans ml-1">importance</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-sub)] mt-2">
                  {selectedDependents.length} dependents · {selectedDependencies.length} dependencies
                </p>
              </div>

              <div className="mb-6">
                <h4 className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-widest mb-2 border-b border-[var(--color-border-main)] pb-1">SUMMARY</h4>
                {visibleSelectedNode.aiSummary ? (
                  <p className="text-sm text-[var(--color-text-main)] leading-relaxed">{visibleSelectedNode.aiSummary}</p>
                ) : (
                  <p className="text-sm text-[var(--color-text-sub)] leading-relaxed">
                    AI summaries are not generated yet for this node.
                  </p>
                )}
              </div>

              <div className="mb-6">
                <h4 className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-widest mb-2 border-b border-[var(--color-border-main)] pb-1">
                  DEPENDENCIES ({selectedDependencies.length})
                </h4>
                {selectedDependencies.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedDependencies.map((dependencyId) => {
                      const dependency = initialNodes.find((node) => node.id === dependencyId);
                      return (
                        <li key={dependencyId} className="p-2 border border-[var(--color-border-sub)] rounded text-xs bg-[var(--color-background-3)]">
                          <span className="font-mono truncate">{dependency?.filePath || dependencyId}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--color-text-sub)]">No recorded dependencies.</p>
                )}
              </div>

              <div>
                <h4 className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-widest mb-2 border-b border-[var(--color-border-main)] pb-1">
                  DEPENDENTS ({selectedDependents.length})
                </h4>
                {selectedDependents.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedDependents.map((dependentId) => {
                      const dependent = initialNodes.find((node) => node.id === dependentId);
                      return (
                        <li key={dependentId} className="p-2 border border-[var(--color-border-sub)] rounded text-xs bg-[var(--color-background-3)]">
                          <span className="font-mono truncate">{dependent?.filePath || dependentId}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--color-text-sub)]">No recorded dependents.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
