from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load .env before anything else
load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import init_db, CHARTS_DIR
from .scheduler import start_scheduler, stop_scheduler
from .routers import reports, sources, watchlist


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="AI Update", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your Vercel domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CHARTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/charts", StaticFiles(directory=str(CHARTS_DIR)), name="charts")

app.include_router(reports.router)
app.include_router(sources.router)
app.include_router(watchlist.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": "AI Update"}
