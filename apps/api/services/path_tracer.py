from collections import deque


def trace_critical_paths(
    affected_nodes: list[dict],
    all_edges: list[dict],
    starting_node_ids: list[str],
    node_id_to_path: dict[str, str],
    max_paths: int = 3,
) -> list[str]:
    """
    Reconstruct the shortest dependency path from a changed node to an affected node.
    Edges are expected to point from source (dependent/importer) to target (dependency/imported).
    For reverse-BFS results, a useful path for the UI is:
      changed-file -> ... -> affected-dependent
    """
    if not affected_nodes or not starting_node_ids:
        return []

    adjacency: dict[str, list[str]] = {}
    for edge in all_edges:
        source = edge.get("source_node_id")
        target = edge.get("target_node_id")
        if not source or not target:
            continue
        adjacency.setdefault(target, []).append(source)

    candidate_nodes = sorted(
        [n for n in affected_nodes if n.get("hop_distance", 0) > 0],
        key=lambda n: (
            0 if n.get("node_type") in {"middleware", "layout"} else 1,
            n.get("hop_distance", 0),
            -(n.get("importance_score", 0)),
            n.get("file_path", ""),
        ),
    )

    paths: list[str] = []
    for node in candidate_nodes:
        path = _find_shortest_path(
            target_node_id=node["node_id"],
            start_node_ids=starting_node_ids,
            adjacency=adjacency,
        )
        if not path:
            continue

        label = " -> ".join(node_id_to_path.get(node_id, node_id) for node_id in path)
        if label not in paths:
            paths.append(label)
        if len(paths) >= max_paths:
            break

    return paths


def _find_shortest_path(
    target_node_id: str,
    start_node_ids: list[str],
    adjacency: dict[str, list[str]],
) -> list[str]:
    start_set = set(start_node_ids)
    queue = deque([(start_id, [start_id]) for start_id in start_node_ids])
    visited = set(start_node_ids)

    while queue:
        current, path = queue.popleft()
        if current == target_node_id:
            return path

        for neighbor in adjacency.get(current, []):
            if neighbor in visited:
                continue
            visited.add(neighbor)
            queue.append((neighbor, path + [neighbor]))

    if target_node_id in start_set:
        return [target_node_id]

    return []
