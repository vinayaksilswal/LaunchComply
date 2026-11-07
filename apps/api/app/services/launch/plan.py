"""Work out what an app needs to go live, from its saved repository analysis.

Inputs are dependency names, manifest paths and environment variable *names*
from the bounded repository inspection. Commands are suggestions the owner can
edit before launching; nothing here runs code or reads secret values.
"""
from __future__ import annotations

import hashlib
import posixpath
import re

FRONTEND_NEXT = {"next"}
FRONTEND_SPA = {"vite", "react", "vue", "svelte", "@angular/core", "react-scripts"}
NODE_API = {"express", "fastify", "@nestjs/core", "koa", "hono"}
PY_API = {"fastapi": "fastapi", "django": "django", "flask": "flask"}
POSTGRES = {"psycopg", "psycopg2", "psycopg2-binary", "asyncpg", "pg", "postgres", "@prisma/client", "prisma", "drizzle-orm", "sequelize", "typeorm", "@neondatabase/serverless"}
MEDIA = {"cloudinary", "next-cloudinary", "multer-storage-cloudinary"}
API_URL_KEY = re.compile(r"^(VITE_|NEXT_PUBLIC_|REACT_APP_|PUBLIC_)?(API|BACKEND|SERVER)_?(BASE_)?(URL|ORIGIN)$")
DB_KEY = re.compile(r"^(DATABASE_URL|POSTGRES_URL|DB_URL|PG_URL|NEON_DATABASE_URL)$")

PROVIDER_FOR = {"frontend": "VERCEL", "backend": "RENDER", "database": "NEON", "media": "CLOUDINARY"}
EXPLAIN = {
    "frontend": "The website your visitors open in the browser.",
    "backend": "The server code that handles logins, data and business logic.",
    "database": "Where your app stores its data permanently.",
    "media": "Where uploaded images and files are stored and served.",
}


def _split(path: str, repositories: list[str]) -> tuple[str, str]:
    """('owner/repo', 'folder') for a prefixed evidence path."""
    for repo in sorted(repositories, key=len, reverse=True):
        if path.lower().startswith(repo.lower() + "/"):
            return repo, posixpath.dirname(path[len(repo) + 1:])
    parts = path.split("/")
    return "/".join(parts[:2]), posixpath.dirname("/".join(parts[2:]))


def _part_id(role: str, repo: str, folder: str) -> str:
    return role + "-" + hashlib.sha256(f"{repo.lower()}|{folder}".encode()).hexdigest()[:10]


def _python_entry(modules: list[dict], repo: str, folder: str) -> str | None:
    prefix = f"{repo}/{folder}/" if folder else f"{repo}/"
    for module in modules:
        path = module.get("path", "")
        if not path.startswith(prefix) or module.get("language") != "Python":
            continue
        name = posixpath.basename(path)
        if name in ("main.py", "app.py", "server.py") and any("fastapi" in i.lower() or "flask" in i.lower() for i in module.get("imports", [])):
            relative = path[len(prefix):-3].replace("/", ".")
            return relative
    return None


def build_plan(evidence: dict | None) -> dict:
    evidence = evidence or {}
    repositories = [r["full_name"] for r in evidence.get("repositories") or [] if r.get("full_name")]
    if not repositories and evidence.get("repository") and "," not in evidence["repository"]:
        repositories = [evidence["repository"]]
    branches = {r["full_name"].lower(): r.get("branch") or "main" for r in evidence.get("repositories") or [] if r.get("full_name")}
    if not branches and repositories:
        branches[repositories[0].lower()] = evidence.get("branch") if evidence.get("branch") and " " not in evidence["branch"] else "main"
    files = evidence.get("files") or []
    modules = evidence.get("modules") or []
    manifest_dirs = {}
    for item in files:
        repo, folder = _split(item["path"], repositories)
        entry = manifest_dirs.setdefault((repo, folder), {"deps": set(), "files": set()})
        entry["deps"] |= {d.lower() for d in item.get("dependencies") or []}
        entry["files"].add(posixpath.basename(item["path"]))
    env_by_dir: dict[tuple[str, str], set[str]] = {}
    for module in modules:
        repo, folder = _split(module.get("path", ""), repositories)
        owner = max((d for d in manifest_dirs if d[0] == repo and (not d[1] or folder == d[1] or folder.startswith(d[1] + "/"))),
                    key=lambda d: len(d[1]), default=None)
        if owner:
            env_by_dir.setdefault(owner, set()).update(k["name"] for k in module.get("environment_keys") or [])

    parts, needs_db, needs_media = [], False, False
    for (repo, folder), info in sorted(manifest_dirs.items()):
        deps, names, env = info["deps"], info["files"], sorted(env_by_dir.get((repo, folder), set()))
        needs_db |= bool(deps & POSTGRES) or any(DB_KEY.match(k) for k in env)
        needs_media |= bool(deps & MEDIA) or any("CLOUDINARY" in k for k in env)
        base = {"repo": repo, "root_dir": folder or None, "branch": branches.get(repo.lower(), "main"), "env_keys": env}
        if "package.json" in names and deps & FRONTEND_NEXT:
            parts.append({**base, "role": "frontend", "framework": "nextjs", "framework_label": "Next.js",
                          "build_command": None, "start_command": None})
        elif "package.json" in names and deps & FRONTEND_SPA and not deps & NODE_API:
            framework = "vite" if "vite" in deps else "create-react-app" if "react-scripts" in deps else None
            parts.append({**base, "role": "frontend", "framework": framework, "framework_label": "Vite" if framework == "vite" else "React",
                          "build_command": None, "start_command": None})
        elif "package.json" in names and deps & NODE_API:
            parts.append({**base, "role": "backend", "runtime": "docker" if "Dockerfile" in names else "node",
                          "framework_label": next(n for n in ("express", "fastify", "@nestjs/core", "koa", "hono") if n in deps).replace("@nestjs/core", "NestJS").title(),
                          "build_command": "npm install", "start_command": "npm start"})
        elif names & {"requirements.txt", "pyproject.toml"} and deps & set(PY_API):
            kind = next(PY_API[n] for n in PY_API if n in deps)
            entry = _python_entry(modules, repo, folder) or "main"
            start = {"fastapi": f"uvicorn {entry}:app --host 0.0.0.0 --port $PORT",
                     "flask": f"gunicorn {entry}:app --bind 0.0.0.0:$PORT",
                     "django": "gunicorn config.wsgi:application --bind 0.0.0.0:$PORT"}[kind]
            parts.append({**base, "role": "backend", "runtime": "docker" if "Dockerfile" in names else "python",
                          "framework_label": kind.title() if kind != "fastapi" else "FastAPI",
                          "build_command": "pip install -r requirements.txt" if "requirements.txt" in names else "pip install .",
                          "start_command": start})
    # Frontend folders nested inside a backend's folder are separate parts; drop exact duplicates only.
    seen, unique = set(), []
    for part in parts:
        key = (part["role"], part["repo"].lower(), part["root_dir"])
        if key not in seen:
            seen.add(key)
            unique.append(part)
    parts = unique
    if needs_db:
        parts.append({"role": "database", "repo": None, "root_dir": None, "branch": None, "env_keys": [], "framework_label": "PostgreSQL"})
    if needs_media:
        parts.append({"role": "media", "repo": None, "root_dir": None, "branch": None, "env_keys": [], "framework_label": "Image & file storage"})
    for part in parts:
        part["id"] = _part_id(part["role"], part.get("repo") or "", part.get("root_dir") or "")
        part["provider"] = PROVIDER_FOR[part["role"]]
        part["explanation"] = EXPLAIN[part["role"]]
        part["api_url_key"] = next((k for k in part["env_keys"] if API_URL_KEY.match(k)), None) if part["role"] == "frontend" else None
        part["database_url_key"] = next((k for k in part["env_keys"] if DB_KEY.match(k)), "DATABASE_URL") if part["role"] == "backend" else None
        slug = re.sub(r"[^a-z0-9-]+", "-", "-".join(x for x in ((part.get("repo") or "").split("/")[-1], part.get("root_dir") or "") if x).lower()).strip("-")
        part["suggested_name"] = (slug or part["role"])[:48] + ("-api" if part["role"] == "backend" and "api" not in slug and "backend" not in slug else "")
    order = {"database": 0, "backend": 1, "frontend": 2, "media": 3}
    parts.sort(key=lambda p: (order[p["role"]], p.get("repo") or "", p.get("root_dir") or ""))
    return {"parts": parts, "analyzed": bool(files), "repositories": repositories,
            "scope": "Detected from dependency manifests and environment variable names in the last code analysis. Review commands before launching."}


def _norm(folder: str | None) -> str:
    return (folder or "").strip().strip("/").lower()


def attach_status(plan: dict, resources: list[dict]) -> dict:
    """Mark parts already running, by repository and folder (or by type for database/media)."""
    used: set[str] = set()
    for part in plan["parts"]:
        match = None
        if part["role"] in ("frontend", "backend"):
            kinds = ("frontend", "static_site") if part["role"] == "frontend" else ("web_service", "private_service")
            match = next((r for r in resources if r["kind"] in kinds and r["id"] not in used and (r.get("repo") or "").lower() == part["repo"].lower()
                          and _norm(r.get("root_dir")) == _norm(part.get("root_dir"))), None)
        elif part["role"] == "database":
            backends = [p.get("live", {}).get("resource_id") for p in plan["parts"] if p["role"] == "backend" and p.get("live")]
            linked = [l["resource_id"] for r in resources if r["id"] in backends for l in r.get("links") or []]
            match = next((r for r in resources if r["kind"] == "database" and r["id"] in linked), None) \
                or next((r for r in resources if r["kind"] == "database" and r["name"] == part.get("suggested_name")), None)
        elif part["role"] == "media":
            match = next((r for r in resources if r["kind"] == "media"), None)
        if match:
            used.add(match["id"])
            part["live"] = {"resource_id": match["id"], "connection_id": match.get("connection_id"), "name": match["name"],
                            "status": match["status"], "status_detail": match.get("status_detail"), "urls": match.get("urls") or [],
                            "uptime_24h": match.get("uptime_24h")}
        else:
            part["live"] = None
    return plan


FINGERPRINT_FIELDS = ("id", "role", "provider", "repo", "root_dir", "branch", "framework", "runtime")


def fingerprint(part: dict, connection_id: str | None) -> str:
    """Identity of what the owner reviewed: detected source/target, not editable names or commands."""
    import json
    data = {k: part.get(k) for k in FINGERPRINT_FIELDS} | {"connection_id": connection_id}
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


PORT = re.compile(r"\$\{?PORT\}?")


def readiness(part: dict, parts: list[dict], source_changed: bool, start_command: str | None = None) -> tuple[list[str], list[str]]:
    """Plain-language blockers (must fix before creating) and warnings (worth checking)."""
    blockers, warnings = [], []
    if source_changed and part["role"] in ("frontend", "backend"):
        blockers.append("Your code changed since LaunchComply last read it. Run “Look at my code” again so the plan matches it.")
    if part["role"] == "backend":
        command = part.get("start_command") if start_command is None else start_command
        if part.get("runtime") != "docker":
            if not command:
                blockers.append("Enter the command that starts your backend.")
            elif not PORT.search(command):
                blockers.append("Render tells your app which port to use in $PORT. Your start command must listen on it, for example “--port $PORT”.")
        if any(p["role"] == "database" for p in parts) and part.get("database_url_key") == "DATABASE_URL" and "DATABASE_URL" not in part.get("env_keys", []):
            warnings.append("Your backend code does not read DATABASE_URL by name. Check which setting it uses for the database before connecting.")
    if part["role"] == "frontend":
        if any(p["role"] == "backend" for p in parts) and not part.get("api_url_key"):
            warnings.append("Your website code does not read an API address setting, so it may call a fixed address. Check it points at your new backend.")
        if not part.get("framework"):
            warnings.append("The website framework was not recognised. Vercel will try to detect it.")
    return blockers, warnings
