import subprocess
import json
import os
from pathlib import Path
from celery import shared_task
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
    """Core scan logic — shared by both sync and Celery task versions."""
    db = get_db()

    try:
        repo_path = os.path.abspath(repo_path)

        if not os.path.exists(repo_path) or not os.path.isdir(repo_path):
            raise ValueError(f"Invalid repository path: {repo_path}")

        db.table("scan_jobs").update({"status": "running"}).eq("id", job_id).execute()

        current_dir = os.path.dirname(os.path.abspath(__file__))

        py_files = list(Path(repo_path).rglob("*.py"))
        ts_files = (
            list(Path(repo_path).rglob("*.ts"))
            + list(Path(repo_path).rglob("*.tsx"))
            + list(Path(repo_path).rglob("*.js"))
            + list(Path(repo_path).rglob("*.jsx"))
        )

        if len(py_files) > len(ts_files):
            parser_path = os.path.normpath(os.path.join(current_dir, "python_parser.py"))
            logger.info(f"Running python parser for {repo_path}")
            result = subprocess.run(
                ["python", parser_path, repo_path],
                capture_output=True, text=True, check=True
            )
        else:
            parser_path = os.path.normpath(os.path.join(current_dir, "../../..", "packages", "parser", "src", "index.ts"))
            logger.info(f"Running bun parser for {repo_path}")
            result = subprocess.run(
                ["bun", "run", parser_path, repo_path],
                capture_output=True, text=True, check=True
            )

        graph_data = json.loads(result.stdout)

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
            db.table("graph_nodes").upsert(nodes_to_insert, on_conflict="repo_id,file_path").execute()

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
            db.table("graph_edges").upsert(edges_to_insert, on_conflict="source_node_id,target_node_id").execute()

        db.table("scan_jobs").update({"status": "done"}).eq("id", job_id).execute()
        logger.info(f"Scan completed: {len(nodes_to_insert)} nodes, {len(edges_to_insert)} edges")
        return {"status": "success", "nodes": len(nodes_to_insert), "edges": len(edges_to_insert)}

    except Exception as e:
        logger.error(f"Scan job failed: {str(e)}")
        try:
            db.table("scan_jobs").update({
                "status": "failed",
                "error_message": str(e)
            }).eq("id", job_id).execute()
        except:
            pass
        raise e


def run_repo_scan_sync(job_id: str, repo_id: str, repo_path: str):
    """Synchronous entry point — used by FastAPI BackgroundTasks (no Redis/Celery needed)."""
    _do_scan(job_id, repo_id, repo_path)


@shared_task(bind=True)
def run_repo_scan(self, job_id: str, repo_id: str, repo_path: str):
    """Celery task entry point — used when Redis broker is available."""
    _do_scan(job_id, repo_id, repo_path)
