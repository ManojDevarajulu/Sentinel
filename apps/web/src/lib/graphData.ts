export interface GraphNode {
  id: string;
  label: string;
  kind: "MIDDLEWARE" | "ENTRYPOINT" | "LAYOUT" | "ROUTER" | "MODEL" | "SERVICE" | "COMPONENT" | "UTIL" | "TEST";
  color: string;
  x: number;
  y: number;
  loc: number;
  inDegree: number;
  outDegree: number;
  exports: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface RepositoryData {
  id: string;
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const REPOSITORIES: Record<string, RepositoryData> = {
  sentinel: {
    id: "sentinel",
    name: "Sentinel (Core Architecture)",
    nodes: [
      { id: "sentinel.py", label: "sentinel.py", kind: "ENTRYPOINT", color: "#ffa502", x: 600, y: 160, loc: 162, inDegree: 0, outDegree: 4, exports: ["main", "run_scan", "run_serve", "run_blast_radius"] },
      { id: "src/ast_extractor.py", label: "ast_extractor.py", kind: "SERVICE", color: "#a78bfa", x: 420, y: 280, loc: 180, inDegree: 2, outDegree: 2, exports: ["ASTExtractor"] },
      { id: "src/graph_engine.py", label: "graph_engine.py", kind: "SERVICE", color: "#a78bfa", x: 600, y: 320, loc: 195, inDegree: 2, outDegree: 1, exports: ["GraphEngine"] },
      { id: "src/viewer_generator.py", label: "viewer_generator.py", kind: "SERVICE", color: "#a78bfa", x: 780, y: 280, loc: 240, inDegree: 2, outDegree: 1, exports: ["ViewerGenerator"] },
      { id: "src/types.py", label: "types.py", kind: "MODEL", color: "#e8ff47", x: 600, y: 480, loc: 85, inDegree: 4, outDegree: 0, exports: ["CodeNode", "CodeEdge", "NodeKind", "BlastRadiusReport"] },
      { id: "eval_benchmark.py", label: "eval_benchmark.py", kind: "UTIL", color: "#8888a0", x: 380, y: 460, loc: 95, inDegree: 0, outDegree: 3, exports: ["run_all_benchmarks"] },
      { id: "tests/test_sentinel_core.py", label: "test_sentinel_core.py", kind: "TEST", color: "#55556a", x: 820, y: 460, loc: 160, inDegree: 0, outDegree: 4, exports: ["TestSentinelCore"] }
    ],
    edges: [
      { source: "sentinel.py", target: "src/ast_extractor.py" },
      { source: "sentinel.py", target: "src/graph_engine.py" },
      { source: "sentinel.py", target: "src/viewer_generator.py" },
      { source: "sentinel.py", target: "src/types.py" },
      { source: "src/ast_extractor.py", target: "src/types.py" },
      { source: "src/graph_engine.py", target: "src/types.py" },
      { source: "src/viewer_generator.py", target: "src/types.py" },
      { source: "eval_benchmark.py", target: "src/ast_extractor.py" },
      { source: "eval_benchmark.py", target: "src/graph_engine.py" },
      { source: "tests/test_sentinel_core.py", target: "src/ast_extractor.py" },
      { source: "tests/test_sentinel_core.py", target: "src/graph_engine.py" },
      { source: "tests/test_sentinel_core.py", target: "src/viewer_generator.py" }
    ]
  },
  intake: {
    id: "intake",
    name: "Intake AI (Clinical IDP Engine)",
    nodes: [
      { id: "web/server.py", label: "server.py", kind: "ENTRYPOINT", color: "#ffa502", x: 600, y: 150, loc: 600, inDegree: 0, outDegree: 4, exports: ["app", "upload_referral_document", "update_referral_field"] },
      { id: "src/calibrated_router.py", label: "calibrated_router.py", kind: "ROUTER", color: "#2ed573", x: 420, y: 280, loc: 160, inDegree: 1, outDegree: 2, exports: ["CalibratedRouter"] },
      { id: "src/ocr_engine.py", label: "ocr_engine.py", kind: "SERVICE", color: "#a78bfa", x: 780, y: 280, loc: 210, inDegree: 1, outDegree: 2, exports: ["OCRExtractionEngine"] },
      { id: "src/clinical_verifier.py", label: "clinical_verifier.py", kind: "SERVICE", color: "#a78bfa", x: 420, y: 440, loc: 185, inDegree: 1, outDegree: 0, exports: ["ClinicalVerifier"] },
      { id: "src/fhir_exporter.py", label: "fhir_exporter.py", kind: "SERVICE", color: "#a78bfa", x: 780, y: 440, loc: 230, inDegree: 1, outDegree: 1, exports: ["FHIRExporter"] },
      { id: "src/schema.py", label: "schema.py", kind: "MODEL", color: "#e8ff47", x: 600, y: 360, loc: 140, inDegree: 4, outDegree: 0, exports: ["ReferralV1", "PatientEntity", "DiagnosisEntity"] }
    ],
    edges: [
      { source: "web/server.py", target: "src/calibrated_router.py" },
      { source: "web/server.py", target: "src/ocr_engine.py" },
      { source: "web/server.py", target: "src/fhir_exporter.py" },
      { source: "web/server.py", target: "src/schema.py" },
      { source: "src/calibrated_router.py", target: "src/clinical_verifier.py" },
      { source: "src/calibrated_router.py", target: "src/schema.py" },
      { source: "src/ocr_engine.py", target: "src/schema.py" },
      { source: "src/fhir_exporter.py", target: "src/schema.py" }
    ]
  },
  ledger: {
    id: "ledger",
    name: "Ledger AI (Financial RAG Engine)",
    nodes: [
      { id: "web/server.py", label: "server.py", kind: "ENTRYPOINT", color: "#ffa502", x: 600, y: 150, loc: 420, inDegree: 0, outDegree: 3, exports: ["app"] },
      { id: "src/hybrid_retriever.py", label: "hybrid_retriever.py", kind: "SERVICE", color: "#a78bfa", x: 450, y: 300, loc: 280, inDegree: 1, outDegree: 1, exports: ["HybridRetriever"] },
      { id: "src/ast_evaluator.py", label: "ast_evaluator.py", kind: "SERVICE", color: "#a78bfa", x: 750, y: 300, loc: 190, inDegree: 1, outDegree: 1, exports: ["ASTEvaluator"] },
      { id: "src/chunker.py", label: "chunker.py", kind: "SERVICE", color: "#a78bfa", x: 600, y: 440, loc: 310, inDegree: 2, outDegree: 1, exports: ["TableAwareChunker"] },
      { id: "src/models.py", label: "models.py", kind: "MODEL", color: "#e8ff47", x: 600, y: 300, loc: 110, inDegree: 3, outDegree: 0, exports: ["FinancialRecord", "FactChunk"] }
    ],
    edges: [
      { source: "web/server.py", target: "src/hybrid_retriever.py" },
      { source: "web/server.py", target: "src/ast_evaluator.py" },
      { source: "web/server.py", target: "src/models.py" },
      { source: "src/hybrid_retriever.py", target: "src/chunker.py" },
      { source: "src/ast_evaluator.py", target: "src/models.py" },
      { source: "src/chunker.py", target: "src/models.py" }
    ]
  },
  monorepo: {
    id: "monorepo",
    name: "Full-Stack Monorepo Fixture",
    nodes: [
      { id: "src/middleware.ts", label: "middleware.ts", kind: "MIDDLEWARE", color: "#ff4757", x: 300, y: 220, loc: 90, inDegree: 0, outDegree: 2, exports: ["middleware"] },
      { id: "app/layout.tsx", label: "layout.tsx", kind: "LAYOUT", color: "#47b8ff", x: 500, y: 160, loc: 120, inDegree: 1, outDegree: 2, exports: ["RootLayout"] },
      { id: "app/dashboard/page.tsx", label: "dashboard/page.tsx", kind: "ROUTER", color: "#2ed573", x: 700, y: 180, loc: 240, inDegree: 1, outDegree: 2, exports: ["DashboardPage"] },
      { id: "lib/auth.ts", label: "auth.ts", kind: "SERVICE", color: "#a78bfa", x: 420, y: 340, loc: 140, inDegree: 2, outDegree: 1, exports: ["verifySession", "getUser"] },
      { id: "components/Chart.tsx", label: "Chart.tsx", kind: "COMPONENT", color: "#2ed573", x: 800, y: 320, loc: 180, inDegree: 1, outDegree: 1, exports: ["RiskChart"] },
      { id: "lib/db.ts", label: "db.ts", kind: "MODEL", color: "#e8ff47", x: 600, y: 460, loc: 110, inDegree: 3, outDegree: 0, exports: ["prisma", "queryAudit"] }
    ],
    edges: [
      { source: "src/middleware.ts", target: "lib/auth.ts" },
      { source: "src/middleware.ts", target: "app/layout.tsx" },
      { source: "app/layout.tsx", target: "app/dashboard/page.tsx" },
      { source: "app/dashboard/page.tsx", target: "components/Chart.tsx" },
      { source: "app/dashboard/page.tsx", target: "lib/auth.ts" },
      { source: "lib/auth.ts", target: "lib/db.ts" },
      { source: "components/Chart.tsx", target: "lib/db.ts" }
    ]
  }
};

export interface BlastAnalysis {
  upstream: Set<string>;
  downstream: Set<string>;
  riskLevel: "SAFE" | "WARNING" | "CRITICAL";
  riskScore: number;
}

export function computeBlastRadius(repo: RepositoryData, targetId: string): BlastAnalysis {
  // Transitive Upstream Reach (Reverse-BFS)
  const upstream = new Set<string>();
  const queue = [targetId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    repo.edges.forEach((e) => {
      if (e.target === curr && !upstream.has(e.source)) {
        upstream.add(e.source);
        queue.push(e.source);
      }
    });
  }

  // Transitive Downstream Dependencies
  const downstream = new Set<string>();
  const dQueue = [targetId];
  while (dQueue.length > 0) {
    const curr = dQueue.shift()!;
    repo.edges.forEach((e) => {
      if (e.source === curr && !downstream.has(e.target)) {
        downstream.add(e.target);
        dQueue.push(e.target);
      }
    });
  }

  const targetNode = repo.nodes.find((n) => n.id === targetId);
  const isMiddleware = targetNode?.kind === "MIDDLEWARE";

  let riskLevel: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";
  let riskScore = 15;

  if (isMiddleware || upstream.size >= 4) {
    riskLevel = "CRITICAL";
    riskScore = Math.min(100, 75 + upstream.size * 5);
  } else if (upstream.size >= 2) {
    riskLevel = "WARNING";
    riskScore = 40 + upstream.size * 10;
  }

  return { upstream, downstream, riskLevel, riskScore };
}
