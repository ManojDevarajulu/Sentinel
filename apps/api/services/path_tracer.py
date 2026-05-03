def trace_critical_paths(hop_map: dict, all_edges: list[dict], starting_paths: list[str], node_id_to_path: dict) -> list[str]:
    """
    Reconstructs the shortest path from an affected node back to the changed file.
    In a real scenario, this performs graph traversal on all_edges.
    """
    critical_paths = []
    
    # Sort affected nodes by hop distance, closest first
    sorted_nodes = sorted(hop_map.items(), key=lambda x: x[1])
    
    # Just a simple stub for phase 1 returning mock strings
    for node_id, hop in sorted_nodes[:3]:
        affected_file = node_id_to_path.get(node_id, "unknown.ts")
        if hop > 0:
            source_file = starting_paths[0] if starting_paths else "changed.ts"
            critical_paths.append(f"{source_file} -> {affected_file}")
            
    return critical_paths
