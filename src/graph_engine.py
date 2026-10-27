from collections import deque
from typing import Dict, List, Optional, Set, Tuple

from src.types import BlastRadiusReport, CodeEdge, CodeNode, NodeKind


class GraphEngine:
    """In-memory high-concurrency directed graph engine for codebase blast radius."""

    def __init__(self, nodes: Dict[str, CodeNode], edges: List[CodeEdge]):
        self.nodes = nodes
        self.edges = edges

        # Adjacency lists
        # forward_adj[A] = set of files that A imports (downstream dependencies)
        self.forward_adj: Dict[str, Set[str]] = {node_id: set() for node_id in nodes}
        # reverse_adj[B] = set of files that import B (upstream dependents / blast radius)
        self.reverse_adj: Dict[str, Set[str]] = {node_id: set() for node_id in nodes}

        for edge in edges:
            if edge.source in self.forward_adj:
                self.forward_adj[edge.source].add(edge.target)
            if edge.target in self.reverse_adj:
                self.reverse_adj[edge.target].add(edge.source)

    def get_reverse_reachability(
        self, starting_nodes: List[str], depth_limit: int = 6
    ) -> Dict[str, int]:
        """Performs in-memory reverse BFS to find all upstream files affected by starting nodes.

        Returns {node_id: hop_distance}.
        """
        visited: Dict[str, int] = {}
        queue: deque[Tuple[str, int]] = deque()

        for start_id in starting_nodes:
            if start_id in self.nodes:
                visited[start_id] = 0
                queue.append((start_id, 0))

        while queue:
            current_id, current_hop = queue.popleft()
            if current_hop >= depth_limit:
                continue

            for upstream_id in self.reverse_adj.get(current_id, set()):
                if upstream_id not in visited:
                    visited[upstream_id] = current_hop + 1
                    queue.append((upstream_id, current_hop + 1))

        return visited

    def trace_critical_paths(
        self, starting_nodes: List[str], affected_node_ids: Set[str], max_paths: int = 5
    ) -> List[List[str]]:
        """Extracts the most critical propagation chains from modified files to high-impact architectural nodes."""
        high_impact_kinds = {
            NodeKind.MIDDLEWARE,
            NodeKind.LAYOUT,
            NodeKind.ENTRYPOINT,
            NodeKind.ROUTER,
        }
        critical_targets = [
            nid
            for nid in affected_node_ids
            if self.nodes.get(nid) and self.nodes[nid].kind in high_impact_kinds
        ]

        paths: List[List[str]] = []

        # Find shortest path from any starting node to critical targets
        for target in critical_targets:
            for start in starting_nodes:
                if start == target:
                    continue
                path = self._shortest_path_reverse(start, target)
                if path and path not in paths:
                    paths.append(path)
                    if len(paths) >= max_paths:
                        return paths

        return paths

    def _shortest_path_reverse(self, start: str, target: str) -> Optional[List[str]]:
        """Finds directed dependency chain: start -> intermediate -> ... -> target."""
        # target imports start (directly or transitively)
        queue: deque[List[str]] = deque([[start]])
        seen = {start}

        while queue:
            path = queue.popleft()
            current = path[-1]

            if current == target:
                return path

            for upstream in sorted(self.reverse_adj.get(current, set())):
                if upstream not in seen:
                    seen.add(upstream)
                    queue.append(path + [upstream])

        return None

    def find_circular_dependencies(self) -> List[List[str]]:
        """Detects circular dependency cycles in the codebase."""
        cycles: List[List[str]] = []
        visited: Set[str] = set()
        rec_stack: List[str] = []

        def dfs(node_id: str):
            visited.add(node_id)
            rec_stack.append(node_id)

            for neighbor in self.forward_adj.get(node_id, set()):
                if neighbor not in visited:
                    dfs(neighbor)
                elif neighbor in rec_stack:
                    cycle_start = rec_stack.index(neighbor)
                    cycles.append(rec_stack[cycle_start:] + [neighbor])

            rec_stack.pop()

        for node in self.nodes:
            if node not in visited:
                dfs(node)

        return cycles

    def compute_blast_radius(
        self, changed_files: List[str], depth_limit: int = 6
    ) -> BlastRadiusReport:
        """Calculates exact blast radius, risk level, and propagation paths for a set of changed files."""
        # Normalize changed file paths to match node IDs
        matched_starts = []
        for cf in changed_files:
            clean = cf.replace("\\", "/").lstrip("./")
            if clean in self.nodes:
                matched_starts.append(clean)
            else:
                # Fuzzy match suffix
                for nid in self.nodes:
                    if nid.endswith(clean) or clean.endswith(nid):
                        matched_starts.append(nid)
                        break

        matched_starts = list(set(matched_starts))

        if not matched_starts:
            return BlastRadiusReport(
                changed_files=changed_files,
                affected_nodes=[],
                blast_radius_count=0,
                risk_level="SAFE",
                risk_score=0,
                critical_paths=[],
                hop_distances={},
                summary="No internal dependent files found for the modified paths.",
            )

        hop_map = self.get_reverse_reachability(matched_starts, depth_limit)
        affected_ids = sorted(
            hop_map.keys(),
            key=lambda nid: (
                hop_map[nid],
                -self.nodes[nid].importance_score,
                nid,
            ),
        )

        critical_paths = self.trace_critical_paths(matched_starts, set(affected_ids))

        # Risk Score Calculation
        total_repo_nodes = max(1, len(self.nodes))
        volume_ratio = len(affected_ids) / total_repo_nodes
        volume_component = int(min(40, volume_ratio * 100))

        criticality_bonus = 0
        kinds_affected = {self.nodes[nid].kind for nid in affected_ids}
        if NodeKind.MIDDLEWARE in kinds_affected or NodeKind.ENTRYPOINT in kinds_affected:
            criticality_bonus += 35
        if NodeKind.LAYOUT in kinds_affected or NodeKind.ROUTER in kinds_affected:
            criticality_bonus += 25
        if NodeKind.MODEL in kinds_affected:
            criticality_bonus += 15

        # Proximity bonus (heavy 1-hop impact)
        one_hop_count = sum(1 for d in hop_map.values() if d == 1)
        proximity_bonus = min(20, one_hop_count * 4)

        risk_score = min(100, volume_component + criticality_bonus + proximity_bonus)

        if risk_score >= 70:
            risk_level = "CRITICAL"
        elif risk_score >= 35:
            risk_level = "WARNING"
        else:
            risk_level = "SAFE"

        summary = (
            f"Modifying {len(matched_starts)} file(s) affects {len(affected_ids)} upstream component(s) "
            f"across {max(hop_map.values(), default=0)} hops. Risk Tier: {risk_level} (Score: {risk_score}/100)."
        )

        return BlastRadiusReport(
            changed_files=matched_starts,
            affected_nodes=affected_ids,
            blast_radius_count=len(affected_ids),
            risk_level=risk_level,
            risk_score=risk_score,
            critical_paths=critical_paths,
            hop_distances=hop_map,
            summary=summary,
            metadata={
                "total_nodes": total_repo_nodes,
                "total_edges": len(self.edges),
                "one_hop_impact": one_hop_count,
            },
        )
