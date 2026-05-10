from fastapi import APIRouter, HTTPException, Depends, Security, UploadFile, File, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from db import get_db
from tasks.scanner import run_repo_scan_sync
import os
import shutil
import zipfile
import subprocess
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/repos", tags=["repos"])
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
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
    github_token: str | None = None


def _create_scan_job(repo_id: str) -> str:
    """Create a scan_jobs row and return job_id. Uses service key to bypass RLS."""
    db = get_db()
    try:
        job_insert = db.table("scan_jobs").insert({"repo_id": repo_id, "status": "pending"}).execute()
        if job_insert.data:
            return job_insert.data[0]["id"]
    except Exception as e:
        logger.warning(f"Could not insert scan_jobs row (RLS or missing table): {e}")
    # Return a placeholder job ID if scan_jobs table doesn't exist or RLS blocks
    import uuid
    return str(uuid.uuid4())


@router.post("/{repo_id}/scan")
async def scan_repository(repo_id: str, payload: ScanRequest, background_tasks: BackgroundTasks, token=Depends(verify_token)):
    if repo_id != payload.repo_id:
        raise HTTPException(status_code=400, detail="Path parameter repo_id must match payload repo_id")

    job_id = _create_scan_job(repo_id)
    background_tasks.add_task(run_repo_scan_sync, job_id, repo_id, payload.repo_path)
    return {"status": "accepted", "job_id": job_id}


@router.post("/{repo_id}/upload")
async def upload_and_scan(repo_id: str, background_tasks: BackgroundTasks, file: UploadFile = File(...), token=Depends(verify_token)):
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

    job_id = _create_scan_job(repo_id)
    background_tasks.add_task(run_repo_scan_sync, job_id, repo_id, scan_target)
    return {"status": "accepted", "job_id": job_id}


@router.post("/{repo_id}/scan-github")
async def scan_github_repository(repo_id: str, payload: GitHubScanRequest, background_tasks: BackgroundTasks, token=Depends(verify_token)):
    if repo_id != payload.repo_id:
        raise HTTPException(status_code=400, detail="Path parameter repo_id must match payload repo_id")

    logger.info(f"scan-github called for repo_id={repo_id}, url={payload.github_url}")

    tmp_dir = f"/tmp/sentinel_scans/{repo_id}/cloned"
    if os.path.exists(tmp_dir):
        shutil.rmtree(tmp_dir)

    try:
        clone_url = payload.github_url
        if payload.github_token and clone_url.startswith("https://github.com/"):
            clone_url = clone_url.replace("https://github.com/", f"https://oauth2:{payload.github_token}@github.com/")
        logger.info(f"Cloning repo to {tmp_dir}...")
        subprocess.run(["git", "clone", "--depth", "1", clone_url, tmp_dir], check=True, capture_output=True)
        logger.info(f"Clone succeeded for repo_id={repo_id}")
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode('utf-8') if e.stderr else 'Unknown error'
        logger.error(f"Clone failed: {stderr}")
        raise HTTPException(status_code=400, detail=f"Failed to clone repository: {stderr}")

    job_id = _create_scan_job(repo_id)
    logger.info(f"Scan job created: {job_id}, starting background scan...")
    background_tasks.add_task(run_repo_scan_sync, job_id, repo_id, tmp_dir)
    return {"status": "accepted", "job_id": job_id}
