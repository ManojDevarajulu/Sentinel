"use client";

import { useMemo, useState, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge, useReactFlow, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import type { GraphViewEdge, GraphViewNode } from '@/lib/api';

interface GraphProps { initialNodes: GraphViewNode[]; initialEdges: GraphViewEdge[] }
type FilterType = 'all' | 'page' | 'layout' | 'component' | 'hook' | 'api_route' | 'middleware' | 'util' | 'supabase_client' | 'other';

const TYPE_COLORS: Record<string, { bg: string; border: string; glow?: string }> = {
  middleware:      { bg: 'rgba(255,71,87,0.12)',   border: '#ff4757', glow: 'rgba(255,71,87,0.4)' },
  layout:          { bg: 'rgba(255,71,87,0.08)',   border: 'rgba(255,71,87,0.6)' },
  api_route:       { bg: 'rgba(255,165,2,0.1)',    border: '#ffa502', glow: 'rgba(255,165,2,0.3)' },
  hook:            { bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.6)' },
  supabase_client: { bg: 'rgba(232,255,71,0.08)', border: 'rgba(232,255,71,0.5)' },
  page:            { bg: 'rgba(71,184,255,0.1)',   border: 'rgba(71,184,255,0.6)' },
  component:       { bg: 'rgba(71,184,255,0.07)', border: 'rgba(71,184,255,0.35)' },
  util:            { bg: 'rgba(136,136,160,0.08)', border: 'rgba(136,136,160,0.35)' },
  other:           { bg: 'rgba(136,136,160,0.06)', border: 'rgba(136,136,160,0.25)' },
};

const RISK_LABEL = (n: GraphViewNode) => {
  if (n.nodeType === 'middleware' || n.nodeType === 'layout') return 'HIGH';
  if (n.importanceScore >= 60 || n.nodeType === 'api_route') return 'HIGH';
  if (n.importanceScore >= 30 || n.nodeType === 'hook' || n.nodeType === 'supabase_client') return 'MED';
  return 'LOW';
};
const RISK_COLOR: Record<string, string> = { HIGH: '#ff4757', MED: '#ffa502', LOW: '#47b8ff' };

function nodeWidth(score: number) {
  if (score >= 65) return 240;
  if (score >= 35) return 200;
  return 160;
}

function CanvasInner({ initialNodes, initialEdges }: GraphProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState(false);
  const [groupByFolder, setGroupByFolder] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphViewNode } | null>(null);

  // Adjacency maps
  const { deps, dependents, inDegree, outDegree } = useMemo(() => {
    const deps = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    initialNodes.forEach(n => { inDegree.set(n.id, 0); outDegree.set(n.id, 0); });
    initialEdges.forEach(e => {
      deps.set(e.source, [...(deps.get(e.source) || []), e.target]);
      dependents.set(e.target, [...(dependents.get(e.target) || []), e.source]);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1);
    });
    return { deps, dependents, inDegree, outDegree };
  }, [initialNodes, initialEdges]);

  // Blast radius sets
  const blastRadius = useMemo(() => {
    const active = selectedId || hoveredId;
    if (!active) return null;
    return {
      center: active,
      out: new Set(deps.get(active) || []),
      inn: new Set(dependents.get(active) || []),
    };
  }, [selectedId, hoveredId, deps, dependents]);

  // Filtered nodes
  const query = search.trim().toLowerCase();
  const filteredNodes = useMemo(() => initialNodes.filter(n => {
    const matchType = typeFilter === 'all' || n.nodeType === typeFilter;
    const matchSearch = !query || n.filePath.toLowerCase().includes(query) || n.displayName.toLowerCase().includes(query);
    return matchType && matchSearch;
  }), [initialNodes, query, typeFilter]);

  const filteredIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  // Folder groups
  const folderGroups = useMemo(() => {
    if (!groupByFolder) return new Map<string, GraphViewNode[]>();
    const groups = new Map<string, GraphViewNode[]>();
    filteredNodes.forEach(n => {
      const parts = n.filePath.split('/');
      const folder = parts.length > 1 ? parts.slice(0, Math.min(2, parts.length - 1)).join('/') : 'root';
      groups.set(folder, [...(groups.get(folder) || []), n]);
    });
    return groups;
  }, [filteredNodes, groupByFolder]);

  // Build ReactFlow nodes
  const graphNodes: Node[] = useMemo(() => {
    const order = ['middleware', 'layout', 'api_route', 'hook', 'supabase_client', 'page', 'component', 'util', 'other'];
    const grouped = new Map<string, GraphViewNode[]>();
    filteredNodes.slice().sort((a, b) => b.importanceScore - a.importanceScore).forEach(n => {
      const key = order.includes(n.nodeType) ? n.nodeType : 'other';
      grouped.set(key, [...(grouped.get(key) || []), n]);
    });

    return order.flatMap((grp, col) => {
      return (grouped.get(grp) || []).map((node, row) => {
        const colors = TYPE_COLORS[node.nodeType] || TYPE_COLORS.other;
        const w = nodeWidth(node.importanceScore);
        const risk = RISK_LABEL(node);
        const riskColor = RISK_COLOR[risk];

        // Blast radius opacity/highlight
        let opacity = 1;
        let borderColor = colors.border;
        let boxShadow = 'none';
        let bg = heatmap
          ? (node.nodeType === 'middleware' || node.nodeType === 'layout' ? 'rgba(255,71,87,0.18)' :
             node.importanceScore >= 60 ? 'rgba(255,165,2,0.14)' : 'rgba(71,184,255,0.1)')
          : colors.bg;

        if (blastRadius) {
          if (node.id === blastRadius.center) {
            borderColor = '#ffffff';
            boxShadow = `0 0 20px rgba(255,255,255,0.4)`;
          } else if (blastRadius.out.has(node.id)) {
            borderColor = '#ffa502';
            boxShadow = `0 0 14px rgba(255,165,2,0.35)`;
            bg = 'rgba(255,165,2,0.12)';
          } else if (blastRadius.inn.has(node.id)) {
            borderColor = '#47b8ff';
            boxShadow = `0 0 14px rgba(71,184,255,0.35)`;
            bg = 'rgba(71,184,255,0.12)';
          } else {
            opacity = 0.12;
          }
        } else if (colors.glow && heatmap) {
          boxShadow = `0 0 14px ${colors.glow}`;
        }

        return {
          id: node.id,
          position: { x: 80 + col * (w + 60), y: 80 + row * 140 },
          data: {
            label: (
              <div
                className="flex flex-col text-left p-2 select-none"
                onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, node })}
                onMouseLeave={() => setTooltip(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-[var(--color-text-sub)] uppercase tracking-wider">{node.nodeType}</span>
                  <span className="font-mono text-[9px] font-bold" style={{ color: riskColor }}>{risk}</span>
                </div>
                <div className="font-sans text-xs font-semibold truncate">{node.displayName}</div>
                <div className="font-mono text-[9px] text-[var(--color-text-muted)] mt-0.5 truncate">{node.filePath}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${node.importanceScore}%`, background: riskColor, opacity: 0.7 }} />
                  </div>
                  <span className="font-mono text-[9px] text-[var(--color-text-muted)]">{node.importanceScore}</span>
                </div>
              </div>
            ),
          },
          style: {
            background: bg, border: `1px solid ${borderColor}`, borderRadius: '8px',
            color: 'var(--color-text-main)', width: w, opacity,
            boxShadow, transition: 'all 0.18s ease',
          },
        };
      });
    });
  }, [filteredNodes, blastRadius, heatmap]);

  const graphEdges: Edge[] = useMemo(() => {
    return initialEdges
      .filter(e => filteredIds.has(e.source) && filteredIds.has(e.target))
      .map(e => {
        let stroke = heatmap ? 'rgba(255,255,255,0.12)' : 'var(--color-border-sub)';
        if (blastRadius) {
          if (blastRadius.out.has(e.target) && e.source === blastRadius.center) stroke = 'rgba(255,165,2,0.6)';
          else if (blastRadius.inn.has(e.source) && e.target === blastRadius.center) stroke = 'rgba(71,184,255,0.6)';
          else stroke = 'rgba(255,255,255,0.04)';
        }
        return {
          id: e.id, source: e.source, target: e.target,
          animated: heatmap && (e.source === blastRadius?.center || e.target === blastRadius?.center),
          style: { stroke, strokeWidth: Math.max(1, e.weight || 1) },
        };
      });
  }, [initialEdges, filteredIds, blastRadius, heatmap]);

  const selectedNode = useMemo(() => initialNodes.find(n => n.id === selectedId) || null, [initialNodes, selectedId]);

  // Top files panel (when nothing selected)
  const topFiles = useMemo(() =>
    [...initialNodes].sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 10),
  [initialNodes]);

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

  return (
    <div className="w-full h-full bg-[var(--color-background)] relative overflow-hidden" style={{ minHeight: '600px' }}>
      {/* Controls bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 max-w-[65%]">
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"
          className="px-3 py-1.5 text-xs font-mono rounded border border-[var(--color-border-sub)] bg-[var(--color-background-2)] text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)] w-44"
        />
        <select
          value={typeFilter} onChange={e => setTypeFilter(e.target.value as FilterType)}
          className="px-3 py-1.5 text-xs font-mono rounded border border-[var(--color-border-sub)] bg-[var(--color-background-2)] text-[var(--color-text-main)]"
        >
          {['all','middleware','layout','api_route','hook','supabase_client','page','component','util','other'].map(t => (
            <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>
          ))}
        </select>
      </div>

      {/* Mode buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {blastRadius && (
          <button onClick={() => { setSelectedId(null); setHoveredId(null); }}
            className="px-3 py-1.5 text-xs font-mono border border-white/30 rounded bg-white/10 text-white hover:bg-white/20 transition-colors">
            Clear Focus
          </button>
        )}
        <button onClick={() => setGroupByFolder(v => !v)}
          className={`px-3 py-1.5 text-xs font-mono border rounded transition-colors ${groupByFolder ? 'bg-[rgba(167,139,250,0.12)] border-[rgba(167,139,250,0.5)] text-[rgba(167,139,250,1)]' : 'bg-[var(--color-background-2)] border-[var(--color-border-sub)] text-[var(--color-text-sub)] hover:text-white'}`}>
          {groupByFolder ? 'Grouped' : 'Group Folders'}
        </button>
        <button onClick={() => setHeatmap(v => !v)}
          className={`px-3 py-1.5 text-xs font-mono border rounded transition-colors ${heatmap ? 'bg-[rgba(255,71,87,0.1)] border-[var(--color-red)] text-[var(--color-red)]' : 'bg-[var(--color-background-2)] border-[var(--color-border-sub)] text-[var(--color-text-sub)] hover:text-white'}`}>
          {heatmap ? 'Heatmap: On' : 'Heatmap'}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-3 flex-wrap">
        {[
          { label: 'Selected', color: '#ffffff' },
          { label: 'Depends on', color: '#ffa502' },
          { label: 'Imported by', color: '#47b8ff' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
            <span className="font-mono text-[9px] text-[var(--color-text-muted)]">{l.label}</span>
          </div>
        ))}
      </div>

      <ReactFlow
        nodes={graphNodes} edges={graphEdges}
        onNodeClick={(_, node) => setSelectedId(prev => prev === node.id ? null : node.id)}
        onPaneClick={() => { setSelectedId(null); setHoveredId(null); }}
        fitView className="react-flow-dark"
      >
        <Background color="var(--color-border-sub)" gap={20} size={1} />
        <Controls style={{ backgroundColor: 'var(--color-background-2)', border: '1px solid var(--color-border-main)', fill: 'var(--color-text-main)' }} />
        <MiniMap
          nodeColor={n => (n.style?.background as string) || '#1a1a1f'}
          maskColor="rgba(10,10,11,0.75)"
          style={{ backgroundColor: 'var(--color-background-2)', border: '1px solid var(--color-border-main)' }}
        />
      </ReactFlow>

      {/* Hover tooltip */}
      {tooltip && !selectedId && (
        <div
          className="fixed z-50 pointer-events-none bg-[rgba(17,17,20,0.96)] border border-[var(--color-border-main)] rounded-lg px-3 py-2 shadow-2xl backdrop-blur-md"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <p className="font-mono text-[9px] text-[var(--color-accent)] uppercase tracking-widest mb-1">{tooltip.node.nodeType}</p>
          <p className="font-sans text-xs font-semibold">{tooltip.node.displayName}</p>
          <p className="font-mono text-[9px] text-[var(--color-text-muted)] mt-0.5">{tooltip.node.filePath}</p>
          <div className="flex gap-3 mt-1.5 font-mono text-[9px] text-[var(--color-text-sub)]">
            <span>↑ {inDegree.get(tooltip.node.id) || 0} importers</span>
            <span>↓ {outDegree.get(tooltip.node.id) || 0} imports</span>
            <span>Score: {tooltip.node.importanceScore}</span>
          </div>
        </div>
      )}

      {/* Right panel — selected node details OR top files */}
      <div className={`absolute top-0 right-0 h-full w-72 bg-[rgba(17,17,20,0.97)] backdrop-blur-md border-l border-[var(--color-border-main)] shadow-2xl transition-transform duration-300 z-20 overflow-y-auto ${(selectedNode || true) ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedNode ? (
          <div className="flex flex-col">
            <div className="p-4 border-b border-[var(--color-border-main)] flex justify-between items-start sticky top-0 bg-[rgba(17,17,20,0.97)]">
              <div>
                <span className="font-mono text-[9px] text-[var(--color-accent)] tracking-widest uppercase">{selectedNode.nodeType}</span>
                <h3 className="font-sans font-bold text-base mt-0.5">{selectedNode.displayName}</h3>
                <p className="font-mono text-[9px] text-[var(--color-text-muted)] mt-0.5 break-all">{selectedNode.filePath}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-[var(--color-text-sub)] hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-4 space-y-5">
              {/* Score + Risk */}
              <div className="bg-[var(--color-background-3)] border border-[var(--color-border-sub)] rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-[9px] text-[var(--color-text-muted)]">RISK SIGNAL</span>
                  <span className="font-mono text-[9px] font-bold" style={{ color: RISK_COLOR[RISK_LABEL(selectedNode)] }}>{RISK_LABEL(selectedNode)}</span>
                </div>
                <div className="text-2xl font-bold">{selectedNode.importanceScore}<span className="text-xs text-[var(--color-text-sub)] font-normal ml-1">/ 100</span></div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] mt-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${selectedNode.importanceScore}%`, background: RISK_COLOR[RISK_LABEL(selectedNode)] }} />
                </div>
                <div className="flex gap-4 mt-2 font-mono text-[9px] text-[var(--color-text-sub)]">
                  <span>↑ {inDegree.get(selectedNode.id) || 0} importers</span>
                  <span>↓ {outDegree.get(selectedNode.id) || 0} imports</span>
                </div>
              </div>

              {/* Dependencies */}
              {(deps.get(selectedNode.id) || []).length > 0 && (
                <div>
                  <h4 className="font-mono text-[9px] text-[var(--color-text-muted)] tracking-widest mb-2 border-b border-[var(--color-border-main)] pb-1">
                    DEPENDS ON ({(deps.get(selectedNode.id) || []).length})
                  </h4>
                  <ul className="space-y-1.5">
                    {(deps.get(selectedNode.id) || []).map(id => {
                      const n = initialNodes.find(x => x.id === id);
                      return (
                        <li key={id} onClick={() => setSelectedId(id)}
                          className="p-2 border border-[rgba(255,165,2,0.2)] rounded text-xs bg-[rgba(255,165,2,0.05)] cursor-pointer hover:border-[rgba(255,165,2,0.5)] transition-colors">
                          <span className="font-mono text-[9px] text-[#ffa502] block mb-0.5">{n?.nodeType || 'file'}</span>
                          <span className="font-mono truncate block">{n?.displayName || id}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Dependents */}
              {(dependents.get(selectedNode.id) || []).length > 0 && (
                <div>
                  <h4 className="font-mono text-[9px] text-[var(--color-text-muted)] tracking-widest mb-2 border-b border-[var(--color-border-main)] pb-1">
                    IMPORTED BY ({(dependents.get(selectedNode.id) || []).length})
                  </h4>
                  <ul className="space-y-1.5">
                    {(dependents.get(selectedNode.id) || []).map(id => {
                      const n = initialNodes.find(x => x.id === id);
                      return (
                        <li key={id} onClick={() => setSelectedId(id)}
                          className="p-2 border border-[rgba(71,184,255,0.2)] rounded text-xs bg-[rgba(71,184,255,0.05)] cursor-pointer hover:border-[rgba(71,184,255,0.5)] transition-colors">
                          <span className="font-mono text-[9px] text-[#47b8ff] block mb-0.5">{n?.nodeType || 'file'}</span>
                          <span className="font-mono truncate block">{n?.displayName || id}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Exports */}
              {selectedNode.exports.length > 0 && (
                <div>
                  <h4 className="font-mono text-[9px] text-[var(--color-text-muted)] tracking-widest mb-2 border-b border-[var(--color-border-main)] pb-1">EXPORTS ({selectedNode.exports.length})</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.exports.slice(0, 20).map((ex, i) => (
                      <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-background-3)] border border-[var(--color-border-sub)] text-[var(--color-text-sub)]">{ex}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Top Files panel when nothing is selected */
          <div className="flex flex-col">
            <div className="p-4 border-b border-[var(--color-border-main)] sticky top-0 bg-[rgba(17,17,20,0.97)]">
              <p className="font-mono text-[9px] text-[var(--color-accent)] uppercase tracking-widest">Top Files by Importance</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Click any node to see blast radius</p>
            </div>
            <div className="p-3 space-y-1.5">
              {topFiles.map((n, i) => (
                <div key={n.id} onClick={() => setSelectedId(n.id)}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-border-sub)] bg-[var(--color-background-3)] hover:border-[var(--color-border-main)] cursor-pointer transition-colors group">
                  <span className="font-mono text-[10px] text-[var(--color-text-muted)] w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] font-medium truncate group-hover:text-white transition-colors">{n.displayName}</p>
                    <p className="font-mono text-[9px] text-[var(--color-text-muted)] truncate">{n.nodeType}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[9px] font-bold" style={{ color: RISK_COLOR[RISK_LABEL(n)] }}>{n.importanceScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReactFlowCanvas(props: GraphProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
