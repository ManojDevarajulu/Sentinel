import argparse
import json
import os
import subprocess
import sys
import webbrowser
from typing import List

from src.ast_extractor import ASTExtractor
from src.graph_engine import GraphEngine
from src.viewer_generator import ViewerGenerator


def run_scan(repo_path: str, out_html: str = None, as_json: bool = False, open_browser: bool = False):
    extractor = ASTExtractor(repo_path)
    nodes, edges = extractor.scan_repo()
    engine = GraphEngine(nodes, edges)
    cycles = engine.find_circular_dependencies()

    repo_name = os.path.basename(os.path.abspath(repo_path))
    stats = {
        "repo_name": repo_name,
        "total_files": len(nodes),
        "total_dependencies": len(edges),
        "circular_dependency_cycles": len(cycles),
        "architectural_breakdown": {},
    }

    for n in nodes.values():
        k = n.kind.value
        stats["architectural_breakdown"][k] = stats["architectural_breakdown"].get(k, 0) + 1

    if as_json and not out_html:
        print(json.dumps(stats, indent=2))
        return

    print("\n" + "=" * 60)
    print(f" SENTINEL ARCHITECTURE SCAN: {repo_name}")
    print("=" * 60)
    print(f"Total Source Files:      {len(nodes)}")
    print(f"Resolved Import Edges:   {len(edges)}")
    print(f"Circular Dependencies:   {len(cycles)}")
    print("\nArchitectural Role Breakdown:")
    for kind, count in sorted(stats["architectural_breakdown"].items()):
        print(f"  - {kind:<15}: {count}")

    if cycles:
        print(f"\nWarning: Detected {len(cycles)} circular dependency chain(s):")
        for c in cycles[:3]:
            print(f"  [Cycle]: {' -> '.join(c)}")

    if out_html:
        viewer = ViewerGenerator(nodes, edges, repo_name=repo_name)
        html_content = viewer.generate_html(title=f"{repo_name} Code Architecture")
        with open(out_html, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"\n[Generated Interactive Visualizer]: {os.path.abspath(out_html)}")
        if open_browser:
            webbrowser.open(f"file://{os.path.abspath(out_html)}")


def run_blast_radius(
    repo_path: str,
    changed_files: List[str],
    out_html: str = None,
    as_json: bool = False,
    open_browser: bool = False,
):
    extractor = ASTExtractor(repo_path)
    nodes, edges = extractor.scan_repo()
    engine = GraphEngine(nodes, edges)

    report = engine.compute_blast_radius(changed_files)
    repo_name = os.path.basename(os.path.abspath(repo_path))

    if as_json and not out_html:
        print(json.dumps(report.to_dict(), indent=2))
        return

    print("\n" + "=" * 60)
    print(f" SENTINEL BLAST-RADIUS AUDIT: {repo_name}")
    print("=" * 60)
    print(f"Modified Files:          {len(report.changed_files)}")
    for cf in report.changed_files:
        print(f"  * {cf}")
    print(f"\nBlast Radius Count:      {report.blast_radius_count} upstream file(s)")
    print(f"Risk Assessment:         [{report.risk_level}] (Score: {report.risk_score}/100)")
    print(f"Executive Summary:       {report.summary}")

    if report.critical_paths:
        print("\nCritical Architectural Propagation Paths:")
        for path in report.critical_paths:
            print(f"  [Path]: {' -> '.join(path)}")

    if out_html:
        viewer = ViewerGenerator(nodes, edges, repo_name=repo_name)
        html_content = viewer.generate_html(report=report, title=f"Blast Radius ({report.risk_level}) — {repo_name}")
        with open(out_html, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"\n[Generated Interactive Visualizer]: {os.path.abspath(out_html)}")
        if open_browser:
            webbrowser.open(f"file://{os.path.abspath(out_html)}")


def run_git_diff(repo_path: str, base_ref: str, out_html: str = None, as_json: bool = False, open_browser: bool = False):
    try:
        diff_cmd = ["git", "-C", repo_path, "diff", "--name-only", base_ref, "HEAD"]
        res = subprocess.run(diff_cmd, capture_output=True, text=True, check=True)
        changed = [l.strip() for l in res.stdout.splitlines() if l.strip()]
    except Exception:
        # Fallback to unstaged git changes
        diff_cmd = ["git", "-C", repo_path, "diff", "--name-only"]
        res = subprocess.run(diff_cmd, capture_output=True, text=True)
        changed = [l.strip() for l in res.stdout.splitlines() if l.strip()]

    if not changed:
        print("No changed files detected between Git revisions.")
        return

    run_blast_radius(repo_path, changed, out_html, as_json, open_browser)


def main():
    parser = argparse.ArgumentParser(description="Sentinel: Codebase AST Visualizer & Blast-Radius Engine")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Scan command
    scan_p = subparsers.add_parser("scan", help="Scan repository and build dependency architecture")
    scan_p.add_argument("repo", nargs="?", default=".", help="Repository path (default: current directory)")
    scan_p.add_argument("--out", "-o", help="Path to write standalone interactive HTML visualizer")
    scan_p.add_argument("--json", action="store_true", help="Output raw JSON summary")
    scan_p.add_argument("--open", action="store_true", help="Open generated HTML in browser")

    # Blast-Radius command
    blast_p = subparsers.add_parser("blast-radius", help="Calculate blast radius of changed files")
    blast_p.add_argument("--changed", "-c", nargs="+", required=True, help="List of modified files")
    blast_p.add_argument("--repo", "-r", default=".", help="Repository path (default: .)")
    blast_p.add_argument("--out", "-o", help="Path to write standalone interactive HTML report")
    blast_p.add_argument("--json", action="store_true", help="Output raw JSON report")
    blast_p.add_argument("--open", action="store_true", help="Open report in browser")

    # Git Diff command
    git_p = subparsers.add_parser("git-diff", help="Calculate blast radius from active git diff")
    git_p.add_argument("--base", default="HEAD~1", help="Base git commit/branch (default: HEAD~1)")
    git_p.add_argument("--repo", "-r", default=".", help="Repository path (default: .)")
    git_p.add_argument("--out", "-o", help="Path to write HTML report")
    git_p.add_argument("--json", action="store_true", help="Output raw JSON report")
    git_p.add_argument("--open", action="store_true", help="Open report in browser")

    args = parser.parse_args()

    if args.command == "scan":
        run_scan(args.repo, args.out, args.json, args.open)
    elif args.command == "blast-radius":
        run_blast_radius(args.repo, args.changed, args.out, args.json, args.open)
    elif args.command == "git-diff":
        run_git_diff(args.repo, args.base, args.out, args.json, args.open)


if __name__ == "__main__":
    main()
