export function formatComment(result: any): string {
  const emoji = result.risk_level === 'high' ? '🔴' : result.risk_level === 'medium' ? '🟡' : '🟢';
  
  let comment = `<!-- guardrail-analysis -->\n`;
  comment += `🛡️ **Sentinel Blast Radius Analysis**\n\n`;
  comment += `${emoji} **Risk Level:** ${result.risk_level.toUpperCase()} (Score: ${result.risk_score}/100)\n`;
  comment += `📦 **Affected Nodes:** ${result.blast_radius_count}\n\n`;
  
  if (result.critical_paths && result.critical_paths.length > 0) {
    comment += `*Critical Paths:*\n`;
    for (const p of result.critical_paths) {
      comment += `- \`${p}\`\n`;
    }
  }
  
  comment += `\n[View Full Dependency Graph](https://sentinel.dev)`;
  
  return comment;
}
