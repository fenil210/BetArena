from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import auth, users, admin, tournaments, events, markets, bets, leaderboard, feed


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run on startup: create all tables if they don't exist."""
    init_db()
    yield


app = FastAPI(
    title="Football Betting Platform",
    description="Private virtual betting platform for football predictions",
    version="0.1.0",
    lifespan=lifespan,
)

# -- CORS --
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Routers --
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(tournaments.router)
app.include_router(events.router)
app.include_router(markets.router)
app.include_router(bets.router)
app.include_router(leaderboard.router)
app.include_router(feed.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
