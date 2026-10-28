import argparse
import json
import os
import subprocess
import sys
import urllib.parse
import webbrowser
from typing import List, Optional

from src.ast_extractor import ASTExtractor
from src.graph_engine import GraphEngine
from src.viewer_generator import ViewerGenerator

__version__ = "1.0.0"


def run_scan(
    repo_path: str,
    out_html: Optional[str] = None,
    as_json: bool = False,
    open_browser: bool = False,
    custom_ignores: Optional[List[str]] = None,
):
    extractor = ASTExtractor(repo_path, custom_ignores=custom_ignores)
    nodes, edges = extractor.scan_repo()
    engine = GraphEngine(nodes, edges)
    cycles = engine.find_circular_dependencies()
    bottlenecks = engine.get_bottlenecks(top_n=5)

    repo_name = os.path.basename(os.path.abspath(repo_path))
    if repo_name.startswith("07-") or repo_name == "07-Sentinel":
        repo_name = "Sentinel"

    stats = {
        "repo_name": repo_name,
        "total_files": len(nodes),
        "total_dependencies": len(edges),
        "circular_dependency_cycles": len(cycles),
        "architectural_breakdown": {},
        "top_bottlenecks": [{"file": b[0], "in_degree": b[1], "role": b[2].value} for b in bottlenecks],
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

    if bottlenecks:
        print("\nTop Architectural Bottlenecks (Single Points of Failure):")
        for file_id, in_deg, role in bottlenecks:
            print(f"  * {file_id:<32} (Imported by {in_deg} files) [{role.value}]")

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
    out_html: Optional[str] = None,
    as_json: bool = False,
    open_browser: bool = False,
    depth_limit: int = 6,
    custom_ignores: Optional[List[str]] = None,
):
    extractor = ASTExtractor(repo_path, custom_ignores=custom_ignores)
    nodes, edges = extractor.scan_repo()
    engine = GraphEngine(nodes, edges)

    report = engine.compute_blast_radius(changed_files, depth_limit=depth_limit)
    repo_name = os.path.basename(os.path.abspath(repo_path))
    if repo_name.startswith("07-") or repo_name == "07-Sentinel":
        repo_name = "Sentinel"

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


def run_git_diff(
    repo_path: str,
    base_ref: str,
    out_html: Optional[str] = None,
    as_json: bool = False,
    open_browser: bool = False,
    depth_limit: int = 6,
    custom_ignores: Optional[List[str]] = None,
):
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

    run_blast_radius(
        repo_path=repo_path,
        changed_files=changed,
        out_html=out_html,
        as_json=as_json,
        open_browser=open_browser,
        depth_limit=depth_limit,
        custom_ignores=custom_ignores,
    )


def run_serve(
    repo_path: str = ".",
    port: int = 7331,
    open_browser: bool = True,
    custom_ignores: Optional[List[str]] = None,
):
    """Spins up a lightweight local HTTP server and opens the interactive visualizer in the default browser.

    Includes zero-cloud API endpoints:
      - GET /              -> Standalone Interactive Visualizer
      - GET /api/scan      -> Real-time JSON architectural scan
      - GET /api/blast     -> Real-time Blast Radius calculation (?file=path)
      - GET /health        -> Server status
    """
    import http.server
    import socketserver

    extractor = ASTExtractor(repo_path, custom_ignores=custom_ignores)
    nodes, edges = extractor.scan_repo()
    repo_name = os.path.basename(os.path.abspath(repo_path))
    if repo_name.startswith("07-") or repo_name == "07-Sentinel":
        repo_name = "Sentinel"

    class SentinelRequestHandler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            query = urllib.parse.parse_qs(parsed.query)

            if path == "/health":
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                res = json.dumps({"status": "ok", "repo": repo_name, "files": len(nodes), "version": __version__})
                self.wfile.write(res.encode("utf-8"))
                return

            if path == "/api/scan":
                fresh_nodes, fresh_edges = extractor.scan_repo()
                fresh_engine = GraphEngine(fresh_nodes, fresh_edges)
                fresh_bottlenecks = fresh_engine.get_bottlenecks(top_n=5)
                res = {
                    "repo_name": repo_name,
                    "total_files": len(fresh_nodes),
                    "total_dependencies": len(fresh_edges),
                    "bottlenecks": [{"file": b[0], "in_degree": b[1], "role": b[2].value} for b in fresh_bottlenecks],
                    "nodes": [n.to_dict() for n in fresh_nodes.values()],
                    "edges": [e.to_dict() for e in fresh_edges],
                }
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
                return

            if path == "/api/blast":
                file_arg = query.get("file", [""])[0]
                if not file_arg:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b'{"error": "Missing file parameter"}')
                    return
                fresh_nodes, fresh_edges = extractor.scan_repo()
                fresh_engine = GraphEngine(fresh_nodes, fresh_edges)
                blast_report = fresh_engine.compute_blast_radius([file_arg])
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(blast_report.to_dict()).encode("utf-8"))
                return

            # Default: Serve Archify-grade interactive HTML visualizer
            # If repository root contains index.html, serve full portal; otherwise generate standalone viewer
            index_file = os.path.join(repo_path, "index.html")
            if os.path.isfile(index_file):
                with open(index_file, "r", encoding="utf-8") as f:
                    html_content = f.read()
            else:
                viewer = ViewerGenerator(nodes, edges, repo_name=repo_name)
                html_content = viewer.generate_html(title=f"{repo_name} Code Architecture")
            html_bytes = html_content.encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html_bytes)))
            self.end_headers()
            self.wfile.write(html_bytes)

        def log_message(self, format, *args):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    actual_port = port
    httpd = None
    for p in range(port, port + 20):
        try:
            httpd = socketserver.TCPServer(("", p), SentinelRequestHandler)
            actual_port = p
            break
        except OSError:
            continue

    if httpd is None:
        print(f"Error: Could not bind to any port in range {port}-{port+20}")
        return

    url = f"http://localhost:{actual_port}"
    print("\n" + "=" * 60)
    print(" SENTINEL LOCAL ARCHITECTURE SERVER (Zero Auth / Zero Cloud)")
    print("=" * 60)
    print(f"Repository:   {repo_name}")
    print(f"Files:        {len(nodes)}")
    print(f"Dependencies: {len(edges)}")
    print(f"Server URL:   {url}")
    print("API Endpoints:")
    print(f"  * Canvas Visualizer: {url}/")
    print(f"  * JSON Live Scan:    {url}/api/scan")
    print(f"  * Blast Radius API:  {url}/api/blast?file=<path>")
    print("Status:       Active (No login required - Graphify/Archify mode)")
    print("[Press Ctrl+C to stop server]")
    print("=" * 60 + "\n")

    if open_browser:
        webbrowser.open(url)

    try:
        with httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nSentinel server stopped.")


def main():
    parser = argparse.ArgumentParser(
        description="Sentinel: Codebase AST Visualizer & Blast-Radius Engine",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--version", "-v", action="version", version=f"Sentinel {__version__} (Zero-Cloud Codebase Intelligence)")
    subparsers = parser.add_subparsers(dest="command")

    # Scan command
    scan_p = subparsers.add_parser("scan", help="Scan repository and build dependency architecture")
    scan_p.add_argument("repo", nargs="?", default=".", help="Repository path (default: current directory)")
    scan_p.add_argument("--out", "-o", help="Path to write standalone interactive HTML visualizer")
    scan_p.add_argument("--json", action="store_true", help="Output raw JSON summary")
    scan_p.add_argument("--open", action="store_true", help="Open generated HTML in browser")
    scan_p.add_argument("--ignore", "-i", nargs="+", help="Custom directory names to ignore")

    # Serve command (Graphify / Archify mode)
    serve_p = subparsers.add_parser("serve", help="Start local interactive visualizer in browser (like Archify/Graphify)")
    serve_p.add_argument("repo", nargs="?", default=".", help="Repository path (default: current directory)")
    serve_p.add_argument("--port", "-p", type=int, default=7331, help="Port to serve on (default: 7331)")
    serve_p.add_argument("--no-browser", action="store_true", help="Do not automatically open browser")
    serve_p.add_argument("--ignore", "-i", nargs="+", help="Custom directory names to ignore")

    # Blast-Radius command
    blast_p = subparsers.add_parser("blast-radius", help="Calculate blast radius of changed files")
    blast_p.add_argument("--changed", "-c", nargs="+", required=True, help="List of modified files")
    blast_p.add_argument("--repo", "-r", default=".", help="Repository path (default: .)")
    blast_p.add_argument("--out", "-o", help="Path to write standalone interactive HTML report")
    blast_p.add_argument("--json", action="store_true", help="Output raw JSON report")
    blast_p.add_argument("--open", action="store_true", help="Open report in browser")
    blast_p.add_argument("--depth", "-d", type=int, default=6, help="Maximum reverse BFS traversal depth")
    blast_p.add_argument("--ignore", "-i", nargs="+", help="Custom directory names to ignore")

    # Git Diff command
    git_p = subparsers.add_parser("git-diff", help="Calculate blast radius from active git diff")
    git_p.add_argument("--base", default="HEAD~1", help="Base git commit/branch (default: HEAD~1)")
    git_p.add_argument("--repo", "-r", default=".", help="Repository path (default: .)")
    git_p.add_argument("--out", "-o", help="Path to write HTML report")
    git_p.add_argument("--json", action="store_true", help="Output raw JSON report")
    git_p.add_argument("--open", action="store_true", help="Open report in browser")
    git_p.add_argument("--depth", "-d", type=int, default=6, help="Maximum reverse BFS traversal depth")
    git_p.add_argument("--ignore", "-i", nargs="+", help="Custom directory names to ignore")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if args.command == "scan":
        run_scan(args.repo, args.out, args.json, args.open, custom_ignores=args.ignore)
    elif args.command == "serve":
        run_serve(args.repo, args.port, open_browser=not args.no_browser, custom_ignores=args.ignore)
    elif args.command == "blast-radius":
        run_blast_radius(
            args.repo,
            args.changed,
            args.out,
            args.json,
            args.open,
            depth_limit=args.depth,
            custom_ignores=args.ignore,
        )
    elif args.command == "git-diff":
        run_git_diff(
            args.repo,
            args.base,
            args.out,
            args.json,
            args.open,
            depth_limit=args.depth,
            custom_ignores=args.ignore,
        )


if __name__ == "__main__":
    main()
