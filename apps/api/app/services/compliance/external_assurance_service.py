"""Phase 7 External Assurance Records and Trust Center Certification Badge Service."""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.compliance_operations import ExternalAssuranceRecord


class ExternalAssuranceService:
    """Manages verified third-party external certificates and gates Trust Center claims."""

    async def list_assurance_records(
        self, db: AsyncSession, organization_id: str
    ) -> List[ExternalAssuranceRecord]:
        stmt = (
            select(ExternalAssuranceRecord)
            .where(ExternalAssuranceRecord.organization_id == organization_id)
            .order_by(ExternalAssuranceRecord.issued_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()

    async def get_verified_badge_status(
        self, db: AsyncSession, organization_id: str
    ) -> Dict[str, Any]:
        """Evaluates whether Trust Center may display certified badges or must display readiness program."""
        records = await self.list_assurance_records(db, organization_id)
        now = datetime.utcnow()

        iso_record = next(
            (r for r in records if r.framework == "ISO27001" and r.is_active and r.expires_at > now),
            None
        )
        soc2_record = next(
            (r for r in records if r.framework == "SOC2" and r.is_active and r.expires_at > now),
            None
        )
        vapt_record = next(
            (r for r in records if r.framework == "VAPT" and r.is_active and r.expires_at > now),
            None
        )

        return {
            "iso27001": {
                "display_badge": "ISO/IEC 27001:2022 Certified" if iso_record else "ISO 27001 Readiness Program",
                "is_certified": bool(iso_record),
                "issuer": iso_record.issuer_auditor if iso_record else None,
                "expires_at": iso_record.expires_at.isoformat() if iso_record else None,
                "notes": "Accredited registrar certification verified." if iso_record else "Active readiness program. External certification audit required.",
            },
            "soc2": {
                "display_badge": "SOC 2 Type II Attested" if soc2_record else "SOC 2 Readiness Program",
                "is_certified": bool(soc2_record),
                "issuer": soc2_record.issuer_auditor if soc2_record else None,
                "expires_at": soc2_record.expires_at.isoformat() if soc2_record else None,
                "notes": "Independent CPA examination report verified." if soc2_record else "90-day operating evidence collection in progress.",
            },
            "vapt": {
                "display_badge": "Annual Penetration Test Attested" if vapt_record else "Continuous Security Testing",
                "is_certified": bool(vapt_record),
                "issuer": vapt_record.issuer_auditor if vapt_record else "LaunchComply Automated Engine",
                "expires_at": vapt_record.expires_at.isoformat() if vapt_record else None,
            },
            "dpdp": {
                "display_badge": "DPDP Privacy Readiness Program",
                "is_certified": False,
                "notes": "Digital Personal Data Protection Act compliance program active.",
            }
        }

    async def add_assurance_record(
        self,
        db: AsyncSession,
        organization_id: str,
        assurance_type: str,
        framework: str,
        issuer_auditor: str,
        document_reference: str,
        expires_at: datetime,
        verified_by: str,
    ) -> ExternalAssuranceRecord:
        record = ExternalAssuranceRecord(
            organization_id=organization_id,
            assurance_type=assurance_type,
            framework=framework,
            issuer_auditor=issuer_auditor,
            issued_at=datetime.utcnow(),
            expires_at=expires_at,
            document_reference=document_reference,
            verified_by=verified_by,
            is_active=True,
            public_visibility=True,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record


external_assurance_service = ExternalAssuranceService()
