"""Reuse PostgreSQL named enums across tables in Alembic migrations."""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM
from alembic import context, op

_offline_enum_names: set[str] = set()


def enum_type(*values, **kwargs):
    if op.get_bind().dialect.name != "postgresql":
        return sa.Enum(*values, **kwargs)
    enum = ENUM(*values, **kwargs, create_type=False)
    if context.is_offline_mode():
        if enum.name not in _offline_enum_names:
            enum.create(op.get_bind(), checkfirst=False)
            _offline_enum_names.add(enum.name)
    else:
        enum.create(op.get_bind(), checkfirst=True)
    return enum
