import * as core from '@actions/core';
import * as github from '@actions/github';
import { formatComment, COMMENT_MARKER, type BlastRadiusResult } from './comment';

type BlastRadiusApiResponse = BlastRadiusResult;

async function run() {
  try {
    const apiUrl = core.getInput('api_url');
    const repoId = core.getInput('repo_id');
    const githubToken = core.getInput('github_token');

    const context = github.context;
    if (context.eventName !== 'pull_request') {
      core.info('Not a pull request. Skipping Sentinel analysis.');
      return;
    }

    const pr = context.payload.pull_request;
    if (!pr) {
      core.setFailed('Pull request payload is missing.');
      return;
    }

    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const octokit = github.getOctokit(githubToken);

    const changedFiles = await octokit.paginate(
      octokit.rest.pulls.listFiles,
      {
        owner,
        repo,
        pull_number: pr.number,
        per_page: 100,
      },
      (response) => response.data.map((file) => file.filename)
    );

    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v1/blast-radius`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo_id: repoId,
        pr_number: pr.number,
        pr_title: pr.title || '',
        changed_files: changedFiles,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      core.setFailed(`Blast radius API request failed: ${response.status} ${detail}`);
      return;
    }

    const result = (await response.json()) as BlastRadiusApiResponse;
    const dashboardUrl = `${apiUrl.replace(/\/$/, '')}/dashboard`;
    const commentBody = formatComment(result, dashboardUrl);

    const existingComments = await octokit.paginate(
      octokit.rest.issues.listComments,
      {
        owner,
        repo,
        issue_number: pr.number,
        per_page: 100,
      }
    );

    const existingComment = existingComments.find((comment) =>
      comment.body?.includes(COMMENT_MARKER)
    );

    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      core.info(`Updated Sentinel comment ${existingComment.id}.`);
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pr.number,
        body: commentBody,
      });
      core.info('Created Sentinel PR comment.');
    }
    
    core.setOutput('risk_level', result.risk_level);
    core.setOutput('blast_radius_count', String(result.blast_radius_count));
    core.setOutput('analysis_id', result.analysis_id);
  } catch (error: unknown) {
    core.setFailed(`Action failed with error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
