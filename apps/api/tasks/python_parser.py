import os
import ast
import json
import sys
import time

def parse_python_file(filepath, base_path):
    """Parse a single Python file to extract imports and defined names."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            tree = ast.parse(content)
    except Exception as e:
        return None

    rel_path = os.path.relpath(filepath, base_path).replace("\\", "/")
    
    imports = []
    exports = []
    
    node_type = "other"
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.append(node.module)
        elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
            exports.append(node.name)
            for decorator in node.decorator_list:
                if isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Attribute):
                    if decorator.func.attr in ['get', 'post', 'put', 'delete', 'patch']:
                        node_type = "api_route"
        elif isinstance(node, ast.ClassDef):
            exports.append(node.name)

    display_name = os.path.basename(filepath)
    
    if "models" in display_name or "db" in display_name:
        node_type = "supabase_client"
    elif "utils" in display_name or "helper" in display_name:
        node_type = "util"
        
    return {
        "id": rel_path,
        "filePath": rel_path,
        "nodeType": node_type,
        "displayName": display_name,
        "importanceScore": 10,
        "exports": list(set(exports)),
        "imports": list(set(imports))
    }

def build_graph(repo_path):
    start_time = time.time()
    nodes = []
    edges = []
    
    # Track module path to file path mappings for edge resolution
    module_map = {}

    # Find all Python files
    for root, dirs, files in os.walk(repo_path):
        # Exclude common virtualenv and cache dirs
        dirs[:] = [d for d in dirs if d not in ['venv', 'env', '.venv', '__pycache__', '.git']]
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                node_data = parse_python_file(filepath, repo_path)
                if node_data:
                    nodes.append(node_data)
                    # Create module name map (e.g., apps.api.tasks -> apps/api/tasks.py)
                    module_name = node_data["id"].replace("/", ".").replace(".py", "")
                    if module_name.endswith(".__init__"):
                        module_name = module_name[:-9]
                    module_map[module_name] = node_data["id"]

    # Build edges
    for node in nodes:
        for imp in node["imports"]:
            # Try to resolve import to a local file
            target_id = None
            # Exact module match
            if imp in module_map:
                target_id = module_map[imp]
            else:
                # Partial match (e.g., from apps.api import config)
                for mod_name in module_map.keys():
                    if imp.startswith(mod_name):
                        target_id = module_map[mod_name]
                        break
            
            if target_id and target_id != node["id"]:
                edges.append({
                    "id": f"e_{node['id']}_{target_id}",
                    "source": node["id"],
                    "target": target_id,
                    "type": "import",
                    "edgeType": "import",
                    "weight": 1
                })

    duration_ms = int((time.time() - start_time) * 1000)

    # Calculate importance score based on incoming edges
    for node in nodes:
        incoming = sum(1 for e in edges if e["target"] == node["id"])
        node["importanceScore"] = 10 + (incoming * 5)

    return {
        "repository": os.path.abspath(repo_path),
        "meta": {
            "nodeCount": len(nodes),
            "edgeCount": len(edges),
            "durationMs": duration_ms
        },
        "nodes": nodes,
        "edges": edges
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python python_parser.py <repo_path>")
        sys.exit(1)
        
    repo_path = sys.argv[1]
    result = build_graph(repo_path)
    print(json.dumps(result, indent=2))
