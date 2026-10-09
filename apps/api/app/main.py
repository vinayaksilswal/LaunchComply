from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seed_service import seed_initial_data
from app.api.v1.router import api_v1_router
from sqlalchemy import text
from sqlalchemy.orm import configure_mappers
from app.core.upload_limits import CodeUploadLimitMiddleware
import asyncio
import app.models  # Ensure all models are registered with Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    valid, blockers, _ = settings.validate_hosted_environment()
    if not valid:
        raise RuntimeError("Invalid hosted configuration: " + " ".join(blockers))

    # Resolve every model relationship before reporting readiness or accepting requests.
    configure_mappers()

    # Hosted schemas are managed by Alembic before deployment, never by startup.
    if settings.ENVIRONMENT.lower() in ("development", "test", "demo"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        if settings.DEMO_MODE:
            async with AsyncSessionLocal() as session:
                await seed_initial_data(session)
    else:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            from app.core.schema_check import check_hosted_schema
            await conn.run_sync(check_hosted_schema)

    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="LaunchComply — From Localhost to Real Business. Deploy. Secure. Audit. Comply.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CodeUploadLimitMiddleware, path=f"{settings.API_V1_STR}/onboarding/upload")

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.url.path.startswith(f"{settings.API_V1_STR}/") or request.url.path in ("/health", "/health/live", "/health/ready"):
        response.headers["Cache-Control"] = "no-store"
    return response

# Root & Health check
@app.get("/")
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "tagline": "From Localhost to Real Business.",
        "status": "ONLINE",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    result = await readiness()
    if isinstance(result, dict):
        result["status"] = "HEALTHY"
    return result

@app.get("/health/live")
async def liveness():
    return {"status": "ALIVE"}

@app.get("/health/ready")
@app.get(f"{settings.API_V1_STR}/health/ready", include_in_schema=False)
async def readiness():
    try:
        async with asyncio.timeout(5):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "NOT_READY", "database": "UNAVAILABLE"})
    return {"status": "READY", "database": "CONNECTED", "version": settings.VERSION}

# Mount API V1
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# Mount Public Enterprise Assurance API
from app.api.v1.assurance import public_assurance_router
app.include_router(public_assurance_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
