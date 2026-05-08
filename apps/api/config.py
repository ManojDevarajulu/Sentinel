from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str = "https://mock.supabase.co"
    SUPABASE_SERVICE_KEY: str = "mock-key"
    SUPABASE_ANON_KEY: str = "mock-key"
    REDIS_URL: str = "redis://localhost:6379/0"
    ANTHROPIC_API_KEY: str = ""
    GITHUB_APP_ID: str = ""
    GITHUB_APP_PRIVATE_KEY: str = ""
    GITHUB_WEBHOOK_SECRET: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    RESEND_API_KEY: str = ""
    PARSER_BUN_PATH: str = "../../packages/parser/src/index.ts"

    class Config:
        env_file = ".env"

settings = Settings()
