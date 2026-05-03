"use client";

import { useCallback, useMemo, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';

interface GraphProps {
  initialNodes: any[];
  initialEdges: any[];
}

export default function ReactFlowCanvas({ initialNodes, initialEdges }: GraphProps) {
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  // Map sentinel nodes to react flow nodes
  const flowNodes: Node[] = initialNodes.map((n, i) => {
    // Basic scatter layout for mockup
    const x = (i % 3) * 250 + 100;
    const y = Math.floor(i / 3) * 150 + 100;
    
    // Determine color based on node type per blueprint
    let bgColor = 'var(--color-background-3)';
    let borderColor = 'var(--color-border-main)';
    let textColor = 'var(--color-text-main)';
    
    // Heatmap mode overrides colors based on risk/criticality
    if (heatmapMode) {
      if (n.type === 'middleware' || n.type === 'layout') {
         bgColor = 'rgba(255,71,87,0.3)'; // Red glow
         borderColor = '#ff4757';
      } else if (n.type === 'api_route' || n.type === 'hook' || n.type === 'supabase_client') {
         bgColor = 'rgba(255,165,2,0.2)'; // Amber
         borderColor = '#ffa502';
      } else {
         bgColor = 'rgba(46,213,115,0.1)'; // Green
         borderColor = '#2ed573';
      }
    } else {
      if (n.type === 'middleware' || n.type === 'layout') {
        borderColor = 'rgba(255,71,87,0.5)';
        bgColor = 'rgba(255,71,87,0.1)';
      } else if (n.type === 'api_route' || n.type === 'hook' || n.type === 'supabase_client') {
        borderColor = 'rgba(255,165,2,0.5)';
        bgColor = 'rgba(255,165,2,0.1)';
      } else if (n.type === 'page' || n.type === 'component') {
        borderColor = 'rgba(71,184,255,0.5)';
        bgColor = 'rgba(71,184,255,0.1)';
      }
    }
    
    return {
      id: n.id,
      position: { x, y },
      data: { 
        ...n,
        label: (
          <div className="flex flex-col text-left p-2">
            <div className="font-mono text-[10px] text-[var(--color-text-sub)] uppercase tracking-wider mb-1">{n.type}</div>
            <div className="font-sans text-sm font-medium">{n.display_name}</div>
            {!heatmapMode && <div className="text-[10px] text-[var(--color-text-muted)] mt-2 leading-tight">{n.ai_summary}</div>}
            {heatmapMode && <div className="text-[10px] font-mono font-bold mt-2 text-[var(--color-text-main)]">RISK: {n.type === 'middleware' ? 'HIGH' : n.type === 'page' ? 'LOW' : 'MEDIUM'}</div>}
          </div>
        ) 
      },
      style: {
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        borderRadius: '8px',
        width: 200,
        transition: 'all 0.3s ease',
        boxShadow: heatmapMode && (n.type === 'middleware' || n.type === 'layout') ? '0 0 20px rgba(255,71,87,0.4)' : 'none'
      }
    };
  });

  const flowEdges: Edge[] = initialEdges.map((e, i) => ({
    id: `e${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: heatmapMode ? 'rgba(255,255,255,0.1)' : 'var(--color-border-sub)', strokeWidth: 2 }
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Re-sync nodes when heatmap mode toggles
  useMemo(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [heatmapMode]);

  const onNodeClick = useCallback((event: any, node: Node) => {
    setSelectedNodeData(node.data);
  }, []);

  return (
    <div className="w-full h-full bg-[var(--color-background)] relative overflow-hidden" style={{ minHeight: '600px' }}>
      
      {/* Top right floating controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button 
          onClick={() => setHeatmapMode(!heatmapMode)}
          className={`px-3 py-1.5 text-xs font-mono border rounded transition-colors ${heatmapMode ? 'bg-[rgba(255,71,87,0.1)] border-[var(--color-red)] text-[var(--color-red)]' : 'bg-[var(--color-background-2)] border-[var(--color-border-sub)] text-[var(--color-text-sub)] hover:text-white'}`}
        >
          {heatmapMode ? '🔴 HEATMAP: ON' : 'HEATMAP: OFF'}
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        className="react-flow-dark"
      >
        <Background color="var(--color-border-sub)" gap={20} size={1} />
        <Controls style={{ backgroundColor: 'var(--color-background-2)', border: '1px solid var(--color-border-main)', fill: 'var(--color-text-main)' }} />
        <MiniMap 
          nodeColor={(n) => {
            return n.style?.background as string || '#222';
          }}
          maskColor="rgba(10, 10, 11, 0.7)"
          style={{ backgroundColor: 'var(--color-background-2)', border: '1px solid var(--color-border-main)' }}
        />
      </ReactFlow>

      {/* Slide-out Sidebar for Node Details */}
      <div className={`absolute top-0 right-0 h-full w-80 bg-[rgba(17,17,20,0.95)] backdrop-blur-md border-l border-[var(--color-border-main)] shadow-2xl transition-transform duration-300 ease-in-out z-20 ${selectedNodeData ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedNodeData && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-[var(--color-border-main)] flex justify-between items-start">
              <div>
                <span className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest">{selectedNodeData.type}</span>
                <h3 className="font-sans font-bold text-lg mt-1">{selectedNodeData.display_name}</h3>
                <p className="font-mono text-[10px] text-[var(--color-text-muted)] mt-1 truncate max-w-[200px]">{selectedNodeData.file_path}</p>
              </div>
              <button onClick={() => setSelectedNodeData(null)} className="text-[var(--color-text-sub)] hover:text-white">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {/* Risk Metrics */}
              <div className="mb-6 bg-[var(--color-background-3)] border border-[var(--color-border-sub)] rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-[10px] text-[var(--color-text-muted)]">BLAST RADIUS</span>
                  <span className="font-mono text-[10px] text-[var(--color-red)] font-bold">HIGH RISK</span>
                </div>
                <div className="text-2xl font-display font-bold">14<span className="text-sm text-[var(--color-text-sub)] font-sans ml-1">nodes affected</span></div>
              </div>

              {/* AI Summary */}
              <div className="mb-6">
                <h4 className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-widest mb-2 border-b border-[var(--color-border-main)] pb-1">AI SUMMARY</h4>
                <p className="text-sm text-[var(--color-text-main)] leading-relaxed">
                  {selectedNodeData.ai_summary}
                </p>
                <div className="mt-3 p-2 border border-dashed border-[var(--color-border-sub)] rounded bg-[var(--color-background-3)]">
                  <span className="font-mono text-[10px] text-[var(--color-accent)] block mb-1">TECHNICAL DETAILS</span>
                  <p className="text-[11px] text-[var(--color-text-sub)]">Imports ReactFlow, useNodesState. Connects to Supabase client for mock data. Renders the main canvas visualization layer.</p>
                </div>
              </div>

              {/* Dependencies */}
              <div>
                <h4 className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-widest mb-2 border-b border-[var(--color-border-main)] pb-1">DEPENDENCIES (3)</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 p-2 border border-[var(--color-border-sub)] rounded text-xs bg-[var(--color-background-3)]">
                    <span className="text-[var(--color-accent)]">→</span> 
                    <span className="font-mono truncate">lib/supabase/client.ts</span>
                  </li>
                  <li className="flex items-center gap-2 p-2 border border-[var(--color-border-sub)] rounded text-xs bg-[var(--color-background-3)]">
                    <span className="text-[var(--color-text-sub)]">←</span> 
                    <span className="font-mono truncate">app/dashboard/[repo_id]/page.tsx</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Source Code Action */}
            <div className="p-4 border-t border-[var(--color-border-main)] bg-[var(--color-background-2)]">
              <button className="w-full btn-primary py-2 text-xs">VIEW SOURCE CODE</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
