"""Observed launch gates. Configuration is never evidence of successful service delivery."""
from pathlib import Path
from datetime import datetime, timezone
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import select, text
from app.core.config import settings
from app.models.audit import AuditEvent
from app.services.architecture.workspace import ai_available, github_available
from app.services.commercial.service_payments import provider_config

class LaunchReadinessService:
    async def evaluate_launch_readiness(self, db):
        checklist = []
        def add(category, item, status, details):
            checklist.append({"category": category, "item": item, "status": status, "details": details})
        try:
            await db.execute(text("SELECT 1"))
            root = Path(__file__).resolve().parents[3]
            config = Config(str(root / "alembic.ini"))
            config.set_main_option("script_location", str(root / "alembic"))
            expected = set(ScriptDirectory.from_config(config).get_heads())
            actual = set((await db.execute(text("SELECT version_num FROM alembic_version"))).scalars())
            add("INFRASTRUCTURE", "Database migration revision", "PASS" if actual == expected else "BLOCKED",
                "Observed revision: " + ", ".join(sorted(actual)) + ". Release revision: " + ", ".join(sorted(expected)) + ". This checks revision identity, not a database recovery rehearsal.")
        except Exception:
            await db.rollback()
            add("INFRASTRUCTURE", "Database migration revision", "BLOCKED", "Could not verify the database migration revision. Review service logs without exposing credentials.")
        valid, blockers, warnings = settings.validate_hosted_environment()
        add("CONFIGURATION", "Hosted configuration gate", "PASS" if valid and settings.ENVIRONMENT in {"production", "staging"} else "BLOCKED",
            "Hosted configuration passed its startup validation. This is not a security assessment." if valid and settings.ENVIRONMENT in {"production", "staging"} else "Hosted configuration has blockers or is not running in a hosted environment; review the backend environment privately.")
        add("CONFIGURATION", "Real business mode", "PASS" if not settings.DEMO_MODE and not settings.DEBUG else "BLOCKED",
            f"Demo mode {'enabled' if settings.DEMO_MODE else 'disabled'}; debug mode {'enabled' if settings.DEBUG else 'disabled'}.")
        add("SOURCE", "GitHub code analysis", "CONFIGURED" if github_available() else "NOT_CONFIGURED",
            "GitHub App identity and key are configured. A successful authorized source refresh is still required for each business asset." if github_available() else "Configure the GitHub App before connecting private customer repositories.")
        events = (await db.execute(select(AuditEvent).where(AuditEvent.action.in_([
            "ARCHITECTURE_AI_PROPOSAL_CREATED", "ARCHITECTURE_AI_REQUEST_FAILED"])).order_by(AuditEvent.created_at.desc()).limit(1))).scalars().all()
        last_ai = events[0] if events else None
        ai_status = "NOT_CONFIGURED" if not ai_available() else "PASS" if last_ai and last_ai.action == "ARCHITECTURE_AI_PROPOSAL_CREATED" else "VERIFICATION_REQUIRED"
        add("AI", "Architecture model response", ai_status,
            "Latest recorded model request returned a schema-valid proposal. Customer review and deployment validation remain separate." if ai_status == "PASS" else "No latest successful model response is recorded. Check actual routing failures in System operations.")
        for provider in ("stripe", "razorpay"):
            capability = provider_config(provider.upper())
            live = capability["available"] and capability["mode"] == "live"
            add("PAYMENTS", provider.capitalize() + " service payments", "CONFIGURED" if live else "NOT_CONFIGURED",
                "Live checkout configuration is present. Successful checkout, webhook reconciliation and refund operations still require acceptance." if live else "Live service checkout is not configured; test mode does not establish real payment readiness.")
        add("CLOUD", "Customer AWS observation connection", "CONFIGURED" if settings.ENABLE_AWS_ACCOUNT_CONNECTION and settings.AWS_PLATFORM_ROLE_ARN else "NOT_CONFIGURED",
            "Connection configuration alone does not prove worker identity, customer role access or provisioning permissions.")
        add("CLOUD", "Automatic infrastructure deployment", "NOT_IMPLEMENTED", "An isolated, authenticated provisioning worker and approved infrastructure plan are not available in this release. Deployment requests use assisted operations.")
        add("RESILIENCE", "Backup restore and recovery", "VERIFICATION_REQUIRED", "No platform recovery rehearsal is verified by this readiness report. Record an actual restore with measured recovery results before promising an SLA.")
        add("ASSURANCE", "Security and compliance acceptance", "VERIFICATION_REQUIRED", "No independent security assessment, customer compliance certification or tenant-isolation verification is claimed by this configuration report.")
        add("OPERATIONS", "Customer delivery acceptance", "VERIFICATION_REQUIRED", "Complete a real customer walkthrough covering source, architecture approval, cloud access, payments, deployment, support and delivered reports.")
        passed = sum(check["status"] == "PASS" for check in checklist)
        blocked = sum(check["status"] in {"BLOCKED", "NOT_CONFIGURED", "NOT_IMPLEMENTED"} for check in checklist)
        return {"readiness_state": "BLOCKED" if blocked else "VERIFICATION_REQUIRED",
            "score_percentage": round(passed / len(checklist) * 100, 1), "passed_checks": passed,
            "total_checks": len(checklist), "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "checklist": checklist, "warnings": warnings,
            "launch_summary": "Observed checks and unresolved delivery gates. This report does not certify enterprise or production readiness."}

launch_readiness_service = LaunchReadinessService()
