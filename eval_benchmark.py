import os
import time
from src.ast_extractor import ASTExtractor
from src.graph_engine import GraphEngine

def run_evaluation():
    print("=" * 60)
    print(" SENTINEL BENCHMARK & PERFORMANCE EVALUATION")
    print("=" * 60)

    # 1. Benchmark self-scan
    start = time.perf_counter()
    ext = ASTExtractor(".")
    nodes, edges = ext.scan_repo()
    engine = GraphEngine(nodes, edges)
    report = engine.compute_blast_radius(["src/types.py"])
    duration_ms = (time.perf_counter() - start) * 1000

    print(f"[Benchmark 1: 07-Sentinel]")
    print(f"  - Extracted:      {len(nodes)} files, {len(edges)} import edges")
    print(f"  - Blast Radius:   {report.blast_radius_count} upstream files ({report.risk_level})")
    print(f"  - Scan + BFS:     {duration_ms:.2f}ms")

    # 2. Benchmark 01-intake (if available)
    intake_path = "../01-intake"
    if os.path.isdir(intake_path):
        start = time.perf_counter()
        ext2 = ASTExtractor(intake_path)
        nodes2, edges2 = ext2.scan_repo()
        engine2 = GraphEngine(nodes2, edges2)
        report2 = engine2.compute_blast_radius(["src/schema.py"])
        duration2_ms = (time.perf_counter() - start) * 1000

        print(f"\n[Benchmark 2: 01-intake]")
        print(f"  - Extracted:      {len(nodes2)} files, {len(edges2)} import edges")
        print(f"  - Target:         src/schema.py -> {report2.blast_radius_count} upstream files ({report2.risk_level})")
        print(f"  - Critical Paths: {len(report2.critical_paths)} identified")
        print(f"  - Scan + BFS:     {duration2_ms:.2f}ms")

    # 3. Benchmark 03-ledger (if available)
    ledger_path = "../03-ledger"
    if os.path.isdir(ledger_path):
        start = time.perf_counter()
        ext3 = ASTExtractor(ledger_path)
        nodes3, edges3 = ext3.scan_repo()
        engine3 = GraphEngine(nodes3, edges3)
        duration3_ms = (time.perf_counter() - start) * 1000

        print(f"\n[Benchmark 3: 03-ledger]")
        print(f"  - Extracted:      {len(nodes3)} files, {len(edges3)} import edges")
        print(f"  - Scan + Graph:   {duration3_ms:.2f}ms")

    print("\n" + "=" * 60)
    print(" ALL BENCHMARKS COMPLETED (Latency Target: < 150ms per repository)")
    print("=" * 60)

if __name__ == "__main__":
    run_evaluation()
