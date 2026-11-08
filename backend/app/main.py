from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.accounts import router as accounts_router
from app.config import Settings
from app.documents import ReadinessRequest, document_readiness
from app.health import check_dependencies, create_probes
from app.logging import configure_logging
from app.ocr import router as ocr_router
from app.uploads import router as uploads_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(
        title="Neerikkha API",
        version="0.1.0",
        description=(
            "Pilot case management and encrypted document storage. "
            "Local OCR and text review. Risk analysis and admin provisioning are not available yet."
        ),
    )
    app.state.probes = create_probes(settings)
    app.state.settings = settings
    app.include_router(accounts_router)
    app.include_router(uploads_router)
    app.include_router(ocr_router)
    logger = configure_logging()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_metadata(request: Request, call_next):
        request_id = str(uuid4())  # Never reflect an untrusted header into logs.
        start = perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            response = JSONResponse({"detail": "Internal server error"}, status_code=500)
        response.headers["X-Request-ID"] = request_id
        response.headers["Cache-Control"] = "no-store"
        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": round((perf_counter() - start) * 1000),
            },
        )
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Pydantic's default response includes rejected input. Do not echo private values.
        fields = sorted(
            {
                str(error["loc"][-1])
                for error in exc.errors()
                if error["loc"] and error["loc"][-1] in ("email", "password", "display_name")
            }
        )
        return JSONResponse({"detail": "Invalid request", "fields": fields}, status_code=422)

    @app.get("/health/live", tags=["health"])
    async def live():
        return {"status": "ok", "service": "neerikkha-api"}

    @app.get("/health", tags=["health"])
    async def health():
        result = await check_dependencies(app.state.probes)
        return JSONResponse(result, status_code=200 if result["status"] == "ok" else 503)

    @app.post("/api/v1/document-requirements/check", tags=["document contract"])
    async def readiness(body: ReadinessRequest):
        return document_readiness(body.document_types)

    return app


app = create_app()
