from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import get_db
from tasks.scanner import run_repo_scan

router = APIRouter(prefix="/repos", tags=["repos"])

class ScanRequest(BaseModel):
    repo_id: str
    repo_path: str

@router.post("/{repo_id}/scan")
async def scan_repository(repo_id: str, payload: ScanRequest):
    if repo_id != payload.repo_id:
        raise HTTPException(status_code=400, detail="Path parameter repo_id must match payload repo_id")
        
    db = get_db()
    
    # Check if repo exists
    repo = db.table("repos").select("id").eq("id", repo_id).execute()
    if not repo.data:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    # Insert a new scan job
    job_insert = db.table("scan_jobs").insert({
        "repo_id": repo_id,
        "status": "pending"
    }).execute()
    
    if not job_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create scan job")
        
    job_id = job_insert.data[0]["id"]
    
    # Dispatch Celery task asynchronously
    run_repo_scan.delay(job_id, repo_id, payload.repo_path)
    
    return {"status": "accepted", "job_id": job_id}
