from fastapi import APIRouter, HTTPException, Depends, Security, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from db import get_db
from tasks.scanner import run_repo_scan
import os
import shutil
import zipfile
import subprocess

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

class GitHubScanRequest(BaseModel):
    repo_id: str
    github_url: str

@router.post("/{repo_id}/scan")
async def scan_repository(repo_id: str, payload: ScanRequest, token=Depends(verify_token)):
    if repo_id != payload.repo_id:
        raise HTTPException(status_code=400, detail="Path parameter repo_id must match payload repo_id")
        
    db = get_db()
    user_id = getattr(token, "id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authenticated user id is missing")
    
    # Check that the repo exists and belongs to the authenticated user
    repo = (
        db.table("repos")
        .select("id, user_id")
        .eq("id", repo_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not repo.data:
        raise HTTPException(status_code=404, detail="Repository not found or not owned by this user")
        
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

@router.post("/{repo_id}/upload")
async def upload_and_scan(repo_id: str, file: UploadFile = File(...), token=Depends(verify_token)):
    db = get_db()
    user_id = getattr(token, "id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authenticated user id is missing")
    
    repo = db.table("repos").select("id").eq("id", repo_id).eq("user_id", user_id).execute()
    if not repo.data:
        raise HTTPException(status_code=404, detail="Repository not found")

    tmp_dir = f"/tmp/sentinel_scans/{repo_id}"
    os.makedirs(tmp_dir, exist_ok=True)
    
    zip_path = os.path.join(tmp_dir, "upload.zip")
    with open(zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    extract_dir = os.path.join(tmp_dir, "extracted")
    if os.path.exists(extract_dir):
        shutil.rmtree(extract_dir)
    os.makedirs(extract_dir, exist_ok=True)
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid zip file")
        
    scan_target = extract_dir
    extracted_items = os.listdir(extract_dir)
    if len(extracted_items) == 1 and os.path.isdir(os.path.join(extract_dir, extracted_items[0])):
        scan_target = os.path.join(extract_dir, extracted_items[0])

    job_insert = db.table("scan_jobs").insert({"repo_id": repo_id, "status": "pending"}).execute()
    job_id = job_insert.data[0]["id"]
    
    run_repo_scan.delay(job_id, repo_id, scan_target)
    
    return {"status": "accepted", "job_id": job_id}

@router.post("/{repo_id}/scan-github")
async def scan_github_repository(repo_id: str, payload: GitHubScanRequest, token=Depends(verify_token)):
    if repo_id != payload.repo_id:
        raise HTTPException(status_code=400, detail="Path parameter repo_id must match payload repo_id")
        
    db = get_db()
    user_id = getattr(token, "id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authenticated user id is missing")
    
    repo = db.table("repos").select("id").eq("id", repo_id).eq("user_id", user_id).execute()
    if not repo.data:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    tmp_dir = f"/tmp/sentinel_scans/{repo_id}/cloned"
    if os.path.exists(tmp_dir):
        shutil.rmtree(tmp_dir)
    
    try:
        subprocess.run(["git", "clone", "--depth", "1", payload.github_url, tmp_dir], check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=f"Failed to clone repository: {e.stderr.decode('utf-8') if e.stderr else 'Unknown error'}")
        
    job_insert = db.table("scan_jobs").insert({"repo_id": repo_id, "status": "pending"}).execute()
    job_id = job_insert.data[0]["id"]
    
    run_repo_scan.delay(job_id, repo_id, tmp_dir)
    
    return {"status": "accepted", "job_id": job_id}

