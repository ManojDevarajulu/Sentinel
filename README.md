# Sentinel

**Prototype/beta for blast-radius analysis of AI-generated code changes.**

Sentinel is a monorepo for scanning codebases into dependency graphs, computing blast radius from changed files, and surfacing the result in a dashboard and GitHub pull-request workflow.

## What Is Real Today

- `apps/web`: Next.js frontend with landing page, auth, dashboard repo list, scan trigger, and graph viewer shell
- `apps/api`: FastAPI backend with scan and blast-radius endpoints
- `packages/parser`: JS/TS parser that builds graph nodes and edges from repo files
- `supabase/migrations`: schema history for repos, graph data, analyses, waitlist, and MCP usage

## Current Status

This repository is **not production-ready yet**. It should be treated as a recovery-phase prototype.

Working now:
- client-side auth flow
- local repo scan initiation
- graph generation foundation
- dashboard navigation and repo browsing

Under active repair:
- parser -> scanner -> DB contract consistency
- blast-radius correctness and critical path reconstruction
- graph UI truthfulness
- admin authorization
- GitHub Action integration

Planned, but not yet trustworthy:
- AI summaries
- PR Guardian / merge-blocking workflows
- billing and plan gating
- MCP server integration

## Architecture Status

Current implemented loop:
1. user signs in via Supabase
2. user creates a repo record and triggers a scan
3. API runs parser and persists graph data
4. blast-radius endpoint reads graph data and computes affected nodes
5. web dashboard reads graph data and displays repo graph state

Known gaps:
- some contracts were previously inconsistent across parser, scanner, DB, API, and UI
- some UI surfaces still need removal of placeholder content
- several roadmap docs are broader than the currently implemented product

Next milestones:
1. align graph contracts end-to-end
2. validate blast radius on real repos
3. make graph viewer fully data-driven
4. finish real PR analysis integration

## Repository Layout

```text
apps/
  api/        FastAPI API, scan pipeline, blast-radius logic
  web/        Next.js frontend and dashboard
packages/
  parser/     JS/TS dependency graph parser
  action/     GitHub Action for PR analysis
supabase/
  migrations/ Database schema and contract migrations
```

## Local Development

### Web

```bash
cd apps/web
npm run dev
```

### API

```bash
cd apps/api
uvicorn main:app --reload --port 8001
```

### Parser

```bash
cd packages/parser
bun run src/index.ts /path/to/repo
```

## Roadmap References

The following files are roadmap/reference materials, not implementation truth:
- `GuardRail_Exhaustive_Implementation_Plan.docx`
- `sentinel_complete_master_blueprint.html`

Use the codebase and `bug_fixes.md` / this README as the current truth source when implementing or debugging.
