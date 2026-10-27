import json
import math
from typing import Dict, List, Optional
from src.types import BlastRadiusReport, CodeEdge, CodeNode, NodeKind


class ViewerGenerator:
    """Generates an Archify-grade, zero-dependency, self-contained interactive HTML visualizer."""

    KIND_COLORS = {
        NodeKind.MIDDLEWARE: "#c084fc",  # Purple
        NodeKind.ENTRYPOINT: "#818cf8",  # Indigo
        NodeKind.LAYOUT: "#6366f1",      # Deep Indigo
        NodeKind.ROUTER: "#34d399",      # Emerald
        NodeKind.MODEL: "#fbbf24",       # Amber
        NodeKind.SERVICE: "#38bdf8",     # Sky Blue
        NodeKind.HOOK: "#f472b6",        # Pink
        NodeKind.COMPONENT: "#fb7185",   # Rose
        NodeKind.UTIL: "#94a3b8",        # Slate
        NodeKind.CONFIG: "#a3e635",      # Lime
        NodeKind.TEST: "#64748b",        # Gray
        NodeKind.OTHER: "#cbd5e1",
    }

    def __init__(self, nodes: Dict[str, CodeNode], edges: List[CodeEdge], repo_name: str = "Repository"):
        self.nodes = nodes
        self.edges = edges
        self.repo_name = repo_name

    def generate_html(self, report: Optional[BlastRadiusReport] = None, title: str = "Sentinel Architecture & Blast-Radius Visualizer") -> str:
        # Precompute positions using a circular/layered topological layout
        node_positions = self._compute_layout()
        
        nodes_payload = []
        for nid, node in sorted(self.nodes.items()):
            pos = node_positions.get(nid, {"x": 500, "y": 400})
            nodes_payload.append({
                "id": node.id,
                "label": node.display_name,
                "path": node.file_path,
                "kind": node.kind.value,
                "color": self.KIND_COLORS.get(node.kind, "#94a3b8"),
                "loc": node.lines_of_code,
                "importance": node.importance_score,
                "inDegree": node.in_degree,
                "outDegree": node.out_degree,
                "exports": node.exports[:8],
                "x": pos["x"],
                "y": pos["y"],
            })

        edges_payload = [
            {
                "source": e.source,
                "target": e.target,
                "kind": e.edge_kind.value,
                "symbols": e.symbols[:4],
            }
            for e in self.edges
        ]

        report_payload = report.to_dict() if report else {
            "changed_files": [],
            "affected_nodes": [],
            "blast_radius_count": 0,
            "risk_level": "SAFE",
            "risk_score": 0,
            "critical_paths": [],
            "hop_distances": {},
            "summary": "Full repository dependency architecture view.",
        }

        json_data = json.dumps({
            "repoName": self.repo_name,
            "nodes": nodes_payload,
            "edges": edges_payload,
            "report": report_payload,
        })

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Sentinel</title>
  <style>
    :root {{
      --bg: #090d16;
      --panel: #111827;
      --panel-border: #1f293d;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #38bdf8;
      --critical: #ef4444;
      --warning: #f59e0b;
      --safe: #10b981;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
    }}
    header {{
      background: rgba(17, 24, 39, 0.9);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--panel-border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 20;
    }}
    .brand {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .logo-badge {{
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      color: #000;
      font-weight: 800;
      font-size: 13px;
      padding: 4px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }}
    .title-group h1 {{
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }}
    .title-group p {{
      font-size: 12px;
      color: var(--text-muted);
    }}
    .controls {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .search-input {{
      background: #1f293d;
      border: 1px solid #374151;
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      width: 220px;
      outline: none;
      transition: all 0.2s;
    }}
    .search-input:focus {{
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }}
    .btn {{
      background: #1f293d;
      border: 1px solid #374151;
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }}
    .btn:hover {{
      background: #283548;
      border-color: #4b5563;
    }}
    .btn-accent {{
      background: var(--accent);
      color: #090d16;
      border: none;
    }}
    .btn-accent:hover {{
      background: #7dd3fc;
    }}
    .main-container {{
      flex: 1;
      position: relative;
      overflow: hidden;
    }}
    #canvas-svg {{
      width: 100%;
      height: 100%;
      cursor: grab;
    }}
    #canvas-svg:active {{
      cursor: grabbing;
    }}
    /* Detail Drawer */
    .drawer {{
      position: absolute;
      top: 16px;
      right: 16px;
      width: 340px;
      background: rgba(17, 24, 39, 0.94);
      backdrop-filter: blur(12px);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      padding: 16px;
      z-index: 15;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      transition: all 0.2s ease;
    }}
    .drawer-header {{
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 12px;
    }}
    .badge {{
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .badge-critical {{ background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }}
    .badge-warning {{ background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }}
    .badge-safe {{ background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }}
    .meta-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
      margin-bottom: 12px;
    }}
    .meta-card {{
      background: #1a2234;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid #232e45;
    }}
    .meta-card .num {{
      font-size: 16px;
      font-weight: 700;
      color: var(--accent);
    }}
    .meta-card .lbl {{
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
    }}
    /* Floating Action Bar */
    .float-bar {{
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(17, 24, 39, 0.94);
      backdrop-filter: blur(12px);
      border: 1px solid var(--panel-border);
      border-radius: 30px;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 15;
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    }}
    .mode-tab {{
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.15s;
    }}
    .mode-tab.active {{
      background: #1f293d;
      color: #fff;
    }}
    .node-element {{
      cursor: pointer;
      transition: transform 0.15s ease, filter 0.15s ease;
    }}
    .node-element:hover circle {{
      stroke: #fff;
      stroke-width: 2.5px;
    }}
    .edge-element {{
      stroke: #334155;
      stroke-width: 1.2px;
      transition: stroke 0.2s, stroke-width 0.2s;
    }}
    .edge-highlight {{
      stroke: #f87171 !important;
      stroke-width: 2.2px !important;
    }}
    .edge-downstream {{
      stroke: #38bdf8 !important;
      stroke-width: 2.2px !important;
    }}
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="logo-badge">SENTINEL</div>
      <div class="title-group">
        <h1 id="header-repo-title">{self.repo_name} Architecture</h1>
        <p id="header-stats">AST Graph & Blast-Radius Trace Engine</p>
      </div>
    </div>
    <div class="controls">
      <input type="text" id="search-input" class="search-input" placeholder="Search files... (/)" />
      <button class="btn" id="btn-zoom-in">+</button>
      <button class="btn" id="btn-zoom-out">-</button>
      <button class="btn" id="btn-reset">Reset (0)</button>
      <button class="btn btn-accent" id="btn-copy-mermaid">Copy Mermaid</button>
    </div>
  </header>

  <div class="main-container">
    <svg id="canvas-svg">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
        </marker>
        <marker id="arrow-hit" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
        </marker>
        <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g id="viewport-group">
        <g id="edges-group"></g>
        <g id="nodes-group"></g>
      </g>
    </svg>

    <!-- Detail Drawer -->
    <div class="drawer" id="detail-drawer">
      <div class="drawer-header">
        <div>
          <span class="badge badge-safe" id="node-kind-badge">NODE</span>
          <h2 id="node-label" style="font-size:15px; font-weight:700; margin-top:4px;">Select a Node</h2>
        </div>
      </div>
      <p id="node-path" style="font-size:12px; color:var(--text-muted); word-break:break-all;"></p>

      <div class="meta-grid">
        <div class="meta-card"><div class="num" id="meta-in-degree">0</div><div class="lbl">Upstream Importers</div></div>
        <div class="meta-card"><div class="num" id="meta-out-degree">0</div><div class="lbl">Downstream Dependencies</div></div>
        <div class="meta-card"><div class="num" id="meta-loc">0</div><div class="lbl">Lines of Code</div></div>
        <div class="meta-card"><div class="num" id="meta-importance">0</div><div class="lbl">Importance Score</div></div>
      </div>

      <div id="blast-section" style="margin-top:12px; border-top:1px solid #1f293d; padding-top:10px;">
        <h3 style="font-size:12px; text-transform:uppercase; color:var(--text-muted); margin-bottom:6px;">Blast Radius Impact</h3>
        <p id="blast-status" style="font-size:13px; line-height:1.4; color:#e2e8f0;"></p>
      </div>
    </div>

    <!-- Floating Navigation Bar -->
    <div class="float-bar">
      <div class="mode-tab active" data-mode="all">All Dependencies</div>
      <div class="mode-tab" data-mode="upstream">Upstream Blast Radius</div>
      <div class="mode-tab" data-mode="downstream">Downstream Chain</div>
    </div>
  </div>

  <script>
    const DATA = {json_data};

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let selectedNodeId = null;
    let currentMode = "all";

    const svg = document.getElementById("canvas-svg");
    const viewport = document.getElementById("viewport-group");
    const nodesGroup = document.getElementById("nodes-group");
    const edgesGroup = document.getElementById("edges-group");

    // Initialize Canvas
    function init() {{
      renderGraph();
      setupEvents();
      centerGraph();
      if (DATA.report.changed_files && DATA.report.changed_files.length > 0) {{
        selectNode(DATA.report.changed_files[0]);
      }}
    }}

    function renderGraph() {{
      nodesGroup.innerHTML = "";
      edgesGroup.innerHTML = "";

      // Render Edges
      DATA.edges.forEach((edge, i) => {{
        const src = DATA.nodes.find(n => n.id === edge.source);
        const tgt = DATA.nodes.find(n => n.id === edge.target);
        if (!src || !tgt) return;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", src.x);
        line.setAttribute("y1", src.y);
        line.setAttribute("x2", tgt.x);
        line.setAttribute("y2", tgt.y);
        line.setAttribute("class", "edge-element");
        line.setAttribute("marker-end", "url(#arrow)");
        line.id = `edge-${{edge.source}}-${{edge.target}}`;
        edgesGroup.appendChild(line);
      }});

      // Render Nodes
      DATA.nodes.forEach(node => {{
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "node-element");
        g.setAttribute("transform", `translate(${{node.x}}, ${{node.y}})`);
        g.id = `node-${{node.id}}`;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const radius = Math.min(24, Math.max(10, 8 + node.inDegree * 2.5));
        circle.setAttribute("r", radius);
        circle.setAttribute("fill", node.color);
        circle.setAttribute("stroke", "#1e293b");
        circle.setAttribute("stroke-width", "2");

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("y", radius + 14);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "#e2e8f0");
        text.setAttribute("font-size", "11px");
        text.setAttribute("font-weight", "600");
        text.textContent = node.label.length > 18 ? node.label.substring(0, 15) + "..." : node.label;

        g.appendChild(circle);
        g.appendChild(text);

        g.addEventListener("click", (e) => {{
          e.stopPropagation();
          selectNode(node.id);
        }});

        nodesGroup.appendChild(g);
      }});
    }}

    function selectNode(id) {{
      selectedNodeId = id;
      const node = DATA.nodes.find(n => n.id === id);
      if (!node) return;

      document.getElementById("node-label").textContent = node.label;
      document.getElementById("node-path").textContent = node.path;
      document.getElementById("meta-in-degree").textContent = node.inDegree;
      document.getElementById("meta-out-degree").textContent = node.outDegree;
      document.getElementById("meta-loc").textContent = node.loc;
      document.getElementById("meta-importance").textContent = node.importance;

      const badge = document.getElementById("node-kind-badge");
      badge.textContent = node.kind;
      badge.style.background = node.color + "33";
      badge.style.color = node.color;
      badge.style.border = `1px solid ${{node.color}}88`;

      // Calculate blast radius highlighting
      const upstream = getUpstreamReach(id);
      const downstream = getDownstreamReach(id);

      document.getElementById("blast-status").innerHTML = 
        `Modifying <strong>${{node.label}}</strong> directly impacts <strong>${{upstream.size}}</strong> upstream file(s).`;

      // Highlight Canvas Elements
      highlightCanvas(id, upstream, downstream);
    }}

    function getUpstreamReach(id) {{
      const visited = new Set();
      const q = [id];
      while(q.length > 0) {{
        const curr = q.shift();
        DATA.edges.forEach(e => {{
          if (e.target === curr && !visited.has(e.source)) {{
            visited.add(e.source);
            q.push(e.source);
          }}
        }});
      }}
      return visited;
    }}

    function getDownstreamReach(id) {{
      const visited = new Set();
      const q = [id];
      while(q.length > 0) {{
        const curr = q.shift();
        DATA.edges.forEach(e => {{
          if (e.source === curr && !visited.has(e.target)) {{
            visited.add(e.target);
            q.push(e.target);
          }}
        }});
      }}
      return visited;
    }}

    function highlightCanvas(focusedId, upstreamSet, downstreamSet) {{
      DATA.nodes.forEach(n => {{
        const el = document.getElementById(`node-${{n.id}}`);
        if (!el) return;
        const circle = el.querySelector("circle");

        if (n.id === focusedId) {{
          circle.setAttribute("stroke", "#ffffff");
          circle.setAttribute("stroke-width", "3.5");
          circle.setAttribute("filter", "url(#glow-red)");
          el.style.opacity = "1";
        }} else if (upstreamSet.has(n.id) && (currentMode === "all" || currentMode === "upstream")) {{
          circle.setAttribute("stroke", "#f87171");
          circle.setAttribute("stroke-width", "2.5");
          circle.setAttribute("filter", "url(#glow-red)");
          el.style.opacity = "1";
        }} else if (downstreamSet.has(n.id) && (currentMode === "all" || currentMode === "downstream")) {{
          circle.setAttribute("stroke", "#38bdf8");
          circle.setAttribute("stroke-width", "2.5");
          circle.setAttribute("filter", "url(#glow-cyan)");
          el.style.opacity = "1";
        }} else {{
          circle.setAttribute("stroke", "#1e293b");
          circle.setAttribute("stroke-width", "1.5");
          circle.removeAttribute("filter");
          el.style.opacity = currentMode === "all" ? "0.6" : "0.15";
        }}
      }});

      DATA.edges.forEach(e => {{
        const edgeEl = document.getElementById(`edge-${{e.source}}-${{e.target}}`);
        if (!edgeEl) return;

        if (upstreamSet.has(e.source) && (e.target === focusedId || upstreamSet.has(e.target))) {{
          edgeEl.setAttribute("class", "edge-element edge-highlight");
        }} else if (downstreamSet.has(e.target) && (e.source === focusedId || downstreamSet.has(e.source))) {{
          edgeEl.setAttribute("class", "edge-element edge-downstream");
        }} else {{
          edgeEl.setAttribute("class", "edge-element");
          edgeEl.style.opacity = currentMode === "all" ? "0.4" : "0.08";
        }}
      }});
    }}

    function setupEvents() {{
      svg.addEventListener("mousedown", (e) => {{
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
      }});

      window.addEventListener("mousemove", (e) => {{
        if (!isDragging) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
      }});

      window.addEventListener("mouseup", () => {{
        isDragging = false;
      }});

      svg.addEventListener("wheel", (e) => {{
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        scale = Math.min(3, Math.max(0.2, scale * delta));
        updateTransform();
      }});

      document.getElementById("btn-zoom-in").addEventListener("click", () => {{
        scale = Math.min(3, scale * 1.2);
        updateTransform();
      }});

      document.getElementById("btn-zoom-out").addEventListener("click", () => {{
        scale = Math.max(0.2, scale * 0.8);
        updateTransform();
      }});

      document.getElementById("btn-reset").addEventListener("click", centerGraph);

      document.getElementById("search-input").addEventListener("input", (e) => {{
        const q = e.target.value.toLowerCase().trim();
        if (!q) return;
        const match = DATA.nodes.find(n => n.path.toLowerCase().includes(q) || n.label.toLowerCase().includes(q));
        if (match) selectNode(match.id);
      }});

      document.querySelectorAll(".mode-tab").forEach(tab => {{
        tab.addEventListener("click", (e) => {{
          document.querySelectorAll(".mode-tab").forEach(t => t.classList.remove("active"));
          e.target.classList.add("active");
          currentMode = e.target.dataset.mode;
          if (selectedNodeId) selectNode(selectedNodeId);
        }});
      }});

      document.getElementById("btn-copy-mermaid").addEventListener("click", () => {{
        let mm = "graph TD;\\n";
        DATA.edges.forEach(e => {{
          mm += `  ${{e.source.replace(/[^a-zA-Z0-9]/g, "_")}} --> ${{e.target.replace(/[^a-zA-Z0-9]/g, "_")}};\\n`;
        }});
        navigator.clipboard.writeText(mm).then(() => alert("Copied Mermaid graph to clipboard!"));
      }});
    }}

    function centerGraph() {{
      scale = 0.85;
      translateX = window.innerWidth / 3;
      translateY = window.innerHeight / 3;
      updateTransform();
    }}

    function updateTransform() {{
      viewport.setAttribute("transform", `translate(${{translateX}}, ${{translateY}}) scale(${{scale}})`);
    }}

    init();
  </script>
</body>
</html>"""

    def _compute_layout(self) -> Dict[str, Dict[str, float]]:
        """Topological radial layout for clean visual placement without node overlap."""
        positions: Dict[str, Dict[str, float]] = {}
        node_ids = list(self.nodes.keys())
        total = len(node_ids)
        if total == 0:
            return positions

        # Categorize into rings based on node kind
        core_ring = []
        middle_ring = []
        outer_ring = []

        for nid, node in self.nodes.items():
            if node.kind in (NodeKind.ENTRYPOINT, NodeKind.MIDDLEWARE, NodeKind.LAYOUT):
                core_ring.append(nid)
            elif node.kind in (NodeKind.ROUTER, NodeKind.SERVICE, NodeKind.MODEL):
                middle_ring.append(nid)
            else:
                outer_ring.append(nid)

        center_x = 600
        center_y = 450

        # Place Core Ring
        if core_ring:
            radius = 120
            step = (2 * math.pi) / len(core_ring)
            for i, nid in enumerate(core_ring):
                positions[nid] = {
                    "x": center_x + radius * math.cos(i * step),
                    "y": center_y + radius * math.sin(i * step),
                }

        # Place Middle Ring
        if middle_ring:
            radius = 280
            step = (2 * math.pi) / len(middle_ring)
            for i, nid in enumerate(middle_ring):
                positions[nid] = {
                    "x": center_x + radius * math.cos(i * step + 0.3),
                    "y": center_y + radius * math.sin(i * step + 0.3),
                }

        # Place Outer Ring
        if outer_ring:
            radius = 480
            step = (2 * math.pi) / len(outer_ring)
            for i, nid in enumerate(outer_ring):
                positions[nid] = {
                    "x": center_x + radius * math.cos(i * step + 0.6),
                    "y": center_y + radius * math.sin(i * step + 0.6),
                }

        return positions
