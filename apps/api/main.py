from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.admin import router as admin_router
from routers.blast_radius import router as br_router
from routers.scan import router as scan_router

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

app.include_router(br_router)
app.include_router(scan_router)
app.include_router(admin_router)
