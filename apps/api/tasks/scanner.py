import json
import os
from db import get_db
import logging

logger = logging.getLogger(__name__)


def _normalize_repo_path(file_path: str) -> str:
    return file_path.replace("\\", "/").lstrip("./")


def _node_file_path(node: dict) -> str:
    return _normalize_repo_path(
        node.get("filePath")
        or node.get("file_path")
        or node.get("id")
        or ""
    )


def _node_type(node: dict) -> str:
    node_type = (
        node.get("nodeType")
        or node.get("node_type")
        or node.get("type")
        or "other"
    )
    known_types = {
        "page", "component", "hook", "api_route",
        "middleware", "layout", "supabase_client", "util", "other",
    }
    return node_type if node_type in known_types else "other"


def _display_name(node: dict, file_path: str) -> str:
    return (
        node.get("displayName")
        or node.get("display_name")
        or os.path.basename(file_path)
    )


def _do_scan(job_id: str, repo_id: str, repo_path: str):
    """Core scan logic — uses the universal Python parser (no bun/node needed)."""
    db = get_db()

    try:
        repo_path = os.path.abspath(repo_path)

        if not os.path.exists(repo_path) or not os.path.isdir(repo_path):
            raise ValueError(f"Invalid repository path: {repo_path}")

        db.table("scan_jobs").update({"status": "running"}).eq("id", job_id).execute()

        # Use the universal parser — pure Python, handles all file types
        from tasks.universal_parser import build_graph
        logger.info(f"Running universal parser for {repo_path}")
        graph_data = build_graph(repo_path)
        logger.info(f"Parser returned {len(graph_data.get('nodes', []))} nodes, {len(graph_data.get('edges', []))} edges")

        nodes_to_insert = []
        for node in graph_data.get("nodes", []):
            file_path = _node_file_path(node)
            if not file_path:
                continue
            nodes_to_insert.append({
                "repo_id": repo_id,
                "file_path": file_path,
                "node_type": _node_type(node),
                "display_name": _display_name(node, file_path),
                "importance_score": node.get("importanceScore", node.get("importance_score", 0)),
                "ai_summary": node.get("aiSummary", node.get("ai_summary")),
                "exports": node.get("exports", []),
                "imports": node.get("imports", [])
            })

        if nodes_to_insert:
            # Insert in batches of 50 to avoid request size limits
            for i in range(0, len(nodes_to_insert), 50):
                batch = nodes_to_insert[i:i+50]
                db.table("graph_nodes").upsert(batch, on_conflict="repo_id,file_path").execute()
            logger.info(f"Inserted {len(nodes_to_insert)} graph nodes")

        db_nodes = db.table("graph_nodes").select("id, file_path").eq("repo_id", repo_id).execute()
        path_to_uuid = {n["file_path"]: n["id"] for n in db_nodes.data}

        edges_to_insert = []
        for edge in graph_data.get("edges", []):
            source_ref = _normalize_repo_path(
                edge.get("sourceId") or edge.get("source_node_id") or edge.get("source") or ""
            )
            target_ref = _normalize_repo_path(
                edge.get("targetId") or edge.get("target_node_id") or edge.get("target") or ""
            )
            source_uuid = path_to_uuid.get(source_ref)
            target_uuid = path_to_uuid.get(target_ref)
            if source_uuid and target_uuid:
                edges_to_insert.append({
                    "repo_id": repo_id,
                    "source_node_id": source_uuid,
                    "target_node_id": target_uuid,
                    "edge_type": edge.get("edgeType", edge.get("edge_type", edge.get("type", "import"))),
                    "weight": edge.get("weight", 1)
                })

        if edges_to_insert:
            for i in range(0, len(edges_to_insert), 50):
                batch = edges_to_insert[i:i+50]
                db.table("graph_edges").upsert(batch, on_conflict="source_node_id,target_node_id").execute()
            logger.info(f"Inserted {len(edges_to_insert)} graph edges")

        db.table("scan_jobs").update({"status": "done"}).eq("id", job_id).execute()
        logger.info(f"Scan completed: {len(nodes_to_insert)} nodes, {len(edges_to_insert)} edges")
        return {"status": "success", "nodes": len(nodes_to_insert), "edges": len(edges_to_insert)}

    except Exception as e:
        logger.error(f"Scan job failed: {str(e)}", exc_info=True)
        try:
            db.table("scan_jobs").update({
                "status": "failed",
                "error_message": str(e)[:500]
            }).eq("id", job_id).execute()
        except:
            pass
        raise e


def run_repo_scan_sync(job_id: str, repo_id: str, repo_path: str):
    """Synchronous entry point — used by FastAPI BackgroundTasks (no Redis/Celery needed)."""
    _do_scan(job_id, repo_id, repo_path)
