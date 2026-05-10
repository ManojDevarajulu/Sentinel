"""
Universal source code parser — pure Python, no external dependencies.
Handles Python, TypeScript, JavaScript, JSX, TSX files.
Extracts file nodes, classifies them, and resolves import edges.
"""
import json
import os
import re
import sys

# File extensions to scan
SOURCE_EXTENSIONS = {'.py', '.ts', '.tsx', '.js', '.jsx'}

# Directories to skip
SKIP_DIRS = {'node_modules', '.git', '__pycache__', '.next', 'dist', 'build', '.turbo', 'coverage', '.cache', 'venv', '.venv'}

# --- Node Type Classification ---

def classify_node(file_path: str) -> str:
    """Classify a file into a node type based on its path and name."""
    parts = file_path.replace("\\", "/").lower()
    name = os.path.basename(parts)

    # Next.js / React patterns
    if "middleware" in name:
        return "middleware"
    if name in ("layout.tsx", "layout.jsx", "layout.ts", "layout.js"):
        return "layout"
    if name in ("page.tsx", "page.jsx", "page.ts", "page.js"):
        return "page"
    if "/api/" in parts or "api/" in parts:
        return "api_route"
    if "hook" in name or name.startswith("use"):
        return "hook"
    if "supabase" in name or "client.ts" in name:
        return "supabase_client"
    if "/components/" in parts or "/component/" in parts:
        return "component"
    if "/utils/" in parts or "/lib/" in parts or "/helpers/" in parts:
        return "util"
    if "/pages/" in parts or "/app/" in parts:
        return "page"
    
    # Python patterns
    if parts.endswith(".py"):
        if "test" in name:
            return "other"
        if name == "__init__.py":
            return "util"
        if "route" in name or "view" in name or "endpoint" in name:
            return "api_route"
        if "model" in name:
            return "component"
        if "util" in name or "helper" in name:
            return "util"
        return "component"
    
    return "component"


def compute_importance(node_type: str, num_importers: int) -> int:
    """Compute importance score based on type and how many files import this one."""
    base = {
        "middleware": 90, "layout": 80, "api_route": 60, "hook": 55,
        "supabase_client": 50, "page": 40, "component": 30, "util": 25, "other": 10,
    }.get(node_type, 10)
    return min(100, base + num_importers * 5)


# --- Import Extraction ---

# Python: import X / from X import Y
PY_IMPORT_RE = re.compile(r'^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))', re.MULTILINE)

# JS/TS: import ... from 'path' / require('path') / import('path')
JS_IMPORT_RE = re.compile(
    r"""(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]"""
    r"""|import\s*\(\s*['"]([^'"]+)['"]\s*\)"""
    r"""|require\s*\(\s*['"]([^'"]+)['"]\s*\))""",
    re.MULTILINE
)


def extract_imports_py(content: str) -> list[str]:
    """Extract import targets from Python source."""
    imports = []
    for m in PY_IMPORT_RE.finditer(content):
        mod = m.group(1) or m.group(2)
        if mod:
            imports.append(mod)
    return imports


def extract_imports_js(content: str) -> list[str]:
    """Extract import paths from JS/TS source."""
    imports = []
    for m in JS_IMPORT_RE.finditer(content):
        path = m.group(1) or m.group(2) or m.group(3)
        if path:
            imports.append(path)
    return imports


def resolve_import_to_file(imp: str, source_file: str, all_files: set[str], repo_path: str) -> str | None:
    """Try to resolve an import string to an actual file in the repo."""
    # Skip external packages
    if not imp.startswith('.') and not imp.startswith('/') and not imp.startswith('@/'):
        return None

    source_dir = os.path.dirname(source_file)
    
    # Handle @/ alias (common in Next.js → src/)
    if imp.startswith('@/'):
        imp = imp[2:]  # strip @/
        source_dir = ""  # resolve from repo root or src/
        candidates_base = [imp, f"src/{imp}"]
    else:
        # Relative import
        resolved = os.path.normpath(os.path.join(source_dir, imp)).replace("\\", "/")
        candidates_base = [resolved]

    # Try various extensions and index files
    for base in candidates_base:
        for suffix in ['', '.ts', '.tsx', '.js', '.jsx', '.py', '/index.ts', '/index.tsx', '/index.js', '/index.jsx']:
            candidate = (base + suffix).replace("\\", "/").lstrip("./")
            if candidate in all_files:
                return candidate
    
    return None


# --- Main Graph Builder ---

def build_graph(repo_path: str) -> dict:
    """Walk the repo and build a dependency graph."""
    nodes = []
    file_imports: dict[str, list[str]] = {}  # file_path -> [raw imports]
    all_files: set[str] = set()

    # Phase 1: Walk all source files
    for root, dirs, files in os.walk(repo_path):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext not in SOURCE_EXTENSIONS:
                continue
            
            abs_path = os.path.join(root, file)
            rel_path = os.path.relpath(abs_path, repo_path).replace("\\", "/")
            all_files.add(rel_path)

            try:
                with open(abs_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue

            node_type = classify_node(rel_path)
            
            # Extract imports
            if ext == '.py':
                raw_imports = extract_imports_py(content)
            else:
                raw_imports = extract_imports_js(content)
            
            file_imports[rel_path] = raw_imports

            # Extract exports (simplified)
            exports = []
            if ext == '.py':
                for m in re.finditer(r'^(?:def|class)\s+(\w+)', content, re.MULTILINE):
                    exports.append(m.group(1))
            else:
                for m in re.finditer(r'export\s+(?:default\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)', content, re.MULTILINE):
                    exports.append(m.group(1))

            nodes.append({
                "id": rel_path,
                "file_path": rel_path,
                "display_name": file,
                "node_type": node_type,
                "importance_score": 0,  # computed after edges
                "exports": exports,
                "imports": raw_imports,
            })

    # Phase 2: Resolve imports to edges
    edges = []
    import_count: dict[str, int] = {}  # how many files import each file

    for source_file, raw_imports in file_imports.items():
        for imp in raw_imports:
            target = resolve_import_to_file(imp, source_file, all_files, repo_path)
            if target and target != source_file:
                edges.append({
                    "source": source_file,
                    "target": target,
                    "type": "import",
                    "weight": 1,
                })
                import_count[target] = import_count.get(target, 0) + 1

    # Phase 3: Compute importance scores
    for node in nodes:
        fp = node["file_path"]
        node["importance_score"] = compute_importance(
            node["node_type"], import_count.get(fp, 0)
        )

    return {"nodes": nodes, "edges": edges}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: universal_parser.py <repo_path>", file=sys.stderr)
        sys.exit(1)

    graph = build_graph(sys.argv[1])
    print(json.dumps(graph))
