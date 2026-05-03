export { buildGraph } from './graph-builder.js';
export type { GraphNode, GraphEdge, ParseResult, NodeType, EdgeType } from './types.js';

// If run directly from CLI
if (import.meta.main) {
  const repoPath = process.argv[2] || '.';
  import('./graph-builder.js').then(async ({ buildGraph }) => {
    try {
      const result = await buildGraph(repoPath);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error("Error building graph:", e);
      process.exit(1);
    }
  });
}
