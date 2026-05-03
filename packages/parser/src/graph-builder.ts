import fs from 'fs';
import crypto from 'crypto';
import { walkRepo } from './walker.js';
import { parseFile } from './extractor.js';
import { classifyNode, computeDisplayName } from './classifier.js';
import { resolveImport } from './resolver.js';
import { GraphNode, GraphEdge, ParseResult, EdgeType } from './types.js';

export async function buildGraph(repoPath: string): Promise<ParseResult> {
  const start = Date.now();
  
  // 1. Walk
  const files = await walkRepo(repoPath);
  
  // 2. Build Node Map
  const nodeMap = new Map<string, GraphNode>();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const nodeType = classifyNode(file, content);
    const displayName = computeDisplayName(file, repoPath);
    
    nodeMap.set(file, {
      id: crypto.randomUUID(),
      filePath: file,
      nodeType,
      displayName,
      importanceScore: 0
    });
  }
  
  // 3. Build Edges
  const edges: GraphEdge[] = [];
  const inDegreeMap = new Map<string, number>();
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const imports = parseFile(file, content);
    const sourceNode = nodeMap.get(file);
    
    if (!sourceNode) continue;
    
    for (const imp of imports) {
      const resolvedTarget = resolveImport(imp, file, repoPath);
      if (resolvedTarget && nodeMap.has(resolvedTarget)) {
        const targetNode = nodeMap.get(resolvedTarget)!;
        
        edges.push({
          id: crypto.randomUUID(),
          sourceId: sourceNode.id,
          targetId: targetNode.id,
          edgeType: EdgeType.IMPORT,
          weight: 1
        });
        
        inDegreeMap.set(targetNode.id, (inDegreeMap.get(targetNode.id) || 0) + 1);
      }
    }
  }
  
  // 4. Calculate Importance Score
  let maxInDegree = 0;
  for (const degree of inDegreeMap.values()) {
    if (degree > maxInDegree) maxInDegree = degree;
  }
  
  const nodes = Array.from(nodeMap.values()).map(node => {
    const degree = inDegreeMap.get(node.id) || 0;
    node.importanceScore = maxInDegree > 0 ? Math.round((degree / maxInDegree) * 100) : 0;
    return node;
  });
  
  return {
    repository: repoPath,
    nodes,
    edges,
    meta: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      durationMs: Date.now() - start
    }
  };
}
