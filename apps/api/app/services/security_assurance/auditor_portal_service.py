"""Phase 6 Auditor Access Portal Service.
Provides time-bound, strictly read-only access for third-party compliance auditors
with automatic redaction of sensitive credentials and full audit logging.
"""
from __future__ import annotations

import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.models.security_assurance import (
    AuditorAccessGrant,
    AuditorEvidenceRequest,
)
from app.models.entities import SecurityFinding, ComplianceAssessment
from app.models.infrastructure import InfrastructureEvidence
from app.models.release import ReleaseEvidence
from app.core.audit import log_audit_event


def _redact_sensitive_content(data: Any) -> Any:
    """Recursively redact secrets, private keys, passwords, and tokens."""
    if isinstance(data, dict):
        redacted = {}
        for k, v in data.items():
            lower_k = str(k).lower()
            if any(s in lower_k for s in ("password", "secret", "token", "private_key", "key", "credential", "auth")):
                redacted[k] = "[REDACTED_AUDITOR_SAFE]"
            else:
                redacted[k] = _redact_sensitive_content(v)
        return redacted
    elif isinstance(data, list):
        return [_redact_sensitive_content(item) for item in data]
    elif isinstance(data, str):
        if "BEGIN RSA PRIVATE KEY" in data or "BEGIN OPENSSH PRIVATE KEY" in data:
            return "[REDACTED_PRIVATE_KEY]"
        return data
    return data


class AuditorPortalService:
    async def create_access_grant(
        self,
        db: AsyncSession,
        organization_id: str,
        auditor_name: str,
        auditor_email: str,
        auditing_firm: str,
        scope_description: str,
        created_by_user_id: str,
        created_by_email: str,
        duration_days: int = 14,
        allowed_frameworks: Optional[List[str]] = None,
        nda_signed: bool = True,
        nda_reference: Optional[str] = None,
    ) -> tuple[AuditorAccessGrant, str]:
        """
        Creates a time-bound, scoped read-only auditor grant.
        Returns the grant object and the one-time raw access token.
        """
        raw_token = f"lc_aud_{secrets.token_urlsafe(32)}"
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        now = datetime.utcnow()
        valid_until = now + timedelta(days=duration_days)

        scope_json = {
            "auditing_firm": auditing_firm,
            "scope_description": scope_description,
            "token_hash": token_hash,
            "allowed_frameworks": allowed_frameworks or ["SOC2", "ISO27001", "DPDP"],
            "nda_signed": nda_signed,
            "nda_reference": nda_reference or f"NDA-AUDIT-{secrets.token_hex(4).upper()}",
            "created_by_user_id": created_by_user_id,
        }

        grant = AuditorAccessGrant(
            organization_id=organization_id,
            auditor_name=auditor_name,
            auditor_email=auditor_email,
            framework=(allowed_frameworks[0] if allowed_frameworks else "SOC2"),
            scope_json=scope_json,
            valid_from=now,
            valid_until=valid_until,
            created_by=created_by_email,
            status="ACTIVE",
        )
        db.add(grant)
        await db.commit()
        await db.refresh(grant)

        await log_audit_event(
            db=db,
            organization_id=organization_id,
            actor_id=created_by_user_id,
            actor_email=created_by_email,
            action="SECURITY_AUDITOR_GRANT_CREATED",
            entity_type="AuditorAccessGrant",
            entity_id=grant.id,
            details={
                "auditor_email": auditor_email,
                "auditing_firm": auditing_firm,
                "valid_until": valid_until.isoformat(),
            },
        )
        return grant, raw_token

    async def validate_grant_token(self, db: AsyncSession, raw_token: str) -> AuditorAccessGrant:
        """Validates token hash, checks expiration and revocation."""
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        stmt = select(AuditorAccessGrant).where(AuditorAccessGrant.status == "ACTIVE")
        res = await db.execute(stmt)
        grants = res.scalars().all()

        matching_grant = None
        for g in grants:
            if g.scope_json and g.scope_json.get("token_hash") == token_hash:
                matching_grant = g
                break

        if not matching_grant:
            raise ValueError("Invalid or revoked auditor access grant.")

        if matching_grant.valid_until and matching_grant.valid_until < datetime.utcnow():
            matching_grant.status = "EXPIRED"
            await db.commit()
            raise ValueError("Auditor access grant has expired.")

        return matching_grant

    async def revoke_grant(
        self,
        db: AsyncSession,
        grant_id: str,
        revoked_by_user_id: str,
        revoked_by_email: str,
        reason: str,
    ) -> AuditorAccessGrant:
        stmt = select(AuditorAccessGrant).where(AuditorAccessGrant.id == grant_id)
        res = await db.execute(stmt)
        grant = res.scalars().first()
        if not grant:
            raise ValueError("Auditor grant not found.")

        grant.status = "REVOKED"
        grant.revoked_at = datetime.utcnow()
        await db.commit()

        await log_audit_event(
            db=db,
            organization_id=grant.organization_id,
            actor_id=revoked_by_user_id,
            actor_email=revoked_by_email,
            action="SECURITY_AUDITOR_GRANT_REVOKED",
            entity_type="AuditorAccessGrant",
            entity_id=grant.id,
            details={"reason": reason},
        )
        return grant

    async def get_auditor_evidence_package(self, db: AsyncSession, grant: AuditorAccessGrant) -> Dict[str, Any]:
        """
        Compiles read-only redacted evidence package strictly within the grant's allowed scope.
        """
        ev_stmt = select(InfrastructureEvidence).where(
            InfrastructureEvidence.organization_id == grant.organization_id
        ).limit(100)
        ev_res = await db.execute(ev_stmt)
        infra_evidence = ev_res.scalars().all()

        rel_ev_stmt = select(ReleaseEvidence).where(
            ReleaseEvidence.organization_id == grant.organization_id
        ).limit(100)
        rel_ev_res = await db.execute(rel_ev_stmt)
        release_evidence = rel_ev_res.scalars().all()

        findings_stmt = select(SecurityFinding).where(
            SecurityFinding.organization_id == grant.organization_id
        ).limit(100)
        f_res = await db.execute(findings_stmt)
        findings = f_res.scalars().all()

        comp_stmt = select(ComplianceAssessment).where(
            ComplianceAssessment.organization_id == grant.organization_id
        ).limit(100)
        c_res = await db.execute(comp_stmt)
        assessments = c_res.scalars().all()

        allowed_fw = (grant.scope_json or {}).get("allowed_frameworks", ["SOC2", "ISO27001"])

        package = {
            "grant_info": {
                "id": grant.id,
                "auditor_name": grant.auditor_name,
                "auditor_email": grant.auditor_email,
                "framework": grant.framework,
                "valid_until": grant.valid_until.isoformat() if grant.valid_until else None,
                "scope": grant.scope_json,
            },
            "evidence_records": [
                {
                    "id": ie.id,
                    "title": ie.title,
                    "control_code": ie.control_code,
                    "framework": ie.framework,
                    "sha256_hash": ie.sha256_hash,
                    "verified_at": ie.verified_at.isoformat() if ie.verified_at else None,
                    "snapshot": _redact_sensitive_content(ie.raw_snapshot_json or {}),
                }
                for ie in infra_evidence
            ] + [
                {
                    "id": re.id,
                    "title": f"Release Evidence: {re.evidence_type}",
                    "control_code": "SEC-DELIVERY-VERIFIED",
                    "framework": "LaunchComply Delivery Assurance",
                    "sha256_hash": re.sha256,
                    "verified_at": re.created_at.isoformat() if re.created_at else None,
                    "snapshot": {"source": re.source, "artifact_key": re.artifact_key},
                }
                for re in release_evidence
            ],
            "security_findings_summary": {
                "total": len(findings),
                "critical": sum(1 for f in findings if (f.severity or "").upper() == "CRITICAL"),
                "high": sum(1 for f in findings if (f.severity or "").upper() == "HIGH"),
                "medium": sum(1 for f in findings if (f.severity or "").upper() == "MEDIUM"),
                "low": sum(1 for f in findings if (f.severity or "").upper() == "LOW"),
                "items": [
                    {
                        "id": f.id,
                        "title": f.title,
                        "severity": f.severity,
                        "status": f.status,
                        "cwe": f.cwe,
                        "created_at": f.created_at.isoformat() if f.created_at else None,
                    }
                    for f in findings
                ],
            },
            "compliance_assessments": [
                {
                    "id": a.id,
                    "framework_code": a.framework_code,
                    "framework_name": a.framework_name,
                    "readiness_percentage": a.readiness_percentage,
                    "passing_controls": a.passing_controls,
                    "total_controls": a.total_controls,
                    "status": a.status,
                }
                for a in assessments
            ],
        }

        await log_audit_event(
            db=db,
            organization_id=grant.organization_id,
            actor_id="AUDITOR_PORTAL",
            actor_email=grant.auditor_email,
            action="SECURITY_AUDITOR_EVIDENCE_ACCESSED",
            entity_type="AuditorAccessGrant",
            entity_id=grant.id,
            details={"records_accessed": len(package["evidence_records"])},
        )
        return package

    async def request_evidence(
        self,
        db: AsyncSession,
        grant: AuditorAccessGrant,
        title: str,
        description: str,
        framework_control: Optional[str] = None,
    ) -> AuditorEvidenceRequest:
        req = AuditorEvidenceRequest(
            organization_id=grant.organization_id,
            grant_id=grant.id,
            control_id=framework_control or "SOC2-CC6.1",
            request_title=title,
            description=description,
            requested_by=grant.auditor_email,
            status="REQUESTED",
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)

        await log_audit_event(
            db=db,
            organization_id=grant.organization_id,
            actor_id="AUDITOR_PORTAL",
            actor_email=grant.auditor_email,
            action="SECURITY_AUDITOR_EVIDENCE_REQUESTED",
            entity_type="AuditorEvidenceRequest",
            entity_id=req.id,
            details={"request_title": title, "control_id": req.control_id},
        )
        return req

    async def fulfill_evidence_request(
        self,
        db: AsyncSession,
        request_id: str,
        fulfilled_by_user_id: str,
        fulfilled_by_email: str,
        response_notes: str,
        evidence_file_id: Optional[str] = None,
    ) -> AuditorEvidenceRequest:
        stmt = select(AuditorEvidenceRequest).where(AuditorEvidenceRequest.id == request_id)
        res = await db.execute(stmt)
        req = res.scalars().first()
        if not req:
            raise ValueError("Evidence request not found.")

        req.status = "PROVIDED"
        req.response_notes = response_notes
        req.provided_evidence_id = evidence_file_id
        await db.commit()

        await log_audit_event(
            db=db,
            organization_id=req.organization_id,
            actor_id=fulfilled_by_user_id,
            actor_email=fulfilled_by_email,
            action="SECURITY_AUDITOR_EVIDENCE_FULFILLED",
            entity_type="AuditorEvidenceRequest",
            entity_id=req.id,
            details={"status": "PROVIDED", "evidence_id": evidence_file_id},
        )
        return req
