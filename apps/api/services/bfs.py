from db import db_client

async def reverse_bfs(repo_id: str, starting_node_ids: list[str], depth_limit: int = 4) -> dict[str, int]:
    visited = {}
    frontier = set(starting_node_ids)
    hop = 0
    
    # Pre-populate starting nodes with 0 hops
    for n in starting_node_ids:
        visited[n] = hop
        
    while frontier and hop < depth_limit:
        # Mocking the Supabase query to match our previous local JSON implementation logic
        # In a real scenario, this queries the graph_edges table.
        # Since we are mocking, we just return empty unless we connect a real DB.
        result = db_client.table('graph_edges').select('source_node_id').eq('repo_id', repo_id).in_('target_node_id', list(frontier)).execute()
        
        new_nodes = set()
        for r in result.data:
            src = r['source_node_id']
            if src not in visited:
                new_nodes.add(src)
                
        for n in new_nodes:
            visited[n] = hop + 1
            
        frontier = new_nodes
        hop += 1
        
    return visited
