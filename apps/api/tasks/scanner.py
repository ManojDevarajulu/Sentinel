import subprocess
import json
import os
from pathlib import Path
from celery import shared_task
from db import get_db
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def run_repo_scan(self, job_id: str, repo_id: str, repo_path: str):
    db = get_db()
    
    try:
        # Update job status to in_progress
        db.table("scan_jobs").update({"status": "in_progress"}).eq("id", job_id).execute()
        
        # Determine the absolute path to the bun script
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Determine language
        py_files = list(Path(repo_path).rglob("*.py"))
        ts_files = list(Path(repo_path).rglob("*.ts")) + list(Path(repo_path).rglob("*.js"))
        
        if len(py_files) > len(ts_files):
            # Python routing
            parser_path = os.path.normpath(os.path.join(current_dir, "python_parser.py"))
            logger.info(f"Running python parser for {repo_path}")
            result = subprocess.run(
                ["python", parser_path, repo_path],
                capture_output=True,
                text=True,
                check=True
            )
        else:
            # JS/TS routing
            parser_path = os.path.normpath(os.path.join(current_dir, "../../..", "packages", "parser", "src", "index.ts"))
            logger.info(f"Running bun parser for {repo_path}")
            result = subprocess.run(
                ["bun", "run", parser_path, repo_path],
                capture_output=True,
                text=True,
                check=True
            )
        
        # Parse JSON output
        graph_data = json.loads(result.stdout)
        
        nodes_to_insert = []
        for node in graph_data.get("nodes", []):
            nodes_to_insert.append({
                "repo_id": repo_id,
                "file_path": node["id"],
                "node_type": node.get("type", "unknown"),
                "exports": node.get("exports", []),
                "imports": node.get("imports", [])
            })
            
        # Optimization: Insert nodes
        if nodes_to_insert:
            # We do an upsert on repo_id and file_path
            db.table("graph_nodes").upsert(nodes_to_insert, on_conflict="repo_id,file_path").execute()
            
        # Get all nodes for this repo to map file_path -> uuid
        db_nodes = db.table("graph_nodes").select("id, file_path").eq("repo_id", repo_id).execute()
        path_to_uuid = {n["file_path"]: n["id"] for n in db_nodes.data}
        
        edges_to_insert = []
        # Prepare edges with UUIDs
        for edge in graph_data.get("edges", []):
            source_uuid = path_to_uuid.get(edge["source"])
            target_uuid = path_to_uuid.get(edge["target"])
            if source_uuid and target_uuid:
                edges_to_insert.append({
                    "repo_id": repo_id,
                    "source_node_id": source_uuid,
                    "target_node_id": target_uuid,
                    "edge_type": edge.get("type", "imports")
                })
                
        if edges_to_insert:
            db.table("graph_edges").upsert(edges_to_insert, on_conflict="source_node_id,target_node_id").execute()
            
        # Mark job as completed
        db.table("scan_jobs").update({"status": "completed"}).eq("id", job_id).execute()
        return {"status": "success", "nodes": len(nodes_to_insert), "edges": len(edges_to_insert)}
        
    except Exception as e:
        logger.error(f"Scan job failed: {str(e)}")
        # If it fails, update job status to failed
        try:
            db.table("scan_jobs").update({
                "status": "failed", 
                "error_message": str(e)
            }).eq("id", job_id).execute()
        except:
            pass
        raise e
