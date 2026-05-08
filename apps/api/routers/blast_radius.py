from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from services.bfs import reverse_bfs
from services.risk_scorer import compute_risk
from services.path_tracer import trace_critical_paths
from db import db_client

router = APIRouter(prefix='/api/v1')


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
    # Step 1: Resolve changed file paths to graph_node IDs
    try:
        nodes_result = (
            db_client
            .table('graph_nodes')
            .select('id, file_path, node_type, importance_score, ai_summary')
            .eq('repo_id', request.repo_id)
            .in_('file_path', request.changed_files)
            .execute()
        )
        starting_nodes = nodes_result.data or []
    except Exception as e:
        # If repo_id is invalid UUID or graph doesn't exist yet, return empty
        return BlastRadiusResponse(
            blast_radius_count=0,
            risk_level="UNKNOWN",
            risk_score=0,
            affected_nodes=[],
            critical_paths=[],
            cached=False,
            analysis_id=f"no-graph-{request.repo_id[:8]}"
        )

    if not starting_nodes:
        # No nodes found for the changed files — repo may not be scanned yet
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
    node_id_to_path = {n['id']: n['file_path'] for n in starting_nodes}

    # Step 2: BFS to find all upstream dependents
    hop_map = await reverse_bfs(request.repo_id, starting_node_ids, request.depth_limit)

    # Step 3: Fetch full data for all affected nodes
    all_affected_ids = list(hop_map.keys())
    if all_affected_ids:
        try:
            affected_result = (
                db_client
                .table('graph_nodes')
                .select('id, file_path, node_type, importance_score, ai_summary')
                .in_('id', all_affected_ids)
                .execute()
            )
            affected_nodes_data = affected_result.data or []
        except Exception:
            affected_nodes_data = []
    else:
        affected_nodes_data = []

    # Step 4: Calculate risk
    risk_level, risk_score = compute_risk(
        affected_nodes_data, len(starting_node_ids), 100
    )

    # Step 5: Trace critical paths
    paths = trace_critical_paths(
        hop_map, [], request.changed_files, node_id_to_path
    )

    # Step 6: Build response
    nodes_response = [
        AffectedNode(
            node_id=n['id'],
            file_path=n['file_path'],
            node_type=n.get('node_type', 'util'),
            criticality='high' if n.get('node_type') == 'middleware' else 'medium' if n.get('importance_score', 0) > 60 else 'low',
            hop_distance=hop_map.get(n['id'], 0),
            ai_summary=n.get('ai_summary') or '',
            importance_score=n.get('importance_score', 0)
        )
        for n in affected_nodes_data
    ]

    return BlastRadiusResponse(
        blast_radius_count=len(affected_nodes_data),
        risk_level=risk_level,
        risk_score=risk_score,
        affected_nodes=nodes_response,
        critical_paths=paths,
        cached=False,
        analysis_id=f"pr-{request.pr_number}-{request.repo_id[:8]}"
    )
