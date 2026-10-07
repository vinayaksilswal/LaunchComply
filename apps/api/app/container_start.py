"""Validate configuration, optionally migrate, then replace this process with Uvicorn."""
import os
import subprocess
import sys

from app.core.config import settings


def main():
    valid, blockers, _ = settings.validate_hosted_environment()
    if not valid:
        print("Invalid hosted configuration: " + " ".join(blockers), file=sys.stderr)
        raise SystemExit(1)
    try:
        port = int(os.environ.get("PORT", "8000"))
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        print("PORT must be a number between 1 and 65535.", file=sys.stderr)
        raise SystemExit(1)

    if settings.MIGRATE_ON_STARTUP:
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)

    os.execv(sys.executable, [
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0", "--port", str(port),
    ])


if __name__ == "__main__":
    main()
