import * as core from '@actions/core';
import * as github from '@actions/github';
import { formatComment } from './comment';

async function run() {
  try {
    const apiUrl = core.getInput('api_url');
    const apiKey = core.getInput('api_key');

    const context = github.context;
    if (context.eventName !== 'pull_request') {
      core.info('Not a pull request. Skipping Sentinel analysis.');
      return;
    }

    const prNumber = context.payload.pull_request?.number;
    const prTitle = context.payload.pull_request?.title;
    
    // In a real scenario, we'd use octokit to get changed files
    // For this mock, we'll just send dummy files to our API
    const changedFiles = ["components/Button.tsx"];

    // Mock sending to API
    const result = {
      blast_radius_count: 5,
      risk_level: "low",
      risk_score: 15,
      affected_nodes: [],
      critical_paths: ["components/Button.tsx -> app/page.tsx"]
    };

    const commentBody = formatComment(result);

    // Mock commenting logic since we don't have a real token here in the test environment
    core.info(`Would post comment:\n${commentBody}`);
    
    core.setOutput('risk_level', result.risk_level);
    core.setOutput('blast_radius_count', String(result.blast_radius_count));

  } catch (error: any) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
