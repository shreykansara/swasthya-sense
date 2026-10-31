"""
FastAPI Main Application Entrypoint
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

from contextlib import asynccontextmanager
import time
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from apps.api.app.config import settings
from apps.api.app.routes import api_router
from apps.api.app.perfusion.routes import router as perfusion_router
from apps.api.app.utils.logger import logger
from apps.api.app.perfusion.service import model_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for startup and shutdown hooks."""
    logger.info("Initializing Swasthya Sense API services...")
    start_t = time.perf_counter()
    model_service.load_artifacts()
    load_time_ms = round((time.perf_counter() - start_t) * 1000.0, 2)
    app.state.perfusion = {
        "model_service": model_service,
        "load_time_ms": load_time_ms,
        "targets": ["CAD", "LAD", "LCX", "RCA"],
        "is_ready": model_service.is_ready,
    }
    logger.info(
        f'{{"event": "perfusion_models_loaded", "load_time_ms": {load_time_ms}, "status": "ready"}}'
    )
    yield
    logger.info("Shutting down Swasthya Sense API services...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Swasthya Sense — Cardiac follow-up and early-warning prototype for health workers, clinicians and patients.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_clinical_disclaimer_header(request: Request, call_next):
    """Injects mandatory prototype and disclaimer headers into every API response."""
    response = await call_next(request)
    response.headers["X-Application-Name"] = "Swasthya Sense"
    response.headers["X-Prototype-Notice"] = "Prototype - Synthetic data only - Not a medical device"
    return response


# Root health probe
@app.get("/health", tags=["System"])
def root_health():
    """Root health probe."""
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "disclaimer": settings.CLINICAL_DISCLAIMER,
    }


# Mount API V1 Router and Perfusion Router
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(perfusion_router)
app.include_router(perfusion_router, prefix=settings.API_V1_STR)

# Mount production Web UI if build distribution exists
if settings.WEB_DIST_DIR.exists():
    logger.info(f"Mounting production Web UI from {settings.WEB_DIST_DIR}")
    assets_dir = settings.WEB_DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if (
            full_path.startswith("api")
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path.startswith("health")
            or full_path.startswith("perfusion")
        ):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = settings.WEB_DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(settings.WEB_DIST_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apps.api.app.main:app", host="0.0.0.0", port=8000, reload=True)
