from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from db import get_db
from tasks.scanner import run_repo_scan

router = APIRouter(prefix="/repos", tags=["repos"])
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    # Verify the Supabase JWT
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Invalid or missing token")
        
    db = get_db()
    try:
        user_response = db.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

class ScanRequest(BaseModel):
    repo_id: str
    repo_path: str

@router.post("/{repo_id}/scan")
async def scan_repository(repo_id: str, payload: ScanRequest, token: str = Depends(verify_token)):
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
