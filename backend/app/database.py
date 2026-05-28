from sqlalchemy import create_engine, inspect, text
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
    ensure_runtime_schema()


def ensure_runtime_schema():
    """Apply small additive schema updates for deployments without Alembic."""
    additive_columns = {
        "teams": {
            "tla": "VARCHAR(10)",
        },
        "matches": {
            "group_name": "VARCHAR(100)",
            "venue": "VARCHAR(255)",
            "last_updated": "TIMESTAMP WITH TIME ZONE",
            "metadata_json": "JSON",
        },
    }

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table_name, columns in additive_columns.items():
            if table_name not in existing_tables:
                continue

            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            for column_name, ddl in columns.items():
                if column_name not in existing_columns:
                    conn.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}")
                    )

        if engine.dialect.name == "postgresql" and "matches" in existing_tables:
            conn.execute(text("ALTER TABLE matches ALTER COLUMN home_team_id DROP NOT NULL"))
            conn.execute(text("ALTER TABLE matches ALTER COLUMN away_team_id DROP NOT NULL"))
