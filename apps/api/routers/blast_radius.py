from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from services.bfs import reverse_bfs
from services.risk_scorer import compute_risk
from services.path_tracer import trace_critical_paths
from db import db_client

router = APIRouter(prefix='/api/v1')


def _normalize_path(file_path: str) -> str:
    return file_path.replace("\\", "/").lstrip("./")


class BlastRadiusRequest(BaseModel):
    repo_id: str
    pr_number: int
    pr_title: str = ''
    changed_files: List[str]
    depth_limit: int = 4


class AffectedNode(BaseModel):
    node_id: str
    file_path: str
    node_type: str
    criticality: str
    hop_distance: int
    ai_summary: str = ''
    importance_score: int


class BlastRadiusResponse(BaseModel):
    blast_radius_count: int
    risk_level: str
    risk_score: int
    affected_nodes: List[AffectedNode]
    critical_paths: List[str]
    cached: bool
    analysis_id: str


@router.post("/blast-radius", response_model=BlastRadiusResponse)
async def get_blast_radius(request: BlastRadiusRequest):
    normalized_changed_files = [_normalize_path(path) for path in request.changed_files]

    try:
        nodes_result = (
            db_client
            .table('graph_nodes')
            .select('id, file_path, node_type, importance_score, ai_summary, display_name')
            .eq('repo_id', request.repo_id)
            .execute()
        )
        all_nodes = nodes_result.data or []
    except Exception:
        all_nodes = []

    if not all_nodes:
        return BlastRadiusResponse(
            blast_radius_count=0,
            risk_level="UNKNOWN",
            risk_score=0,
            affected_nodes=[],
            critical_paths=[],
            cached=False,
            analysis_id=f"no-graph-{request.repo_id[:8]}"
        )

    node_by_path = {_normalize_path(node['file_path']): node for node in all_nodes}
    starting_nodes = [node_by_path[path] for path in normalized_changed_files if path in node_by_path]

    if not starting_nodes:
        return BlastRadiusResponse(
            blast_radius_count=0,
            risk_level="UNKNOWN",
            risk_score=0,
            affected_nodes=[],
            critical_paths=[],
            cached=False,
            analysis_id=f"no-nodes-{request.pr_number}"
        )

    starting_node_ids = [n['id'] for n in starting_nodes]

    hop_map = await reverse_bfs(request.repo_id, starting_node_ids, request.depth_limit)
    all_affected_ids = list(hop_map.keys())

    affected_nodes_data = [node for node in all_nodes if node['id'] in all_affected_ids]
    affected_nodes_data.sort(
        key=lambda node: (
            hop_map.get(node['id'], 0),
            -(node.get('importance_score', 0) or 0),
            node.get('file_path', ''),
        )
    )

    try:
        edges_result = (
            db_client
            .table('graph_edges')
            .select('source_node_id, target_node_id, edge_type, weight')
            .eq('repo_id', request.repo_id)
            .execute()
        )
        all_edges = edges_result.data or []
    except Exception:
        all_edges = []

    node_id_to_path = {node['id']: _normalize_path(node['file_path']) for node in all_nodes}
    repo_node_count = len(all_nodes)
    risk_level, risk_score = compute_risk(
        affected_nodes_data,
        len(starting_node_ids),
        repo_node_count,
    )

    nodes_response = [
        AffectedNode(
            node_id=node['id'],
            file_path=_normalize_path(node['file_path']),
            node_type=node.get('node_type', 'util'),
            criticality=(
                'high'
                if node.get('node_type') in {'middleware', 'layout'}
                else 'medium'
                if (node.get('importance_score', 0) or 0) > 60
                else 'low'
            ),
            hop_distance=hop_map.get(node['id'], 0),
            ai_summary=node.get('ai_summary') or '',
            importance_score=node.get('importance_score', 0) or 0
        )
        for node in affected_nodes_data
    ]

    paths = trace_critical_paths(
        affected_nodes=[
            node.model_dump() if hasattr(node, "model_dump") else node.dict()
            for node in nodes_response
        ],
        all_edges=all_edges,
        starting_node_ids=starting_node_ids,
        node_id_to_path=node_id_to_path,
    )

    return BlastRadiusResponse(
        blast_radius_count=len(affected_nodes_data),
        risk_level=risk_level.upper(),
        risk_score=risk_score,
        affected_nodes=nodes_response,
        critical_paths=paths,
        cached=False,
        analysis_id=f"pr-{request.pr_number}-{request.repo_id[:8]}"
    )
