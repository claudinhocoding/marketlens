"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.db.models import init_db
from .routes import router

app = FastAPI(
    title="MarketLens",
    description="Competitive Intelligence Platform — scrape, analyze, and compare competitors",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {
        "name": "MarketLens",
        "version": "1.0.0",
        "docs": "/docs",
    }
