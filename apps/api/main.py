from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.admin import router as admin_router
from routers.blast_radius import router as br_router
from routers.scan import router as scan_router
from db import get_db
import subprocess
import os
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title='GuardRail API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', '*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/health')
async def health():
    return {'status': 'ok', 'version': '0.1.0'}

@app.get('/debug')
async def debug():
    """Diagnostic endpoint — shows what's working and what's broken."""
    checks = {}

    # 1. Check bun
    try:
        r = subprocess.run(["bun", "--version"], capture_output=True, text=True, timeout=10)
        checks["bun"] = {"ok": r.returncode == 0, "version": r.stdout.strip(), "error": r.stderr.strip() if r.returncode != 0 else None}
    except Exception as e:
        checks["bun"] = {"ok": False, "error": str(e)}

    # 2. Check python
    try:
        r = subprocess.run(["python", "--version"], capture_output=True, text=True, timeout=10)
        checks["python"] = {"ok": r.returncode == 0, "version": r.stdout.strip()}
    except Exception as e:
        checks["python"] = {"ok": False, "error": str(e)}

    # 3. Check git
    try:
        r = subprocess.run(["git", "--version"], capture_output=True, text=True, timeout=10)
        checks["git"] = {"ok": r.returncode == 0, "version": r.stdout.strip()}
    except Exception as e:
        checks["git"] = {"ok": False, "error": str(e)}

    # 4. Check parser file exists
    tasks_dir = os.path.dirname(os.path.abspath(__file__))
    parser_path = os.path.normpath(os.path.join(tasks_dir, "tasks", "..", "packages", "parser", "src", "index.ts"))
    py_parser_path = os.path.normpath(os.path.join(tasks_dir, "tasks", "python_parser.py"))
    checks["ts_parser_exists"] = {"ok": os.path.exists(parser_path), "path": parser_path}
    checks["py_parser_exists"] = {"ok": os.path.exists(py_parser_path), "path": py_parser_path}

    # 5. Check DB connection + service key
    try:
        db = get_db()
        result = db.table("repos").select("id").limit(1).execute()
        checks["db_read"] = {"ok": True, "repos_readable": len(result.data)}
    except Exception as e:
        checks["db_read"] = {"ok": False, "error": str(e)}

    # 6. Check scan_jobs
    try:
        db = get_db()
        result = db.table("scan_jobs").select("id, repo_id, status, error_message").order("created_at", desc=True).limit(5).execute()
        checks["scan_jobs"] = {"ok": True, "recent_jobs": result.data}
    except Exception as e:
        checks["scan_jobs"] = {"ok": False, "error": str(e)}

    # 7. List /tmp directory
    tmp_scans = "/tmp/sentinel_scans"
    if os.path.exists(tmp_scans):
        checks["tmp_scans"] = {"ok": True, "contents": os.listdir(tmp_scans)[:10]}
    else:
        checks["tmp_scans"] = {"ok": False, "error": "Directory does not exist"}

    return checks

app.include_router(br_router)
app.include_router(scan_router)
app.include_router(admin_router)

