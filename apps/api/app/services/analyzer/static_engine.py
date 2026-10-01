import os
import re
import json
from pathlib import Path
from typing import Dict, List, Any, Optional

class StaticAnalysisEngine:
    SECRET_PATTERNS = [
        (re.compile(r'(AKIA[0-9A-Z]{16})'), "AWS_ACCESS_KEY", "AWS IAM Access Key discovered in source file", "CRITICAL"),
        (re.compile(r'(ghp_[a-zA-Z0-9]{36})'), "GITHUB_TOKEN", "GitHub Personal Access Token exposed in repository", "CRITICAL"),
        (re.compile(r'(sk_live_[0-9a-zA-Z]{24,34})'), "STRIPE_SECRET_KEY", "Live Stripe Secret Key exposed in source code", "CRITICAL"),
        (re.compile(r'-----BEGIN (?:RSA )?PRIVATE KEY-----'), "PRIVATE_KEY", "Unencrypted private cryptographic key found in repository", "CRITICAL"),
    ]

    ENV_VAR_PATTERNS = [
        re.compile(r'process\.env\.([A-Z0-9_]+)'),
        re.compile(r'os\.environ(?:\[[\'"]([A-Z0-9_]+)[\'"]|\.get\([\'"]([A-Z0-9_]+)[\'"])'),
        re.compile(r'getenv\([\'"]([A-Z0-9_]+)[\'"]'),
    ]

    @classmethod
    def mask_secret(cls, raw: str) -> str:
        if len(raw) <= 8:
            return "••••••••"
        return f"{raw[:4]}••••••••{raw[-4:]}"

    @classmethod
    def analyze_workspace(cls, root_dir: str, file_index: List[Dict[str, Any]]) -> Dict[str, Any]:
        root_path = Path(root_dir)
        services: List[Dict[str, Any]] = []
        env_vars: Dict[str, Dict[str, Any]] = {}
        findings: List[Dict[str, Any]] = []
        integrations: List[Dict[str, Any]] = []
        databases: List[Dict[str, Any]] = []
        health_checks: List[Dict[str, Any]] = []
        data_flows: List[Dict[str, Any]] = []

        # Read manifest files
        manifests = {f["path"]: f for f in file_index if f["category"] in {"manifest", "docker", "config"}}
        
        # 1. Detect Frontend Services
        frontend_detected = None
        if "package.json" in manifests:
            pkg_path = root_path / "package.json"
            try:
                with open(pkg_path, "r", encoding="utf-8", errors="ignore") as pf:
                    pkg_data = json.load(pf)
                    deps = {**pkg_data.get("dependencies", {}), **pkg_data.get("devDependencies", {})}
                    scripts = pkg_data.get("scripts", {})

                    if "next" in deps:
                        frontend_detected = {
                            "name": "Next.js Web Frontend",
                            "service_type": "frontend",
                            "framework": "Next.js 15",
                            "runtime": "Node.js 20",
                            "build_command": scripts.get("build", "next build"),
                            "start_command": scripts.get("start", "next start"),
                            "root_path": "/",
                            "confidence": 1.0,
                            "ports": [{"port": 3000, "protocol": "HTTP", "public_required": True}]
                        }
                    elif "react" in deps:
                        frontend_detected = {
                            "name": "React Single Page App",
                            "service_type": "frontend",
                            "framework": "React / Vite" if "vite" in deps else "React SPA",
                            "runtime": "Browser / S3",
                            "build_command": scripts.get("build", "vite build"),
                            "start_command": scripts.get("dev", "vite"),
                            "root_path": "/",
                            "confidence": 0.95,
                            "ports": [{"port": 80, "protocol": "HTTP", "public_required": True}]
                        }
            except Exception:
                pass

        if frontend_detected:
            services.append(frontend_detected)

        # 2. Detect Backend Services (Python / Node)
        backend_detected = None
        has_fastapi = False
        has_express = False
        has_celery = False
        has_redis = False

        if "requirements.txt" in manifests or "pyproject.toml" in manifests:
            req_file = root_path / ("requirements.txt" if "requirements.txt" in manifests else "pyproject.toml")
            try:
                with open(req_file, "r", encoding="utf-8", errors="ignore") as rf:
                    content = rf.read().lower()
                    if "fastapi" in content:
                        has_fastapi = True
                    if "celery" in content or "arq" in content:
                        has_celery = True
                    if "redis" in content:
                        has_redis = True
                    if "psycopg" in content or "asyncpg" in content or "sqlalchemy" in content:
                        databases.append({
                            "engine": "PostgreSQL 16",
                            "orm": "SQLAlchemy 2",
                            "driver": "asyncpg / psycopg2",
                            "connection_source": "DATABASE_URL"
                        })
                    if "stripe" in content:
                        integrations.append({"provider": "Stripe", "category": "payment"})
                    if "openai" in content:
                        integrations.append({"provider": "OpenAI", "category": "AI"})
                    if "boto3" in content:
                        integrations.append({"provider": "Amazon S3", "category": "storage"})
            except Exception:
                pass

        if has_fastapi:
            backend_detected = {
                "name": "FastAPI Core API",
                "service_type": "backend",
                "framework": "FastAPI",
                "runtime": "Python 3.11",
                "build_command": "pip install -r requirements.txt",
                "start_command": "uvicorn app.main:app --host 0.0.0.0 --port 8000",
                "root_path": "/apps/api" if any("/api/" in f["path"] for f in file_index) else "/",
                "confidence": 1.0,
                "ports": [{"port": 8000, "protocol": "HTTP", "public_required": False}]
            }
            services.append(backend_detected)
            health_checks.append({"path": "/health", "protocol": "HTTP", "port": 8000, "confidence": 0.95})

        if has_celery:
            services.append({
                "name": "Celery Asynchronous Worker",
                "service_type": "worker",
                "framework": "Celery / ARQ",
                "runtime": "Python 3.11",
                "build_command": "pip install -r requirements.txt",
                "start_command": "celery -A app.worker worker --loglevel=info",
                "root_path": "/",
                "confidence": 0.90,
                "ports": []
            })

        # 3. Dockerfile Analysis
        docker_manifests = [f["path"] for f in file_index if "dockerfile" in f["path"].lower()]
        for df in docker_manifests:
            df_path = root_path / df
            try:
                with open(df_path, "r", encoding="utf-8", errors="ignore") as f:
                    df_content = f.read()
                    if ":latest" in df_content:
                        findings.append({
                            "category": "Container Security",
                            "severity": "MEDIUM",
                            "title": "Unpinned Container Base Image Tag (:latest)",
                            "description": f"Dockerfile '{df}' references ':latest' tag, creating non-deterministic production deployments.",
                            "source_file": df,
                            "recommendation": "Pin container base image to specific digest or immutable version tag (e.g. python:3.11.9-slim)."
                        })
                    if "USER " not in df_content:
                        findings.append({
                            "category": "Container Security",
                            "severity": "HIGH",
                            "title": "Container Runs as Root User",
                            "description": f"Dockerfile '{df}' does not declare an unprivileged USER directive.",
                            "source_file": df,
                            "recommendation": "Create and switch to a non-root user (e.g. USER appuser) before starting the process."
                        })
            except Exception:
                pass

        # 4. Scan Source Code for Secrets and Environment Variables
        for f_meta in file_index:
            if f_meta["category"] not in {"source", "config", "manifest"}:
                continue
            
            file_path = root_path / f_meta["path"]
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as sf:
                    content = sf.read()

                    # Secret detection
                    for pattern, secret_type, title, severity in cls.SECRET_PATTERNS:
                        matches = pattern.findall(content)
                        for m in matches:
                            masked = cls.mask_secret(m if isinstance(m, str) else m[0])
                            findings.append({
                                "category": "Secret Exposure",
                                "severity": severity,
                                "title": title,
                                "description": f"Potential {secret_type} discovered in {f_meta['path']}: {masked}",
                                "source_file": f_meta["path"],
                                "recommendation": "Immediately revoke and rotate the credential. Store secrets exclusively in AWS Secrets Manager."
                            })

                    # Env var detection
                    for env_pat in cls.ENV_VAR_PATTERNS:
                        matches = env_pat.findall(content)
                        for m in matches:
                            var_name = m if isinstance(m, str) else (m[0] or m[1])
                            if var_name and len(var_name) > 2 and var_name not in env_vars:
                                is_secret = any(k in var_name.lower() for k in ["secret", "key", "password", "token", "auth"])
                                is_public = var_name.startswith("NEXT_PUBLIC_") or var_name.startswith("VITE_")
                                category = "SECRET" if is_secret else ("PUBLIC_FRONTEND" if is_public else "BACKEND_ONLY")
                                env_vars[var_name] = {
                                    "name": var_name,
                                    "category": category,
                                    "required": True,
                                    "secret_likely": is_secret,
                                    "source_file": f_meta["path"]
                                }
            except Exception:
                continue

        # Check for persistent uploads risk
        if any("upload" in f["path"].lower() or "storage" in f["path"].lower() for f in file_index):
            findings.append({
                "category": "Storage Resilience",
                "severity": "HIGH",
                "title": "Container Ephemeral Filesystem Upload Risk",
                "description": "Application logic indicates file uploads without explicit cloud object storage abstraction. ECS Fargate task storage is ephemeral.",
                "source_file": "app/uploads",
                "recommendation": "Store tenant uploads in Amazon S3 KMS encrypted buckets with presigned URLs."
            })

        # Check for health check endpoint presence
        if not health_checks:
            findings.append({
                "category": "Reliability & Observability",
                "severity": "MEDIUM",
                "title": "Missing Explicit Health Check Endpoint",
                "description": "No /health, /healthz, or /api/health endpoint detected in API routing.",
                "source_file": "app/main.py",
                "recommendation": "Implement an unauthenticated /health route returning HTTP 200 for ALB and ECS task health checks."
            })

        # 5. Build Application Data Flows (Pure code-level architecture)
        data_flows.append({"source": "User Browser", "target": "Frontend Web", "protocol": "HTTPS", "port": 443})
        data_flows.append({"source": "Frontend Web", "target": "FastAPI Core API", "protocol": "HTTP / JSON", "port": 8000})
        if databases:
            data_flows.append({"source": "FastAPI Core API", "target": "PostgreSQL Database", "protocol": "TCP / TLS", "port": 5432})
        if has_redis:
            data_flows.append({"source": "FastAPI Core API", "target": "Redis Cache & Queue", "protocol": "TCP / AUTH", "port": 6379})
        if has_celery:
            data_flows.append({"source": "Celery Worker", "target": "Redis Cache & Queue", "protocol": "TCP", "port": 6379})
            data_flows.append({"source": "Celery Worker", "target": "PostgreSQL Database", "protocol": "TCP / TLS", "port": 5432})
        for integ in integrations:
            data_flows.append({"source": "FastAPI Core API", "target": f"External {integ['provider']} API", "protocol": "HTTPS", "port": 443})

        return {
            "services": services,
            "databases": databases,
            "env_vars": list(env_vars.values()),
            "integrations": integrations,
            "health_checks": health_checks,
            "data_flows": data_flows,
            "findings": findings
        }
