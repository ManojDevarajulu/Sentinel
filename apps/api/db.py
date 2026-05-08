from supabase import create_client, Client
from config import settings


def get_db() -> Client:
    """Return a real Supabase client. Prefer service key for server-side ops."""
    key = (
        settings.SUPABASE_SERVICE_KEY
        if settings.SUPABASE_SERVICE_KEY not in ("", "mock-key")
        else settings.SUPABASE_ANON_KEY
    )
    return create_client(settings.SUPABASE_URL, key)


# Module-level singleton for services that import db_client directly
db_client = get_db()
