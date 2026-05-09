from fastapi import APIRouter, HTTPException, Depends

from config import settings
from db import get_db
from routers.scan import verify_token

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def _admin_emails() -> set[str]:
    return {
        email.strip().lower()
        for email in settings.ADMIN_EMAILS.split(",")
        if email.strip()
    }


@router.get("/waitlist")
async def get_waitlist(token=Depends(verify_token)):
    user_email = (getattr(token, "email", None) or "").lower()
    if not user_email or user_email not in _admin_emails():
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    result = (
        db.table("waitlist")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return {"entries": result.data or []}
