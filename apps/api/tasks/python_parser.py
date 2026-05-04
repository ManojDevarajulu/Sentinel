import ast
import json
import os
import sys

def build_graph(repo_path):
    nodes = []
    edges = []
    
    for root, _, files in os.walk(repo_path):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.relpath(os.path.join(root, file), repo_path)
                try:
                    with open(os.path.join(root, file), 'r') as f:
                        tree = ast.parse(f.read())
                        
                    node_id = file_path
                    nodes.append({
                        "id": node_id,
                        "file_path": file_path,
                        "display_name": file,
                        "type": "module"
                    })
                    
                    for node in ast.walk(tree):
                        if isinstance(node, (ast.Import, ast.ImportFrom)):
                            # Handle imports (simplified for MVP)
                            edges.append({
                                "source": node_id,
                                "target": "dependency", # Logic to resolve path would go here
                                "type": "import"
                            })
                except Exception as e:
                    print(f"Error parsing {file_path}: {e}", file=sys.stderr)
                    
    return {"nodes": nodes, "edges": edges}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python_parser.py <repo_path>")
        sys.exit(1)
    
    graph = build_graph(sys.argv[1])
    print(json.dumps(graph))
