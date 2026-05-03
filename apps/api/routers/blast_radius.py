from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

# Import from services
from services.bfs import reverse_bfs
from services.risk_scorer import compute_risk
from services.path_tracer import trace_critical_paths

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
    # Mock starting node resolution
    starting_node_ids = ["mock-id-1"] 
    
    # Call BFS
    hop_map = await reverse_bfs(request.repo_id, starting_node_ids, request.depth_limit)
    
    # Mock fetching full node data
    affected_nodes_data = [
        {"id": "mock-id-1", "file_path": "components/Button.tsx", "node_type": "component", "importance_score": 10}
    ]
    
    # Calculate Risk
    risk_level, risk_score = compute_risk(affected_nodes_data, len(starting_node_ids), 100)
    
    # Trace paths
    paths = trace_critical_paths(hop_map, [], request.changed_files, {"mock-id-1": "components/Button.tsx"})
    
    # Map to response model
    nodes_response = [
        AffectedNode(
            node_id=n["id"],
            file_path=n["file_path"],
            node_type=n["node_type"],
            criticality="high" if n["node_type"] == "middleware" else "low",
            hop_distance=hop_map.get(n["id"], 0),
            importance_score=n["importance_score"]
        ) for n in affected_nodes_data
    ]
    
    return BlastRadiusResponse(
        blast_radius_count=len(affected_nodes_data),
        risk_level=risk_level,
        risk_score=risk_score,
        affected_nodes=nodes_response,
        critical_paths=paths,
        cached=False,
        analysis_id="mock-analysis-1"
    )
