export interface BlastRadiusResult {
  analysis_id: string;
  blast_radius_count: number;
  risk_level: string;
  risk_score: number;
  critical_paths: string[];
}

export const COMMENT_MARKER = '<!-- sentinel-blast-radius -->';

export function formatComment(result: BlastRadiusResult, dashboardUrl?: string): string {
  const normalizedLevel = result.risk_level.toLowerCase();
  const emoji = normalizedLevel === 'high' ? '🔴' : normalizedLevel === 'medium' ? '🟡' : '🟢';

  let comment = `${COMMENT_MARKER}\n`;
  comment += `🛡️ **Sentinel Blast Radius Analysis**\n\n`;
  comment += `${emoji} **Risk Level:** ${result.risk_level.toUpperCase()} (Score: ${result.risk_score}/100)\n`;
  comment += `📦 **Affected Nodes:** ${result.blast_radius_count}\n`;
  comment += `🧾 **Analysis ID:** \`${result.analysis_id}\`\n\n`;
  
  if (result.critical_paths.length > 0) {
    comment += `**Critical Paths**\n`;
    for (const path of result.critical_paths) {
      comment += `- \`${path}\`\n`;
    }
    comment += `\n`;
  }
  
  if (dashboardUrl) {
    comment += `[View Full Analysis](${dashboardUrl})`;
  } else {
    comment += `View Full Analysis in Sentinel`;
  }
  
  return comment;
}
