"""
Reset betting state and bootstrap FIFA World Cup 2026 fixtures.

Usage:
    python -m app.world_cup_bootstrap --reset
"""

import argparse
import asyncio
import os

from app.database import SessionLocal, init_db
from app.services.world_cup import bootstrap_world_cup


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Delete bets, markets, events, tournaments, football data and reset balances.")
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        summary = asyncio.run(bootstrap_world_cup(db, reset=args.reset))
        target = os.getenv("DATABASE_URL", "configured database")
        print(f"World Cup bootstrap complete for {target}")
        print(summary)
    finally:
        db.close()


if __name__ == "__main__":
    main()
