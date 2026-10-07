"""Validate migration state and required schema without creating tables."""
from pathlib import Path
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text
from app.core.database import Base


def check_hosted_schema(connection):
    api_directory = Path(__file__).resolve().parents[2]
    config = Config(str(api_directory / "alembic.ini"))
    config.set_main_option("script_location", str(api_directory / "alembic"))
    expected_heads = set(ScriptDirectory.from_config(config).get_heads())
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    if "alembic_version" not in tables:
        raise RuntimeError("Database is not migrated. Run Alembic before deployment.")
    actual_heads = set(connection.execute(text("SELECT version_num FROM alembic_version")).scalars())
    if actual_heads != expected_heads:
        raise RuntimeError("Database migration revision does not match this release.")
    missing_tables = set(Base.metadata.tables) - tables
    if missing_tables:
        raise RuntimeError("Database revision exists but required tables are missing. Restore or repair the database before deployment.")
    for table_name, table in Base.metadata.tables.items():
        actual_columns = {column["name"] for column in inspector.get_columns(table_name)}
        if set(table.columns.keys()) - actual_columns:
            raise RuntimeError("Database revision exists but required columns are missing. Restore or repair the database before deployment.")
