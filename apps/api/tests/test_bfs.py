import pytest
import asyncio
from services.bfs import reverse_bfs

@pytest.mark.asyncio
async def test_bfs_hop_distance():
    # Since we are mocking the DB in our service for now, 
    # the mock DB returns an empty list, meaning no edges.
    # Therefore, we only expect the starting node with hop 0.
    
    starting_nodes = ["node-1"]
    hop_map = await reverse_bfs("test-repo", starting_nodes, depth_limit=4)
    
    assert "node-1" in hop_map
    assert hop_map["node-1"] == 0
    assert len(hop_map) == 1
