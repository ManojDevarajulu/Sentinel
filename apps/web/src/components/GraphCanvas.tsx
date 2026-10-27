"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { REPOSITORIES, RepositoryData, GraphNode, computeBlastRadius } from "@/lib/graphData";

interface GraphCanvasProps {
  initialRepo?: string;
  isEmbed?: boolean;
}

export default function GraphCanvas({ initialRepo = "sentinel", isEmbed = false }: GraphCanvasProps) {
  const [repoKey, setRepoKey] = useState<string>(initialRepo);
  const repo: RepositoryData = REPOSITORIES[repoKey] || REPOSITORIES.sentinel;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scale, setScale] = useState(isEmbed ? 0.72 : 0.95);
  const [translate, setTranslate] = useState({ x: isEmbed ? 40 : 120, y: isEmbed ? -40 : 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const blast = selectedId ? computeBlastRadius(repo, selectedId) : null;
  const selectedNode = selectedId ? repo.nodes.find((n) => n.id === selectedId) || null : null;

  // Center Graph on repo switch
  const centerGraph = useCallback(() => {
    if (isEmbed) {
      setScale(0.72);
      setTranslate({ x: 40, y: -40 });
    } else {
      setScale(0.92);
      setTranslate({ x: 120, y: 40 });
    }
  }, [isEmbed]);

  useEffect(() => {
    setSelectedId(null);
    centerGraph();
  }, [repoKey, centerGraph]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "circle" || (e.target as HTMLElement).tagName === "text") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(3, Math.max(0.25, prev * factor)));
  };

  // Search filter
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    const query = q.toLowerCase().trim();
    if (!query) return;
    const match = repo.nodes.find(
      (n) => n.id.toLowerCase().includes(query) || n.label.toLowerCase().includes(query)
    );
    if (match) setSelectedId(match.id);
  };

  // Export Mermaid graph
  const handleExportMermaid = () => {
    let mm = "graph TD;\n";
    repo.edges.forEach((e) => {
      mm += `  ${e.source.replace(/[^a-zA-Z0-9]/g, "_")} --> ${e.target.replace(/[^a-zA-Z0-9]/g, "_")};\n`;
    });
    navigator.clipboard.writeText(mm).then(() => {
      setCopiedMermaid(true);
      setTimeout(() => setCopiedMermaid(false), 1800);
    });
  };

  return (
    <div className={`flex flex-col relative w-full overflow-hidden bg-[#0a0a0b] ${isEmbed ? "h-[360px]" : "h-[calc(100vh-56px)]"}`}>
      {/* TOOLBAR */}
      {!isEmbed && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#111114] border-b border-[#222228] z-20 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="font-mono text-[11px] text-[#55556a]">Repository:</label>
            <select
              value={repoKey}
              onChange={(e) => setRepoKey(e.target.value)}
              className="bg-[#18181d] border border-[#2e2e38] text-[#e8ff47] font-mono text-[11px] font-semibold px-3 py-1.5 rounded-md outline-none cursor-pointer"
            >
              <option value="sentinel">Sentinel (Core Architecture)</option>
              <option value="intake">Intake AI (Clinical IDP Engine)</option>
              <option value="ledger">Ledger AI (Financial RAG Engine)</option>
              <option value="monorepo">Full-Stack Monorepo Fixture</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search files... (/)"
              className="bg-[#0a0a0b] border border-[#2e2e38] text-[#f0f0f2] font-mono text-[12px] px-3 py-1.5 rounded-md w-52 outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setScale((s) => Math.min(3, s * 1.2))} className="btn-tool">
              Zoom In
            </button>
            <button onClick={() => setScale((s) => Math.max(0.3, s * 0.8))} className="btn-tool">
              Zoom Out
            </button>
            <button onClick={centerGraph} className="btn-tool">
              Reset
            </button>
            <button onClick={handleExportMermaid} className="btn-tool font-semibold text-[#f0f0f2]">
              {copiedMermaid ? "Copied!" : "Copy Mermaid"}
            </button>
          </div>
        </div>
      )}

      {/* CANVAS */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 relative cursor-grab active:cursor-grabbing select-none ${
          isEmbed ? "h-[360px]" : "h-full"
        }`}
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(232, 255, 71, 0.02) 0%, transparent 70%)",
        }}
      >
        <svg className="w-full h-full">
          <defs>
            <marker id="m-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3a3a46" />
            </marker>
            <marker id="m-arrow-red" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#ff4757" />
            </marker>
            <marker id="m-arrow-lime" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#e8ff47" />
            </marker>
          </defs>

          <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
            {/* EDGES */}
            {repo.edges.map((e) => {
              const s = repo.nodes.find((n) => n.id === e.source);
              const t = repo.nodes.find((n) => n.id === e.target);
              if (!s || !t) return null;

              const isUpstreamEdge = blast && blast.upstream.has(s.id) && (t.id === selectedId || blast.upstream.has(t.id));
              const isDownstreamEdge = blast && blast.downstream.has(t.id) && (s.id === selectedId || blast.downstream.has(s.id));

              let stroke = "#222228";
              let strokeWidth = 1.5;
              let opacity = 0.8;
              let marker = "url(#m-arrow)";

              if (isUpstreamEdge) {
                stroke = "#ff4757";
                strokeWidth = 2.4;
                opacity = 1;
                marker = "url(#m-arrow-red)";
              } else if (isDownstreamEdge) {
                stroke = "#e8ff47";
                strokeWidth = 2.4;
                opacity = 1;
                marker = "url(#m-arrow-lime)";
              } else if (selectedId) {
                opacity = 0.2;
              }

              return (
                <line
                  key={`${e.source}->${e.target}`}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  markerEnd={marker}
                  className="transition-all duration-200"
                />
              );
            })}

            {/* NODES */}
            {repo.nodes.map((n) => {
              const isSelected = selectedId === n.id;
              const isUpstream = blast && blast.upstream.has(n.id);
              const isDownstream = blast && blast.downstream.has(n.id);

              let nodeOpacity = 1;
              let strokeColor = n.color;
              let strokeWidth = 2;

              if (isSelected) {
                strokeColor = "#ffffff";
                strokeWidth = 3.5;
              } else if (isUpstream) {
                strokeColor = "#ff4757";
                strokeWidth = 2.8;
              } else if (isDownstream) {
                strokeColor = "#e8ff47";
                strokeWidth = 2.5;
              } else if (selectedId) {
                nodeOpacity = 0.35;
                strokeColor = "#222228";
                strokeWidth = 1.5;
              }

              return (
                <g
                  key={n.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(n.id);
                  }}
                  className="cursor-pointer transition-opacity duration-200"
                  opacity={nodeOpacity}
                >
                  <circle cx={n.x} cy={n.y} r={isEmbed ? 20 : 26} fill={n.color} opacity={0.08} />
                  <circle cx={n.x} cy={n.y} r={isEmbed ? 11 : 14} fill="#0a0a0b" stroke={strokeColor} strokeWidth={strokeWidth} />
                  <text
                    x={n.x}
                    y={n.y + (isEmbed ? 22 : 28)}
                    textAnchor="middle"
                    fill={isSelected ? "#ffffff" : isUpstream ? "#ff4757" : isDownstream ? "#e8ff47" : "#8888a0"}
                    fontSize={isEmbed ? 10 : 11}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight={isSelected ? 700 : 500}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* INSPECTOR DRAWER */}
        {!isEmbed && selectedNode && blast && (
          <div className="absolute top-4 right-4 w-[340px] bg-[rgba(17,17,20,0.96)] backdrop-blur-md border border-[#2e2e38] rounded-xl p-4 z-30 shadow-2xl transition-all">
            <div className="flex justify-between items-start mb-2">
              <span
                className="font-mono text-[9px] font-bold px-2 py-0.5 rounded border uppercase"
                style={{
                  color: selectedNode.color,
                  borderColor: selectedNode.color,
                  background: `${selectedNode.color}15`,
                }}
              >
                {selectedNode.kind}
              </span>
              <span
                className="font-mono text-[9px] font-bold px-2 py-0.5 rounded border"
                style={{
                  color: blast.riskLevel === "CRITICAL" ? "#ff4757" : blast.riskLevel === "WARNING" ? "#ffa502" : "#2ed573",
                  borderColor: blast.riskLevel === "CRITICAL" ? "#ff4757" : blast.riskLevel === "WARNING" ? "#ffa502" : "#2ed573",
                  background: blast.riskLevel === "CRITICAL" ? "rgba(255,71,87,0.12)" : blast.riskLevel === "WARNING" ? "rgba(255,165,2,0.12)" : "rgba(46,213,115,0.12)",
                }}
              >
                {blast.riskLevel} ({blast.riskScore}/100)
              </span>
            </div>

            <h3 className="font-head text-base font-bold text-[#f0f0f2] mt-2 mb-0.5">{selectedNode.label}</h3>
            <p className="font-mono text-[10px] text-[#8888a0] break-all">{selectedNode.id}</p>

            <div className="grid grid-cols-2 gap-2 my-3">
              <div className="bg-[#0a0a0b] p-2.5 rounded-md border border-[#222228]">
                <div className="font-head text-[17px] font-extrabold text-[#e8ff47]">{blast.upstream.size}</div>
                <div className="font-mono text-[9px] text-[#55556a] uppercase tracking-wider">Upstream Importers</div>
              </div>
              <div className="bg-[#0a0a0b] p-2.5 rounded-md border border-[#222228]">
                <div className="font-head text-[17px] font-extrabold text-[#e8ff47]">{blast.downstream.size}</div>
                <div className="font-mono text-[9px] text-[#55556a] uppercase tracking-wider">Dependencies</div>
              </div>
              <div className="bg-[#0a0a0b] p-2.5 rounded-md border border-[#222228]">
                <div className="font-head text-[17px] font-extrabold text-[#e8ff47]">{selectedNode.loc}</div>
                <div className="font-mono text-[9px] text-[#55556a] uppercase tracking-wider">Lines of Code</div>
              </div>
              <div className="bg-[#0a0a0b] p-2.5 rounded-md border border-[#222228]">
                <div className="font-head text-[17px] font-extrabold text-[#e8ff47]">{(0.15 + blast.upstream.size * 0.12).toFixed(2)}</div>
                <div className="font-mono text-[9px] text-[#55556a] uppercase tracking-wider">PageRank Score</div>
              </div>
            </div>

            <p className="text-xs text-[#8888a0] leading-relaxed">
              Modifying <strong className="text-[#f0f0f2]">{selectedNode.label}</strong> transitively impacts{" "}
              <strong className="text-[#f0f0f2]">{blast.upstream.size}</strong> upstream file(s).
            </p>

            {selectedNode.exports.length > 0 && (
              <div className="mt-3">
                <span className="font-mono text-[9px] text-[#55556a] uppercase tracking-wider block mb-1.5">
                  Exported Symbols ({selectedNode.exports.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.exports.map((sym) => (
                    <span key={sym} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#18181d] border border-[#2e2e38] text-[#e8ff47]">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
