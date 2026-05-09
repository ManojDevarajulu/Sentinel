import asyncio

import services.bfs as bfs
from services.path_tracer import trace_critical_paths
from services.risk_scorer import compute_risk


class _MockQuery:
    def __init__(self, responses):
        self.responses = responses
        self.frontier = []

    def select(self, _fields):
        return self

    def eq(self, _column, _value):
        return self

    def in_(self, _column, values):
        self.frontier = list(values)
        return self

    def execute(self):
        rows = []
        for target in self.frontier:
            rows.extend({"source_node_id": source} for source in self.responses.get(target, []))
        return type("Result", (), {"data": rows})()


class _MockDbClient:
    def __init__(self, responses):
        self.responses = responses

    def table(self, _name):
        return _MockQuery(self.responses)


def test_bfs_hop_distance(monkeypatch):
    monkeypatch.setattr(
        bfs,
        "db_client",
        _MockDbClient(
            {
                "node-1": ["node-2"],
                "node-2": ["node-3"],
                "node-3": ["node-4"],
            }
        ),
    )

    hop_map = asyncio.run(bfs.reverse_bfs("repo-1", ["node-1"], depth_limit=4))

    assert hop_map == {
        "node-1": 0,
        "node-2": 1,
        "node-3": 2,
        "node-4": 3,
    }


def test_trace_critical_paths_reconstructs_shortest_path():
    affected_nodes = [
        {"node_id": "a", "node_type": "util", "hop_distance": 0, "importance_score": 10},
        {"node_id": "b", "node_type": "hook", "hop_distance": 1, "importance_score": 50},
        {"node_id": "c", "node_type": "middleware", "hop_distance": 2, "importance_score": 90},
    ]
    all_edges = [
        {"source_node_id": "b", "target_node_id": "a"},
        {"source_node_id": "c", "target_node_id": "b"},
    ]
    node_id_to_path = {
        "a": "src/a.ts",
        "b": "src/b.ts",
        "c": "src/c.ts",
    }

    paths = trace_critical_paths(
        affected_nodes=affected_nodes,
        all_edges=all_edges,
        starting_node_ids=["a"],
        node_id_to_path=node_id_to_path,
    )

    assert paths[0] == "src/a.ts -> src/b.ts -> src/c.ts"


def test_compute_risk_uses_real_repo_scale():
    nodes = [
        {"node_type": "middleware", "importance_score": 95},
        {"node_type": "component", "importance_score": 50},
    ]

    level, score = compute_risk(nodes, starting_count=1, repo_node_count=20)

    assert level == "high"
    assert score >= 90
