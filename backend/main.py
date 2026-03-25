"""Backend entry point — FastAPI + Uvicorn, runs on localhost."""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import HOST, PORT
from seed import seed

app = FastAPI(title="Crisis Trainer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # localhost only — Electron renderer
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules (added as the project grows)
from routes import user, topics, tests, sessions, reports, admin, dashboard  # noqa: E402

app.include_router(user.router,      prefix="/api/user",      tags=["user"])
app.include_router(topics.router,    prefix="/api/topics",    tags=["topics"])
app.include_router(tests.router,     prefix="/api/tests",     tags=["tests"])
app.include_router(sessions.router,  prefix="/api/sessions",  tags=["sessions"])
app.include_router(reports.router,   prefix="/api/reports",   tags=["reports"])
app.include_router(admin.router,     prefix="/api/admin",     tags=["admin"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    seed()  # Ensure data directory is initialized
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
