import sys
from os.path import abspath, dirname
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context

# Add app to path
sys.path.insert(0, dirname(dirname(abspath(__file__))))

from app.core.config import settings
from app.models.base import Base
import app.models  # Ensure all models are registered with Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def get_sync_url() -> str:
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite+aiosqlite:"):
        return db_url.replace("sqlite+aiosqlite:", "sqlite:")
    elif db_url.startswith("postgresql+asyncpg:"):
        return db_url.replace("postgresql+asyncpg:", "postgresql://")
    return db_url

def run_migrations_offline() -> None:
    url = get_sync_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = create_engine(
        get_sync_url(),
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
