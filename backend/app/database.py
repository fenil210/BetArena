from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db():
    """Create all tables. Called on app startup instead of Alembic migrations."""
    # Import all models so Base.metadata knows about them
    import app.models.user  # noqa: F401
    import app.models.football_data  # noqa: F401
    import app.models.tournament  # noqa: F401
    import app.models.event  # noqa: F401
    import app.models.market  # noqa: F401
    import app.models.bet  # noqa: F401
    import app.models.activity  # noqa: F401

    Base.metadata.create_all(bind=engine)
