from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, omr, analysis

app = FastAPI(
    title="Practice Forge Analysis Service",
    version="1.0.0",
    description="OMR and music analysis service for Practice Forge",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(omr.router, prefix="/omr", tags=["omr"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
