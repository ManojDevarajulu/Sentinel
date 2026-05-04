# Sentinel 🛡️

**The Safety Layer for AI-Generated Code.**

Sentinel is a high-performance dependency analysis engine designed to compute the "Blast Radius" of code changes in real-time. In an age where AI agents like Cursor and Claude Code can generate hundreds of lines of code in seconds, Sentinel provides the visibility needed to ensure that no PR silently breaks production.

---

## 🚀 Key Features

- **AST-Powered Graph Engine**: Deeply parses TypeScript, JavaScript, and Python codebases to build a comprehensive dependency graph natively.
- **Blast Radius Analysis**: Uses reverse BFS (Breadth-First Search) to identify every file affected by a change, up to 4 hops away.
- **Risk Scoring**: Sophisticated algorithm that scores PRs based on volume, node criticality (e.g., middleware, layouts), and dependency importance.
- **Interactive Dashboard**: A premium React Flow-based visualization of your codebase with:
    - 🔥 **Heatmap Mode**: Instantly identify "load-bearing" files with a pulsing red glow.
    - 📋 **Node Sidebar**: Deep dive into any file's AI summaries, dependencies, and risk metrics.
- **GitHub Action Integration**: Automatically posts blast radius reports directly to your Pull Requests.

---

## 🏗️ Architecture

Sentinel is built as a high-performance monorepo using **npm workspaces**:

```text
├── apps/
│   ├── web/             # Next.js 14 Dashboard (App Router, Tailwind, React Flow)
│   └── api/             # FastAPI Backend (Python, BFS Logic, Celery Worker, AST Parsers)
├── packages/
│   ├── parser/          # Core JS/TS AST Parser (Bun, typescript-estree)
│   └── action/          # GitHub Action (TypeScript, Bundled with ncc)
└── supabase/            # Database Schema & Migrations
```

### Technology Stack
- **Frontend**: Next.js, React Flow, Tailwind CSS, shadcn/ui.
- **Backend**: FastAPI, Pydantic, Celery, Redis.
- **Parser**: Bun (TS/JS), Python AST module.
- **Database**: Supabase (PostgreSQL + pgvector).
- **AI**: Anthropic Claude Haiku (for summaries).

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js** (v20+)
- **Python** (3.10+)
- **Bun** (for the parser)
- **Supabase Account**

### Installation

1. **Clone the repo**:
   ```bash
   git clone https://github.com/your-repo/sentinel.git
   cd sentinel
   ```

2. **Install Workspace Dependencies**:
   ```bash
   npm install
   ```

3. **Setup Backend**:
   ```bash
   cd apps/api
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Create a `.env` in the root with:
   ```text
   SUPABASE_URL=your_url
   SUPABASE_ANON_KEY=your_key
   ANTHROPIC_API_KEY=your_key
   ```

---

## 🖥️ Running Locally (Docker)

The absolute easiest way to run the entire stack (Next.js, FastAPI, Celery, Redis) is using Docker Compose:

```bash
docker compose up -d --build
```
Open [http://localhost:3000](http://localhost:3000).

### Manual Start (Alternative)

### Start the API Server
```bash
cd apps/api
uvicorn main:app --reload --port 8000
```

### Run a Repository Scan
```bash
cd packages/parser
bun run src/index.ts --path /path/to/your/repo
```

---

## 🗺️ Roadmap

- [x] Phase 1: Core Engine & Parser
- [x] Phase 2: Premium Dashboard UI
- [x] Phase 2.5: GitHub OAuth & Supabase Integration 
- [x] Phase 2.8: Python Support & Docker Containerization
- [ ] Phase 3: AI-Generated Technical Summaries (Anthropic Haiku)
- [ ] Phase 3.5: Vector Embeddings (pgvector)
- [ ] Phase 4: Stripe Billing & Plan Gating
- [ ] Phase 5: MCP Server for Cursor/Claude Code

---

## 📄 License

Sentinel is licensed under the **AGPL v3 License**.

---

Built for speed. Built for safety. Built for the AI age.
