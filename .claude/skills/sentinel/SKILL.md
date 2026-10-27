---
name: sentinel
description: Instant codebase architectural visualization, dependency graph mapping, and blast-radius impact analysis. Use when the user asks to map the repository architecture, understand module dependencies, or evaluate the ripple effects and risk of modifying a file or merging a pull request.
---

# Sentinel: Codebase Architecture & Blast-Radius Skill

Sentinel empowers Claude to instantly map any TypeScript, JavaScript, or Python codebase into a deterministic dependency graph, compute the **blast radius** of proposed code modifications, and deliver a zero-dependency, self-contained interactive visual HTML artifact.

---

## When to Invoke This Skill

Trigger this workflow whenever the user asks:
1. **Architecture & Topology**: *"Map this repository's architecture,"* *"Show me how this project is structured,"* or *"Visualize the codebase."*
2. **Blast Radius & Impact**: *"What breaks if I modify `src/auth/session.ts`?"* or *"What is the blast radius of this change?"*
3. **Refactoring Safety Gate**: *"Is it safe to delete/refactor this module?"*
4. **Pull Request & Git Review**: *"Check the blast radius of my current Git diff before I commit."*

---

## Quick Execution Commands

### 1. Full Repository Architecture Scan & Interactive Visualizer
Scan the current workspace and generate an interactive single-file HTML visualizer:

```bash
python sentinel.py scan . --out ./sentinel-architecture.html --json
```

### 2. File Blast-Radius & Ripple-Effect Analysis
Calculate which upstream files import and depend on specific target file(s):

```bash
python sentinel.py blast-radius --changed <path/to/file1> <path/to/file2> --out ./sentinel-blast-radius.html --json
```

### 3. Git Diff Blast-Radius Gate (Pre-Commit / Pre-PR)
Calculate the blast radius of all uncommitted changes or active branch commits:

```bash
python sentinel.py git-diff --base origin/main --out ./sentinel-pr-blast.html --json
```

---

## How Claude Should Interpret & Report Results

When Sentinel executes with `--json`, it emits a structured summary into stdout:

```json
{
  "changed_files": ["src/types.py"],
  "affected_nodes": ["src/ast_extractor.py", "src/graph_engine.py", "src/viewer_generator.py", "sentinel.py"],
  "blast_radius_count": 4,
  "risk_level": "WARNING",
  "risk_score": 58,
  "critical_paths": [
    ["src/types.py", "src/graph_engine.py", "sentinel.py"]
  ],
  "summary": "Modifying 1 file(s) affects 4 upstream component(s) across 2 hops."
}
```

### Claude's Response Protocol:
1. **Executive Risk Tier**: State whether the change is `SAFE` (0–34), `WARNING` (35–69), or `CRITICAL` (70–100).
2. **Upstream Dependents Table**: Clearly list each affected file, its hop distance, and its architectural role (`MIDDLEWARE`, `LAYOUT`, `ROUTER`, `MODEL`, etc.).
3. **Critical Path Warnings**: Highlight any path leading into root entry points, API routes, or middleware.
4. **Visual Artifact Link**: Provide the user with a clickable link to open the generated interactive HTML report:
   `Open [sentinel-blast-radius.html](file:///path/to/sentinel-blast-radius.html) in your browser to inspect the interactive dependency canvas.`
