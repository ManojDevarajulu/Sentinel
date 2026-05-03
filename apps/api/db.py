from supabase import create_client, Client
from config import settings

def get_db() -> Client:
    # Use mock client for now to match Phase 1 logic
    class MockClient:
        def table(self, name):
            return self
        def select(self, *args):
            return self
        def eq(self, *args):
            return self
        def execute(self):
            return type('MockResponse', (), {'data': []})()
    
    # Try to initialize real supabase if URL is valid, else return Mock
    if "mock" in settings.SUPABASE_URL:
        return MockClient()
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

db_client = get_db()
