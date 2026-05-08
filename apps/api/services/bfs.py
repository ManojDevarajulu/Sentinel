from db import db_client


async def reverse_bfs(repo_id: str, starting_node_ids: list[str], depth_limit: int = 4) -> dict[str, int]:
    """
    Performs a reverse BFS on the graph_edges table to find all upstream
    dependents of the starting nodes within depth_limit hops.
    Returns a dict of {node_id: hop_distance}.
    """
    visited = {}
    frontier = set(starting_node_ids)

    # Pre-populate starting nodes with hop distance 0
    for n in starting_node_ids:
        visited[n] = 0

    hop = 0
    while frontier and hop < depth_limit:
        try:
            # Find all nodes that import/depend on anything in the current frontier
            result = (
                db_client
                .table('graph_edges')
                .select('source_node_id')
                .eq('repo_id', repo_id)
                .in_('target_node_id', list(frontier))
                .execute()
            )
        except Exception:
            # If the DB query fails (e.g. empty graph, type error), stop BFS
            break

        new_nodes = set()
        for r in result.data or []:
            src = r.get('source_node_id')
            if src and src not in visited:
                new_nodes.add(src)

        for n in new_nodes:
            visited[n] = hop + 1

        frontier = new_nodes
        hop += 1

    return visited
