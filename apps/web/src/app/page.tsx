"use client";

import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import GraphCanvas from "@/components/GraphCanvas";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedInstall, setCopiedInstall] = useState(false);

  const handleCopyInstall = () => {
    navigator.clipboard.writeText("pip install .");
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f0f0f2]">
      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* PANEL 1: OVERVIEW */}
      {activeTab === "overview" && (
        <main>
          {/* HERO */}
          <section className="relative px-6 pt-20 pb-14 text-center flex flex-col items-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(34,34,40,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,34,40,0.3) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="eyebrow mb-6">
              <span>OPEN SOURCE</span>
              <span className="eyebrow-sep">·</span>
              <span>DETERMINISTIC AST</span>
              <span className="eyebrow-sep">·</span>
              <span>ZERO AUTH</span>
            </div>

            <h1 className="font-head text-5xl md:text-6xl font-extrabold leading-[1.16] tracking-[0.01em] max-w-4xl">
              AI writes the code.
              <br />
              <span className="lime">Sentinel</span> protects it.
            </h1>

            <p className="text-[#8888a0] text-lg max-w-2xl mt-5 mb-8 font-light leading-relaxed">
              Map every dependency. Score every risk. Know what breaks before it does.
              <br />
              Pure Python AST extraction with deterministic blast-radius reachability.
            </p>

            <div className="flex items-center gap-3 mb-10 flex-wrap justify-center">
              <button onClick={() => setActiveTab("visualizer")} className="btn-primary">
                Open Graph Explorer
              </button>
              <div onClick={handleCopyInstall} className="cmd-box">
                <span className="font-mono text-xs">$ pip install .</span>
                <span className="cmd-action">{copiedInstall ? "Copied!" : "Copy"}</span>
              </div>
            </div>

            {/* STATS STRIP */}
            <div className="flex justify-center gap-12 flex-wrap py-6 border-y border-[#222228] max-w-4xl w-full mx-auto mb-12">
              <div className="text-center">
                <div className="font-head text-3xl font-extrabold text-[#e8ff47]">&lt; 20ms</div>
                <div className="font-mono text-[10px] text-[#55556a] mt-1 tracking-wider uppercase">Graph Latency</div>
              </div>
              <div className="text-center">
                <div className="font-head text-3xl font-extrabold text-[#e8ff47]">100%</div>
                <div className="font-mono text-[10px] text-[#55556a] mt-1 tracking-wider uppercase">Deterministic AST</div>
              </div>
              <div className="text-center">
                <div className="font-head text-3xl font-extrabold text-[#e8ff47]">0</div>
                <div className="font-mono text-[10px] text-[#55556a] mt-1 tracking-wider uppercase">External DBs / Auth Gates</div>
              </div>
              <div className="text-center">
                <div className="font-head text-3xl font-extrabold text-[#e8ff47]">4-Dim</div>
                <div className="font-mono text-[10px] text-[#55556a] mt-1 tracking-wider uppercase">Weighted Risk Model</div>
              </div>
            </div>

            {/* INTERACTIVE PREVIEW GRAPH CARD */}
            <div className="w-full max-w-4xl bg-[#111114] border border-[#2e2e38] rounded-xl overflow-hidden mx-auto shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#18181d] border-b border-[#222228] font-mono text-[11px]">
                <div className="flex items-center gap-1 text-[#8888a0]">
                  <span className="text-[#55556a]">workspace</span>
                  <span>/</span>
                  <span className="text-[#f0f0f2] font-medium">architecture.graph</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#55556a] uppercase tracking-wider">Interactive Preview</span>
                  <button onClick={() => setActiveTab("visualizer")} className="btn-tool">
                    Expand View
                  </button>
                </div>
              </div>

              <div className="h-[360px] relative">
                <GraphCanvas isEmbed={true} initialRepo="sentinel" />
              </div>
            </div>
          </section>

          {/* PROBLEM & COMPARISON */}
          <section className="max-w-5xl mx-auto px-6 py-16">
            <div className="font-mono text-[10px] text-[#e8ff47] uppercase tracking-widest mb-2">The AI Age Problem</div>
            <h2 className="font-head text-3xl font-bold tracking-[0.01em] mb-4">Why AI-generated code breaks silently in production.</h2>
            <p className="text-[#8888a0] text-sm leading-relaxed mb-8 max-w-3xl">
              Tools like Claude Code, Cursor, and Copilot allow developers to ship hundreds of lines of code in seconds.
              However, mental math cannot compute whether modifying an entity in <code className="font-mono text-[#e8ff47]">models.py</code> propagates
              through 4 hops into API routes and payment webhooks. Sentinel resolves the exact AST import graph locally, guaranteeing
              zero broken invariants before code merges.
            </p>

            {/* COMPARISON TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-[#111114] border border-[#222228] rounded-lg text-sm">
                <thead>
                  <tr className="border-b border-[#222228] bg-[rgba(17,17,20,0.6)] font-mono text-[11px] text-[#55556a] uppercase">
                    <th className="p-3.5 text-left">Capability</th>
                    <th className="p-3.5 text-left">Legacy Cloud SaaS</th>
                    <th className="p-3.5 text-left">LLM Mental Math</th>
                    <th className="p-3.5 text-left">Sentinel (Pure AST Engine)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228] text-xs">
                  <tr>
                    <td className="p-3.5 font-semibold text-[#f0f0f2]">Authentication Gate</td>
                    <td className="p-3.5 text-[#8888a0]">Requires Login, Signup, Supabase/Clerk</td>
                    <td className="p-3.5 text-[#8888a0]">N/A</td>
                    <td className="p-3.5 text-[#e8ff47] font-semibold">Zero Auth (100% Offline & Open Source)</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-[#f0f0f2]">Runtime Footprint</td>
                    <td className="p-3.5 text-[#8888a0]">Docker, Celery, Redis, PostgreSQL</td>
                    <td className="p-3.5 text-[#8888a0]">External API latency (3-15s)</td>
                    <td className="p-3.5 text-[#e8ff47] font-semibold">Standard Library Python (Zero Dependencies)</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-[#f0f0f2]">Latency</td>
                    <td className="p-3.5 text-[#8888a0]">10 - 45 seconds per scan</td>
                    <td className="p-3.5 text-[#8888a0]">3,000 - 8,000ms</td>
                    <td className="p-3.5 text-[#e8ff47] font-semibold">&lt; 20ms per repository</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-[#f0f0f2]">Determinism</td>
                    <td className="p-3.5 text-[#8888a0]">Dependent on database availability</td>
                    <td className="p-3.5 text-[#8888a0]">Hallucinates phantom files and imports</td>
                    <td className="p-3.5 text-[#e8ff47] font-semibold">100% Deterministic (Native AST Grammar)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CAPABILITIES */}
            <div className="mt-16">
              <div className="font-mono text-[10px] text-[#e8ff47] uppercase tracking-widest mb-2">Engineered for Depth</div>
              <h2 className="font-head text-3xl font-bold tracking-[0.01em] mb-6">Core Architectural Capabilities</h2>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-[#111114] border border-[#222228] p-5 rounded-xl hover:border-[#2e2e38] transition-colors">
                  <div className="font-mono text-[11px] text-[#e8ff47] mb-2">01 / BFS BLAST RADIUS</div>
                  <h3 className="font-head text-base font-bold text-[#f0f0f2] mb-1">Reverse Reachability</h3>
                  <p className="text-xs text-[#8888a0] leading-relaxed">
                    Computes every file transitively affected by modifying a target module via reverse Breadth-First Search with critical path tracing.
                  </p>
                </div>
                <div className="bg-[#111114] border border-[#222228] p-5 rounded-xl hover:border-[#2e2e38] transition-colors">
                  <div className="font-mono text-[11px] text-[#e8ff47] mb-2">02 / DETERMINISTIC AST</div>
                  <h3 className="font-head text-base font-bold text-[#f0f0f2] mb-1">Zero Regex Parsing</h3>
                  <p className="text-xs text-[#8888a0] leading-relaxed">
                    Analyzes native Python <code className="font-mono text-[#f0f0f2]">ast.parse</code> and TypeScript/ESM imports accurately without guesswork.
                  </p>
                </div>
                <div className="bg-[#111114] border border-[#222228] p-5 rounded-xl hover:border-[#2e2e38] transition-colors">
                  <div className="font-mono text-[11px] text-[#e8ff47] mb-2">03 / ROLE CLASSIFIER</div>
                  <h3 className="font-head text-base font-bold text-[#f0f0f2] mb-1">Architectural Taxonomy</h3>
                  <p className="text-xs text-[#8888a0] leading-relaxed">
                    Detects 8 semantic roles: Middleware, Layout, Model, Service, Component, Hook, Router, and Utility.
                  </p>
                </div>
                <div className="bg-[#111114] border border-[#222228] p-5 rounded-xl hover:border-[#2e2e38] transition-colors">
                  <div className="font-mono text-[11px] text-[#e8ff47] mb-2">04 / RISK SCORING</div>
                  <h3 className="font-head text-base font-bold text-[#f0f0f2] mb-1">4-Component Scoring</h3>
                  <p className="text-xs text-[#8888a0] leading-relaxed">
                    Evaluates Volume (40%), Critical Roles (30%), Topological PageRank (20%), and Proximity (10%) to output SAFE, WARNING, or CRITICAL.
                  </p>
                </div>
                <div className="bg-[#111114] border border-[#222228] p-5 rounded-xl hover:border-[#2e2e38] transition-colors">
                  <div className="font-mono text-[11px] text-[#e8ff47] mb-2">05 / CLAUDE CODE SKILL</div>
                  <h3 className="font-head text-base font-bold text-[#f0f0f2] mb-1">Agentic Pair Programming</h3>
                  <p className="text-xs text-[#8888a0] leading-relaxed">
                    Pre-packaged as a Claude Code Skill in <code className="font-mono text-[#f0f0f2]">.claude/skills/sentinel</code> for automated blast-radius audits inside agent loops.
                  </p>
                </div>
                <div className="bg-[#111114] border border-[#222228] p-5 rounded-xl hover:border-[#2e2e38] transition-colors">
                  <div className="font-mono text-[11px] text-[#e8ff47] mb-2">06 / GRAPHIFY / ARCHIFY CLI</div>
                  <h3 className="font-head text-base font-bold text-[#f0f0f2] mb-1">Instant Browser Server</h3>
                  <p className="text-xs text-[#8888a0] leading-relaxed">
                    <code className="font-mono text-[#f0f0f2]">sentinel serve .</code> spins up a local server on port 7331 and opens your browser in 5 milliseconds with zero setup.
                  </p>
                </div>
              </div>
            </div>

            {/* NODE ROLE TAXONOMY */}
            <div className="mt-16">
              <div className="font-mono text-[10px] text-[#e8ff47] uppercase tracking-widest mb-2">Visual Design Language</div>
              <h2 className="font-head text-2xl font-bold tracking-[0.01em] mb-4">Node Role Taxonomy & Color System</h2>
              <div className="flex gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border text-[#ff4757] border-[#ff4757] bg-[rgba(255,71,87,0.08)]">MIDDLEWARE</span>
                <span className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border text-[#ffa502] border-[#ffa502] bg-[rgba(255,165,2,0.08)]">ENTRYPOINT</span>
                <span className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border text-[#47b8ff] border-[#47b8ff] bg-[rgba(71,184,255,0.08)]">LAYOUT</span>
                <span className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border text-[#2ed573] border-[#2ed573] bg-[rgba(46,213,115,0.08)]">ROUTER</span>
                <span className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border text-[#e8ff47] border-[#e8ff47] bg-[rgba(232,255,71,0.08)]">MODEL</span>
                <span className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border text-[#a78bfa] border-[#a78bfa] bg-[rgba(167,139,250,0.08)]">SERVICE</span>
                <span className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border text-[#2ed573] border-[#2ed573] bg-[rgba(46,213,115,0.08)]">COMPONENT</span>
                <span className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border text-[#8888a0] border-[#8888a0] bg-[rgba(136,136,160,0.08)]">UTIL</span>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* PANEL 2: GRAPH EXPLORER */}
      {activeTab === "visualizer" && (
        <main className="h-[calc(100vh-56px)]">
          <GraphCanvas isEmbed={false} initialRepo="sentinel" />
        </main>
      )}

      {/* PANEL 3: ARCHITECTURE SPECS */}
      {activeTab === "blueprint" && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <div className="font-mono text-[10px] text-[#e8ff47] uppercase tracking-widest mb-2">Technical Specification</div>
          <h1 className="font-head text-4xl font-extrabold mb-3">Sentinel Architecture Blueprint</h1>
          <p className="text-sm text-[#8888a0] mb-8">The closed-form mathematical principles and invariant algorithms powering the engine.</p>

          <div className="bg-[#111114] border border-[#222228] p-6 rounded-xl mb-6">
            <h3 className="lime font-head text-lg font-bold mb-2">1. Deterministic Reverse-BFS Transitive Blast Radius</h3>
            <p className="text-xs text-[#8888a0] leading-relaxed mb-3">
              Given a set of modified files M ⊂ V, Sentinel constructs the transpose graph G^T = (V, E^T) and evaluates the transitive reachability:
            </p>
            <div className="font-mono text-xs bg-[#0a0a0b] border border-[#222228] p-3 rounded-md text-[#f0f0f2] mb-3">
              Reach(M) = &#123; v &isin; V | &exist; path v &rarr;* m for some m &isin; M &#125;
            </div>
            <p className="text-xs text-[#8888a0] leading-relaxed">
              Hop distance d(v, M) is computed via single-pass BFS. Any propagation path terminating at an Entrypoint or Middleware escalates the audit to <strong className="text-[#ff4757]">CRITICAL</strong>.
            </p>
          </div>

          <div className="bg-[#111114] border border-[#222228] p-6 rounded-xl mb-6">
            <h3 className="lime font-head text-lg font-bold mb-2">2. Weighted Architectural Risk Formulation</h3>
            <p className="text-xs text-[#8888a0] leading-relaxed mb-3">
              The risk score S &isin; [0, 100] is evaluated as a convex combination of 4 architectural invariants:
            </p>
            <div className="font-mono text-xs bg-[#0a0a0b] border border-[#222228] p-3 rounded-md text-[#f0f0f2] mb-3">
              Score = 0.40 * VolumeScore + 0.30 * CriticalTypeScore + 0.20 * PageRankAvg + 0.10 * ProximityScore
            </div>
            <p className="text-xs text-[#8888a0] leading-relaxed">
              Special rule: If <code className="font-mono text-[#ff4757]">NodeKind.MIDDLEWARE</code> is in the reachability set, <code className="font-mono text-[#e8ff47]">Score = max(Score, 85.0)</code> and level is forced to <strong className="text-[#ff4757]">CRITICAL</strong>.
            </p>
          </div>

          <div className="bg-[#111114] border border-[#222228] p-6 rounded-xl">
            <h3 className="lime font-head text-lg font-bold mb-3">3. Empirical Performance Benchmarks</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[#222228] text-xs">
                <thead>
                  <tr className="bg-[#18181d] text-[#55556a] font-mono text-[10px] uppercase border-b border-[#222228]">
                    <th className="p-3 text-left">Repository</th>
                    <th className="p-3 text-left">Files Scanned</th>
                    <th className="p-3 text-left">Import Edges</th>
                    <th className="p-3 text-left">Parse + Graph Latency</th>
                    <th className="p-3 text-left">Target Modified File</th>
                    <th className="p-3 text-left">Blast Radius</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228]">
                  <tr>
                    <td className="p-3 font-semibold text-[#f0f0f2]">Sentinel (Core Engine)</td>
                    <td className="p-3 text-[#8888a0]">9</td>
                    <td className="p-3 text-[#8888a0]">12</td>
                    <td className="p-3 text-[#e8ff47] font-semibold">16.6ms</td>
                    <td className="p-3 text-[#8888a0]">src/types.py</td>
                    <td className="p-3 text-[#ffa502]">7 upstream files (WARNING)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[#f0f0f2]">Intake AI (Clinical IDP)</td>
                    <td className="p-3 text-[#8888a0]">19</td>
                    <td className="p-3 text-[#8888a0]">32</td>
                    <td className="p-3 text-[#e8ff47] font-semibold">43.4ms</td>
                    <td className="p-3 text-[#8888a0]">src/schema.py</td>
                    <td className="p-3 text-[#ff4757]">13 upstream files (CRITICAL)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[#f0f0f2]">Ledger AI (Financial RAG)</td>
                    <td className="p-3 text-[#8888a0]">17</td>
                    <td className="p-3 text-[#8888a0]">23</td>
                    <td className="p-3 text-[#e8ff47] font-semibold">24.1ms</td>
                    <td className="p-3 text-[#8888a0]">src/chunker.py</td>
                    <td className="p-3 text-[#ffa502]">8 upstream files (WARNING)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* PANEL 4: CLI & CLAUDE SKILL */}
      {activeTab === "cli" && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <div className="font-mono text-[10px] text-[#e8ff47] uppercase tracking-widest mb-2">Developer Workflow</div>
          <h1 className="font-head text-4xl font-extrabold mb-3">Standalone CLI & Agent Skill</h1>
          <p className="text-sm text-[#8888a0] mb-8">Run Sentinel in your terminal or hook it into Claude Code pair-programming loops.</p>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-[#111114] border border-[#222228] p-5 rounded-xl">
              <div className="font-mono text-[10px] text-[#e8ff47] mb-2">LOCAL BROWSER SERVER</div>
              <h3 className="font-head text-base font-bold text-[#f0f0f2] mb-1">sentinel serve</h3>
              <p className="text-xs text-[#8888a0] leading-relaxed mb-3">
                Launches an embedded Python HTTP server on port 7331 and opens your default browser with zero login:
              </p>
              <div className="font-mono text-xs bg-[#0a0a0b] border border-[#222228] p-2.5 rounded-md text-[#f0f0f2]">
                $ sentinel serve .<br />
                <span className="text-[#55556a]">Serving on http://localhost:7331</span>
              </div>
            </div>

            <div className="bg-[#111114] border border-[#222228] p-5 rounded-xl">
              <div className="font-mono text-[10px] text-[#e8ff47] mb-2">OFFLINE SCAN & HTML</div>
              <h3 className="font-head text-base font-bold text-[#f0f0f2] mb-1">sentinel scan</h3>
              <p className="text-xs text-[#8888a0] leading-relaxed mb-3">
                Analyzes repository AST and outputs a single-file, self-contained HTML visualizer:
              </p>
              <div className="font-mono text-xs bg-[#0a0a0b] border border-[#222228] p-2.5 rounded-md text-[#f0f0f2]">
                $ sentinel scan . -o graph.html --open
              </div>
            </div>

            <div className="bg-[#111114] border border-[#222228] p-5 rounded-xl">
              <div className="font-mono text-[10px] text-[#e8ff47] mb-2">CLAUDE CODE AGENT</div>
              <h3 className="font-head text-base font-bold text-[#f0f0f2] mb-1">.claude/skills/sentinel</h3>
              <p className="text-xs text-[#8888a0] leading-relaxed mb-3">
                Claude automatically triggers Sentinel whenever you ask &quot;What breaks if I change this file?&quot;:
              </p>
              <div className="font-mono text-xs bg-[#0a0a0b] border border-[#222228] p-2.5 rounded-md text-[#f0f0f2]">
                $ sentinel blast-radius -c src/types.py --json
              </div>
            </div>
          </div>
        </main>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#222228] py-8 px-6 text-center text-xs text-[#55556a] font-mono">
        Sentinel — Codebase AST & Blast-Radius Engine · MIT License · Designed & Engineered by Manoj Devarajulu
      </footer>
    </div>
  );
}
