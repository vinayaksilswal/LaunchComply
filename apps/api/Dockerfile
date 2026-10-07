FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ENVIRONMENT=production \
    DEBUG=false \
    DEMO_MODE=false \
    PORT=8000

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt \
    && groupadd --gid 10001 launchcomply \
    && useradd --uid 10001 --gid launchcomply --create-home launchcomply \
    && chown launchcomply:launchcomply /app

COPY --chown=launchcomply:launchcomply app/ ./app/
COPY --chown=launchcomply:launchcomply alembic/ ./alembic/
COPY --chown=launchcomply:launchcomply alembic.ini ./

USER launchcomply
EXPOSE 8000
CMD ["python", "-m", "app.container_start"]
