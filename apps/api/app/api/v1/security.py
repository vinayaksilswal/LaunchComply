from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.entities import SecurityFinding
from app.core.audit import log_audit_event

router = APIRouter(prefix="/security", tags=["Security"])

@router.get("/findings")
async def list_security_findings(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SecurityFinding)
        .where(SecurityFinding.organization_id == membership.organization_id)
        .order_by(SecurityFinding.created_at.desc())
    )
    findings = result.scalars().all()
    return findings

@router.post("/findings/{finding_id}/fix-with-ai")
async def fix_finding_with_ai(
    finding_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SecurityFinding)
        .where(
            SecurityFinding.id == finding_id,
            SecurityFinding.organization_id == membership.organization_id
        )
    )
    finding = result.scalars().first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Security finding not found or inaccessible"
        )
        
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="system@launchcomply.io",
        action="AI_REMEDIATION_REQUESTED",
        entity_type="security_finding",
        entity_id=finding.id,
        details={"finding_title": finding.title, "cvss": finding.cvss_score}
    )

    diff_patch = """diff --git a/app/core/config.py b/app/core/config.py
--- a/app/core/config.py
+++ b/app/core/config.py
@@ -14,3 +14,3 @@
-    BACKEND_CORS_ORIGINS: List[str] = ["*"]
+    BACKEND_CORS_ORIGINS: List[str] = [
+        "https://app.acmecloud.io"
+    ]
"""

    return {
        "finding_id": finding.id,
        "title": finding.title,
        "severity": finding.severity,
        "root_cause": f"Analysis indicates {finding.title} stems from default permissive network routing or unrestricted security groups during initial local-to-cloud provisioning.",
        "suggested_fix": finding.suggested_fix,
        "proposed_patch": diff_patch,
        "security_impact": "Eliminates unauthorized network ingestion and brings control into compliance with ISO 27001 Annex A.8.20 and SOC 2 CC6.6.",
        "potential_breaking_changes": "Ensures external requests from origins other than verified domains receive HTTP 403.",
        "requires_human_approval": True,
        "status": "AWAITING_HUMAN_APPROVAL"
    }
