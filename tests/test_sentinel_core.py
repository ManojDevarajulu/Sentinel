import os
import shutil
import tempfile
import unittest

from src.ast_extractor import ASTExtractor
from src.graph_engine import GraphEngine
from src.types import EdgeKind, NodeKind
from src.viewer_generator import ViewerGenerator


class TestSentinelCore(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="sentinel_test_")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_python_ast_extraction(self):
        # Create synthetic python project
        os.makedirs(os.path.join(self.test_dir, "pkg"), exist_ok=True)

        models_path = os.path.join(self.test_dir, "pkg", "models.py")
        with open(models_path, "w") as f:
            f.write("class User:\n    pass\n\nclass Order:\n    pass\n")

        service_path = os.path.join(self.test_dir, "pkg", "service.py")
        with open(service_path, "w") as f:
            f.write("from .models import User, Order\nimport os\n\ndef process_order():\n    return True\n")

        entry_path = os.path.join(self.test_dir, "main.py")
        with open(entry_path, "w") as f:
            f.write("from pkg.service import process_order\n\nif __name__ == '__main__':\n    process_order()\n")

        extractor = ASTExtractor(self.test_dir)
        nodes, edges = extractor.scan_repo()

        self.assertEqual(len(nodes), 3)
        self.assertIn("pkg/models.py", nodes)
        self.assertIn("pkg/service.py", nodes)
        self.assertIn("main.py", nodes)

        self.assertEqual(nodes["pkg/models.py"].kind, NodeKind.MODEL)
        self.assertEqual(nodes["pkg/service.py"].kind, NodeKind.SERVICE)
        self.assertEqual(nodes["main.py"].kind, NodeKind.ENTRYPOINT)

        # Edges verification: main.py -> pkg/service.py -> pkg/models.py
        edge_pairs = [(e.source, e.target) for e in edges]
        self.assertIn(("main.py", "pkg/service.py"), edge_pairs)
        self.assertIn(("pkg/service.py", "pkg/models.py"), edge_pairs)

    def test_javascript_typescript_ast_and_aliases(self):
        # Create synthetic Next.js-like typescript project with tsconfig aliases
        src_dir = os.path.join(self.test_dir, "src")
        comp_dir = os.path.join(src_dir, "components")
        os.makedirs(comp_dir, exist_ok=True)

        tsconfig_path = os.path.join(self.test_dir, "tsconfig.json")
        with open(tsconfig_path, "w") as f:
            f.write('{\n  "compilerOptions": {\n    "paths": {\n      "@/*": ["src/*"]\n    }\n  }\n}\n')

        btn_path = os.path.join(comp_dir, "Button.tsx")
        with open(btn_path, "w") as f:
            f.write('export function Button() { return <button>Click</button>; }\n')

        page_path = os.path.join(src_dir, "layout.tsx")
        with open(page_path, "w") as f:
            f.write('// Commented import should be ignored: import { Fake } from "./fake";\nimport { Button } from "@/components/Button";\n')

        extractor = ASTExtractor(self.test_dir)
        nodes, edges = extractor.scan_repo()

        self.assertIn("src/components/Button.tsx", nodes)
        self.assertIn("src/layout.tsx", nodes)
        self.assertEqual(nodes["src/layout.tsx"].kind, NodeKind.LAYOUT)

        edge_pairs = [(e.source, e.target) for e in edges]
        self.assertIn(("src/layout.tsx", "src/components/Button.tsx"), edge_pairs)

    def test_blast_radius_reverse_reachability_and_critical_path(self):
        # Create multi-hop dependency chain:
        # A (util) <- B (service) <- C (middleware) <- D (entrypoint)
        # Upstream of A should be B, C, D
        os.makedirs(os.path.join(self.test_dir, "src"), exist_ok=True)

        with open(os.path.join(self.test_dir, "src", "util.py"), "w") as f:
            f.write("def helper(): pass\n")

        with open(os.path.join(self.test_dir, "src", "service.py"), "w") as f:
            f.write("from src.util import helper\n")

        with open(os.path.join(self.test_dir, "src", "middleware.py"), "w") as f:
            f.write("from src.service import helper\n")

        with open(os.path.join(self.test_dir, "main.py"), "w") as f:
            f.write("from src.middleware import helper\n")

        extractor = ASTExtractor(self.test_dir)
        nodes, edges = extractor.scan_repo()
        engine = GraphEngine(nodes, edges)

        report = engine.compute_blast_radius(["src/util.py"])

        self.assertEqual(report.blast_radius_count, 4)  # util.py + 3 upstream
        self.assertEqual(report.risk_level, "CRITICAL")  # Hits middleware & entrypoint
        self.assertGreaterEqual(report.risk_score, 70)
        self.assertIn("src/middleware.py", report.affected_nodes)
        self.assertIn("main.py", report.affected_nodes)

        # Critical path should be traced
        self.assertTrue(len(report.critical_paths) > 0)
        first_path = report.critical_paths[0]
        self.assertEqual(first_path[0], "src/util.py")

    def test_circular_dependency_detection(self):
        # A imports B, B imports A
        with open(os.path.join(self.test_dir, "mod_a.py"), "w") as f:
            f.write("import mod_b\n")

        with open(os.path.join(self.test_dir, "mod_b.py"), "w") as f:
            f.write("import mod_a\n")

        extractor = ASTExtractor(self.test_dir)
        nodes, edges = extractor.scan_repo()
        engine = GraphEngine(nodes, edges)

        cycles = engine.find_circular_dependencies()
        self.assertTrue(len(cycles) > 0)

    def test_viewer_html_generation(self):
        with open(os.path.join(self.test_dir, "index.ts"), "w") as f:
            f.write("import './app';\n")
        with open(os.path.join(self.test_dir, "app.ts"), "w") as f:
            f.write("export const ready = true;\n")

        extractor = ASTExtractor(self.test_dir)
        nodes, edges = extractor.scan_repo()
        viewer = ViewerGenerator(nodes, edges, repo_name="TestApp")

        html = viewer.generate_html()
        self.assertIn("<!DOCTYPE html>", html)
        self.assertIn("TestApp Architecture", html)
        self.assertIn("<svg id=\"canvas-svg\">", html)
        self.assertIn("const DATA =", html)

    def test_cli_scan_json_and_out(self):
        with open(os.path.join(self.test_dir, "a.py"), "w") as f:
            f.write("import b\n")
        with open(os.path.join(self.test_dir, "b.py"), "w") as f:
            f.write("x = 1\n")

        from sentinel import run_scan
        out_file = os.path.join(self.test_dir, "graph.html")
        run_scan(self.test_dir, out_html=out_file, as_json=False, open_browser=False)
        self.assertTrue(os.path.exists(out_file))
        with open(out_file, encoding="utf-8") as f:
            content = f.read()
        self.assertIn("<!DOCTYPE html>", content)

    def test_large_repository_graph_and_bottlenecks(self):
        """Generates a 50-file synthetic repository and tests scalability and bottleneck identification."""
        os.makedirs(os.path.join(self.test_dir, "core"), exist_ok=True)
        os.makedirs(os.path.join(self.test_dir, "services"), exist_ok=True)
        os.makedirs(os.path.join(self.test_dir, "api"), exist_ok=True)

        # Core types file - should become top bottleneck
        with open(os.path.join(self.test_dir, "core", "types.py"), "w") as f:
            f.write("class BaseEntity:\n    pass\n")

        # Create 20 service modules all importing core/types.py
        for i in range(20):
            with open(os.path.join(self.test_dir, "services", f"service_{i}.py"), "w") as f:
                f.write(f"from core.types import BaseEntity\ndef execute_{i}(): pass\n")

        # Create 20 API route modules importing corresponding service
        for i in range(20):
            with open(os.path.join(self.test_dir, "api", f"route_{i}.py"), "w") as f:
                f.write(f"from services.service_{i} import execute_{i}\n")

        # Entrypoint importing all routes
        route_imports = "\n".join([f"from api.route_{i} import route_{i}" for i in range(10)])
        with open(os.path.join(self.test_dir, "server.py"), "w") as f:
            f.write(f"{route_imports}\ndef run_app(): pass\n")

        extractor = ASTExtractor(self.test_dir)
        nodes, edges = extractor.scan_repo()
        engine = GraphEngine(nodes, edges)

        self.assertGreaterEqual(len(nodes), 41)
        self.assertGreaterEqual(len(edges), 40)

        # Verify bottlenecks: core/types.py must have 20 incoming imports
        bottlenecks = engine.get_bottlenecks(top_n=3)
        self.assertTrue(len(bottlenecks) > 0)
        top_node, in_deg, role = bottlenecks[0]
        self.assertEqual(top_node, "core/types.py")
        self.assertEqual(in_deg, 20)
        self.assertEqual(role, NodeKind.MODEL)

        # Reverse BFS from core/types.py must reach services, routes, and server
        report = engine.compute_blast_radius(["core/types.py"])
        self.assertGreaterEqual(report.blast_radius_count, 30)
        self.assertEqual(report.risk_level, "CRITICAL")

    def test_custom_ignores_and_exports(self):
        # Create ignored folder
        os.makedirs(os.path.join(self.test_dir, "custom_fixtures"), exist_ok=True)
        with open(os.path.join(self.test_dir, "custom_fixtures", "mock.py"), "w") as f:
            f.write("x = 1\n")
        with open(os.path.join(self.test_dir, "main.py"), "w") as f:
            f.write("def run(): pass\n")

        extractor = ASTExtractor(self.test_dir, custom_ignores=["custom_fixtures"])
        nodes, edges = extractor.scan_repo()
        self.assertNotIn("custom_fixtures/mock.py", nodes)
        self.assertIn("main.py", nodes)

        engine = GraphEngine(nodes, edges)
        mermaid = engine.export_mermaid()
        dot = engine.export_dot()
        self.assertTrue(mermaid.startswith("graph TD;"))
        self.assertTrue(dot.startswith("digraph G {"))


if __name__ == "__main__":
    unittest.main()
