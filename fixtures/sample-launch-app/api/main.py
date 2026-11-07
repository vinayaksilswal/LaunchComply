"""Sample backend for LaunchComply's live launch test.

Counts visits in Postgres. Reads DATABASE_URL, which LaunchComply sets in the
"Connect & go live" step. No secrets are stored in this repository.
"""
import os

import psycopg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LaunchComply sample shop API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])


def database_url() -> str | None:
    return os.getenv("DATABASE_URL")


@app.get("/health")
def health():
    return {"status": "ok", "database_configured": bool(database_url())}


@app.post("/api/visits")
def add_visit():
    url = database_url()
    if not url:
        return {"count": None, "message": "Database not connected yet. Run LaunchComply's “Connect & go live” step."}
    with psycopg.connect(url, connect_timeout=10) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS visits (id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now())")
        conn.execute("INSERT INTO visits DEFAULT VALUES")
        count = conn.execute("SELECT count(*) FROM visits").fetchone()[0]
    return {"count": count, "message": "Saved to your Neon database."}
