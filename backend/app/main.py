from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.api import auth, users, members, transactions, categories, feedback, admin, gdpr
from app.api import stripe_api, payment_reminders, events, sepa, member_groups


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="VereinsKasse API",
    description="Kassenverwaltung für deutsche Vereine",
    version=settings.APP_VERSION,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/api/openapi.json" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(members.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(feedback.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(gdpr.router, prefix="/api/v1")
app.include_router(stripe_api.router, prefix="/api/v1")
app.include_router(payment_reminders.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(sepa.router, prefix="/api/v1")
app.include_router(member_groups.router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION, "app": "VereinsKasse"}


@app.get("/api/v1/")
async def api_root():
    return {"message": "VereinsKasse API v1", "docs": "/api/docs"}
