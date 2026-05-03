def compute_risk(affected_nodes: list[dict], starting_count: int, repo_node_count: int) -> tuple[str, int]:
    # Component A: Volume of codebase affected
    volume_ratio = len(affected_nodes) / max(1, repo_node_count * 0.15)
    count_score = min(volume_ratio, 1.0) * 40
    
    # Component B: Critical nodes affected
    has_critical = any(n.get('node_type') in ['middleware', 'layout'] for n in affected_nodes)
    critical_bonus = 30 if has_critical else 0
    
    # Component C: Average importance of affected nodes
    if affected_nodes:
        avg_importance = sum(n.get('importance_score', 0) for n in affected_nodes) / len(affected_nodes)
        importance_score = (avg_importance / 100) * 20
    else:
        importance_score = 0
        
    # Component D: Proximity (Using a simplified 10 score for now)
    proximity = 10
    
    score = round(count_score + critical_bonus + importance_score + proximity)
    score = min(100, max(0, score))
    
    if score < 30:
        level = 'low'
    elif score < 60:
        level = 'medium'
    else:
        level = 'high'
        
    # Override for middleware
    if any(n.get('node_type') == 'middleware' for n in affected_nodes):
        level = 'high'
        score = max(score, 90)
        
    return level, score
