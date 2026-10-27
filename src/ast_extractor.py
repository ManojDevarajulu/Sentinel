import ast
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from src.types import CodeEdge, CodeNode, EdgeKind, NodeKind

SUPPORTED_EXTENSIONS = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
}

IGNORE_DIRS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    ".next",
    "dist",
    "build",
    "out",
    ".turbo",
    ".idea",
    ".vscode",
    "coverage",
}


def strip_js_comments(content: str) -> str:
    """Removes single-line and multi-line comments from JS/TS source code."""
    content = re.sub(r"/\*[\s\S]*?\*/", "", content)
    content = re.sub(r"//.*$", "", content, flags=re.MULTILINE)
    return content


class ASTExtractor:
    def __init__(self, repo_root: str):
        self.repo_root = os.path.abspath(repo_root)
        self.path_aliases = self._load_tsconfig_aliases()

    def _normalize(self, path: str) -> str:
        return path.replace("\\", "/").lstrip("./")

    def _load_tsconfig_aliases(self) -> Dict[str, str]:
        """Loads tsconfig.json or jsconfig.json path mappings if present."""
        aliases: Dict[str, str] = {}
        for config_name in ("tsconfig.json", "jsconfig.json"):
            cfg_path = os.path.join(self.repo_root, config_name)
            if os.path.isfile(cfg_path):
                try:
                    with open(cfg_path, "r", encoding="utf-8") as f:
                        raw = f.read()
                    # Strip json comments and trailing commas
                    raw_clean = re.sub(r"//.*$", "", raw, flags=re.MULTILINE)
                    raw_clean = re.sub(r"/\*[\s\S]*?\*/", "", raw_clean)
                    raw_clean = re.sub(r",(\s*[}\]])", r"\1", raw_clean)
                    data = json.loads(raw_clean)
                    paths = data.get("compilerOptions", {}).get("paths", {})
                    base_url = data.get("compilerOptions", {}).get("baseUrl", ".")
                    for alias, targets in paths.items():
                        if targets and isinstance(targets, list):
                            clean_alias = alias.rstrip("/*").rstrip("*")
                            clean_target = targets[0].rstrip("/*").rstrip("*")
                            target_resolved = os.path.normpath(
                                os.path.join(base_url, clean_target)
                            ).replace("\\", "/")
                            aliases[clean_alias] = target_resolved
                except Exception:
                    pass
        # Default Next.js alias fallback if none found
        if "@" not in aliases:
            if os.path.isdir(os.path.join(self.repo_root, "src")):
                aliases["@"] = "src"
            else:
                aliases["@"] = ""
        return aliases

    def classify_node(self, rel_path: str) -> NodeKind:
        parts = rel_path.lower().replace("\\", "/").split("/")
        name = parts[-1]

        if "middleware" in name:
            return NodeKind.MIDDLEWARE
        if name.startswith("layout."):
            return NodeKind.LAYOUT
        if name in ("main.py", "app.py", "run.py", "server.py", "index.ts", "index.js"):
            if len(parts) <= 2:
                return NodeKind.ENTRYPOINT
        if "test" in name or "test" in parts:
            return NodeKind.TEST
        if name.startswith("use") or "hook" in parts:
            return NodeKind.HOOK
        if "route" in name or "router" in name or "api" in parts:
            return NodeKind.ROUTER
        if "model" in name or "schema" in name or "models" in parts or "types" in parts:
            return NodeKind.MODEL
        if "service" in name or "client" in name or "services" in parts:
            return NodeKind.SERVICE
        if "config" in name or name.endswith(".config.js") or name.endswith(".config.ts"):
            return NodeKind.CONFIG
        if "component" in parts or name.endswith(".tsx") or name.endswith(".jsx"):
            return NodeKind.COMPONENT
        if "util" in name or "helper" in name or "lib" in parts or "utils" in parts:
            return NodeKind.UTIL

        return NodeKind.OTHER

    def scan_repo(self) -> Tuple[Dict[str, CodeNode], List[CodeEdge]]:
        all_file_paths: Set[str] = set()
        nodes: Dict[str, CodeNode] = {}
        raw_imports_map: Dict[str, List[Tuple[str, EdgeKind, List[str]]]] = {}

        # 1. Walk repository and locate supported files
        for root, dirs, files in os.walk(self.repo_root):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    full_path = os.path.join(root, file)
                    rel_path = self._normalize(os.path.relpath(full_path, self.repo_root))
                    all_file_paths.add(rel_path)

        # 2. Parse AST / imports for each file
        for rel_path in sorted(all_file_paths):
            full_path = os.path.join(self.repo_root, rel_path)
            ext = os.path.splitext(rel_path)[1].lower()
            lang = SUPPORTED_EXTENSIONS[ext]

            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except Exception:
                content = ""

            loc = len([l for l in content.splitlines() if l.strip()])
            kind = self.classify_node(rel_path)
            display_name = os.path.basename(rel_path)

            if lang == "python":
                imports, exports = self._extract_python(content, rel_path)
            else:
                imports, exports = self._extract_javascript(content)

            raw_import_specifiers = [imp[0] for imp in imports]
            raw_imports_map[rel_path] = imports

            nodes[rel_path] = CodeNode(
                id=rel_path,
                file_path=rel_path,
                language=lang,
                kind=kind,
                display_name=display_name,
                lines_of_code=loc,
                exports=exports,
                raw_imports=raw_import_specifiers,
            )

        # 3. Resolve imports to edges
        edges: List[CodeEdge] = []
        for source_path, import_specs in raw_imports_map.items():
            for target_spec, edge_kind, symbols in import_specs:
                resolved_target = self._resolve_target(source_path, target_spec, all_file_paths)
                if resolved_target and resolved_target in nodes and resolved_target != source_path:
                    edges.append(
                        CodeEdge(
                            source=source_path,
                            target=resolved_target,
                            edge_kind=edge_kind,
                            symbols=symbols,
                        )
                    )

        # 4. Calculate node degrees
        for edge in edges:
            nodes[edge.source].out_degree += 1
            nodes[edge.target].in_degree += 1

        # 5. Compute architectural importance score (0 to 100)
        for node in nodes.values():
            kind_base = {
                NodeKind.ENTRYPOINT: 85,
                NodeKind.MIDDLEWARE: 90,
                NodeKind.LAYOUT: 80,
                NodeKind.ROUTER: 70,
                NodeKind.MODEL: 65,
                NodeKind.SERVICE: 60,
                NodeKind.COMPONENT: 45,
                NodeKind.HOOK: 40,
                NodeKind.UTIL: 35,
                NodeKind.CONFIG: 30,
                NodeKind.TEST: 15,
                NodeKind.OTHER: 20,
            }.get(node.kind, 20)
            node.importance_score = min(100, kind_base + (node.in_degree * 5))

        return nodes, edges

    def _extract_python(self, content: str, rel_path: str) -> Tuple[List[Tuple[str, EdgeKind, List[str]]], List[str]]:
        imports: List[Tuple[str, EdgeKind, List[str]]] = []
        exports: List[str] = []

        try:
            tree = ast.parse(content)
        except SyntaxError:
            # Fallback regex if syntax error (e.g. invalid file version)
            for m in re.finditer(r"^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))", content, re.MULTILINE):
                mod = m.group(1) or m.group(2)
                if mod:
                    imports.append((mod, EdgeKind.STATIC_IMPORT, []))
            return imports, exports

        source_dir = os.path.dirname(rel_path).replace("\\", "/")

        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append((alias.name, EdgeKind.STATIC_IMPORT, [alias.asname or alias.name]))
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                symbols = [a.name for a in node.names]
                if node.level > 0:
                    # Relative import in python (e.g. from .models import X)
                    levels = node.level - 1
                    dir_parts = [p for p in source_dir.split("/") if p]
                    base_parts = dir_parts[: len(dir_parts) - levels] if levels <= len(dir_parts) else []
                    rel_base = "/".join(base_parts)
                    target_path = f"{rel_base}/{module}".strip("/") if rel_base else module
                    imports.append((target_path, EdgeKind.STATIC_IMPORT, symbols))
                else:
                    imports.append((module, EdgeKind.STATIC_IMPORT, symbols))
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                exports.append(node.name)

        return imports, exports

    def _extract_javascript(self, content: str) -> Tuple[List[Tuple[str, EdgeKind, List[str]]], List[str]]:
        imports: List[Tuple[str, EdgeKind, List[str]]] = []
        exports: List[str] = []

        clean = strip_js_comments(content)

        # 1. Static ESM imports: import ... from 'spec' OR import 'spec'
        esm_pattern = re.compile(
            r"""import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]""",
            re.MULTILINE,
        )
        for m in esm_pattern.finditer(clean):
            clause = m.group(0)
            spec = m.group(1)
            edge_kind = EdgeKind.TYPE_IMPORT if "import type" in clause else EdgeKind.STATIC_IMPORT
            symbols = [s.strip() for s in re.findall(r"[\w$]+", clause.split("from")[0]) if s.strip() and s != "import" and s != "type"]
            imports.append((spec, edge_kind, symbols))

        # 2. Export ... from 'spec'
        export_from_pattern = re.compile(
            r"""export\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]""",
            re.MULTILINE,
        )
        for m in export_from_pattern.finditer(clean):
            spec = m.group(1)
            imports.append((spec, EdgeKind.RE_EXPORT, []))

        # 3. Dynamic import(...) and require(...)
        dynamic_pattern = re.compile(
            r"""(?:\bimport\s*\(|\brequire\s*\()\s*['"]([^'"]+)['"]\s*\)""",
            re.MULTILINE,
        )
        for m in dynamic_pattern.finditer(clean):
            spec = m.group(1)
            imports.append((spec, EdgeKind.DYNAMIC_IMPORT, []))

        # 4. Top-level exports
        for m in re.finditer(r"export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([\w$]+)", clean):
            exports.append(m.group(1))

        return imports, exports

    def _resolve_target(self, source_path: str, spec: str, all_files: Set[str]) -> Optional[str]:
        # Handle tsconfig aliases (e.g. @/components/Button -> src/components/Button)
        for alias, target_dir in self.path_aliases.items():
            if spec == alias or spec.startswith(f"{alias}/"):
                sub_path = spec[len(alias) :].lstrip("/")
                resolved_base = f"{target_dir}/{sub_path}".strip("/").replace("\\", "/")
                found = self._match_extension(resolved_base, all_files)
                if found:
                    return found

        # Relative paths
        if spec.startswith("."):
            source_dir = os.path.dirname(source_path)
            candidate = os.path.normpath(os.path.join(source_dir, spec)).replace("\\", "/")
            return self._match_extension(candidate, all_files)

        # Python dot notation (e.g. src.models.user or models.user)
        dot_as_path = spec.replace(".", "/")
        found = self._match_extension(dot_as_path, all_files)
        if found:
            return found

        # Check from repository root directly
        return self._match_extension(spec, all_files)

    def _match_extension(self, base_path: str, all_files: Set[str]) -> Optional[str]:
        clean = base_path.lstrip("./")

        # Direct exact match
        if clean in all_files:
            return clean

        # Try supported extensions
        for ext in (".ts", ".tsx", ".js", ".jsx", ".py", ".mjs"):
            cand = f"{clean}{ext}"
            if cand in all_files:
                return cand

        # Try directory index files
        for index in ("/index.ts", "/index.tsx", "/index.js", "/index.jsx", "/__init__.py"):
            cand = f"{clean}{index}".replace("//", "/")
            if cand in all_files:
                return cand

        return None
