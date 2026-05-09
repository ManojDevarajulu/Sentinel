# Sentinel

**Prototype/beta for blast-radius analysis of AI-generated code changes.**

Sentinel is a monorepo for scanning codebases into dependency graphs, computing blast radius from changed files, and surfacing the result in a dashboard and GitHub pull-request workflow.

## What Is Real Today

- `apps/web`: Next.js frontend with landing page, auth, dashboard repo list, scan trigger, and graph viewer shell
- `apps/api`: FastAPI backend with scan and blast-radius endpoints, and Celery worker integration
- `packages/parser`: JS/TS parser that builds graph nodes and edges from repo files
- `supabase/migrations`: schema history for repos, graph data, analyses, waitlist, and MCP usage

## Cloud Architecture (Production)

Sentinel is deployed using a "Hybrid Free" architecture:
- **Frontend**: Hosted on Vercel (`apps/web`). Communicates with the backend API via `NEXT_PUBLIC_API_URL`.
- **Backend & Worker**: Hosted on Render as a Docker Web Service (`apps/api/Dockerfile.api` and `apps/api/Dockerfile.worker`).
- **Database & Auth**: Hosted on Supabase (PostgreSQL + Auth).
- **Message Broker**: Hosted on Upstash (Redis) for Celery task queuing.

## Current Status

This repository is **not production-ready yet**. It should be treated as a recovery-phase prototype.

Working now:
- Email and GitHub Auth flow (Supabase)
- Scan a public GitHub repository (via backend `git clone`)
- Upload and scan a local repository `.zip` file
- Local AST graph generation foundation
- Dashboard navigation and repo browsing

Under active repair:
- parser -> scanner -> DB contract consistency
- blast-radius correctness and critical path reconstruction
- graph UI truthfulness
- PR Guardian / merge-blocking workflows

## Local Development

### Web

```bash
cd apps/web
npm run dev
```

### API & Worker

Make sure you have an Upstash Redis URL and Supabase credentials in your `.env`.

```bash
cd apps/api
# Start the API
uvicorn main:app --reload --port 8001

# Start the Celery Worker (requires Redis)
celery -A worker.celery_app worker --loglevel=info
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
