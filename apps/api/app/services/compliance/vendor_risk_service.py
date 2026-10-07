"""Phase 7 Vendor and Subprocessor Risk Management Service."""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.compliance_vendor import Vendor, VendorAssessment, VendorFinding

DEFAULT_VENDORS = [
    {
        "name": "Amazon Web Services (AWS)",
        "category": "INFRASTRUCTURE",
        "service_description": "Primary cloud hosting provider for compute, database, object storage, KMS encryption, and networking.",
        "criticality": "CRITICAL",
        "risk_level": "LOW",
        "status": "APPROVED",
        "dpa_status": "EXECUTED",
        "country": "India (ap-south-1) / USA",
        "owner": "devops@acmecloud.io",
        "security_certifications": "SOC 2 Type II, ISO 27001, PCI-DSS Level 1, FedRAMP High",
        "assessment": {
            "title": "Annual Infrastructure Security & Resilience Audit",
            "security_score": 98,
            "privacy_score": 95,
            "availability_score": 99,
            "overall_score": 97,
            "decision": "APPROVED",
            "decision_notes": "AWS maintains industry gold standard physical, hypervisor, and network segregation safeguards.",
        }
    },
    {
        "name": "Stripe Payments Inc.",
        "category": "PAYMENT_GATEWAY",
        "service_description": "Card processing, subscription lifecycle management, and tax calculation engine.",
        "criticality": "CRITICAL",
        "risk_level": "LOW",
        "status": "APPROVED",
        "dpa_status": "EXECUTED",
        "country": "USA / India",
        "owner": "finance@acmecloud.io",
        "security_certifications": "PCI-DSS Level 1, SOC 2 Type II",
        "assessment": {
            "title": "PCI-DSS and Financial Privacy Review",
            "security_score": 95,
            "privacy_score": 92,
            "availability_score": 99,
            "overall_score": 95,
            "decision": "APPROVED",
            "decision_notes": "PCI-DSS Level 1 certified service provider with comprehensive encryption and tokenization.",
        }
    },
    {
        "name": "Resend Technologies Inc.",
        "category": "COMMUNICATION",
        "service_description": "Transactional email API for user onboarding, alerts, and OTP verification.",
        "criticality": "MEDIUM",
        "risk_level": "MEDIUM",
        "status": "CONDITIONAL",
        "dpa_status": "PENDING_REVIEW",
        "country": "USA",
        "owner": "engineering@acmecloud.io",
        "security_certifications": "SOC 2 Type II in progress",
        "assessment": {
            "title": "Email Dispatcher Subprocessor Review",
            "security_score": 82,
            "privacy_score": 78,
            "availability_score": 90,
            "overall_score": 83,
            "decision": "CONDITIONAL",
            "decision_notes": "Conditional approval pending receipt of counter-signed Data Processing Addendum (DPA) with EU/India SCC clauses.",
        }
    }
]


class VendorRiskService:
    """Vendor and Subprocessor Assessment and Governance Service."""

    async def ensure_default_vendors(
        self, db: AsyncSession, organization_id: str
    ) -> List[Vendor]:
        stmt = (
            select(Vendor)
            .where(Vendor.organization_id == organization_id)
            .options(selectinload(Vendor.assessments), selectinload(Vendor.findings))
        )
        res = await db.execute(stmt)
        vendors = res.scalars().all()
        if vendors:
            return vendors

        for v_data in DEFAULT_VENDORS:
            ass_data = v_data.get("assessment")
            vendor = Vendor(
                organization_id=organization_id,
                name=v_data["name"],
                category=v_data["category"],
                service_description=v_data["service_description"],
                criticality=v_data["criticality"],
                risk_level=v_data["risk_level"],
                status=v_data["status"],
                dpa_status=v_data["dpa_status"],
                country=v_data["country"],
                owner=v_data["owner"],
                contract_expiry=datetime.utcnow() + timedelta(days=320),
                last_assessment_date=datetime.utcnow() - timedelta(days=45),
                next_review_date=datetime.utcnow() + timedelta(days=320),
                security_certifications=v_data["security_certifications"],
            )
            db.add(vendor)
            await db.flush()

            if ass_data:
                assessment = VendorAssessment(
                    organization_id=organization_id,
                    vendor_id=vendor.id,
                    assessment_title=ass_data["title"],
                    assessor="compliance@acmecloud.io",
                    assessment_date=datetime.utcnow() - timedelta(days=45),
                    security_score=ass_data["security_score"],
                    privacy_score=ass_data["privacy_score"],
                    availability_score=ass_data["availability_score"],
                    overall_score=ass_data["overall_score"],
                    decision=ass_data["decision"],
                    decision_notes=ass_data["decision_notes"],
                    status="COMPLETED",
                )
                db.add(assessment)

        await db.commit()
        res = await db.execute(stmt)
        return res.scalars().all()

    async def list_vendors(
        self, db: AsyncSession, organization_id: str
    ) -> List[Vendor]:
        return await self.ensure_default_vendors(db, organization_id)

    async def get_vendor(
        self, db: AsyncSession, organization_id: str, vendor_id: str
    ) -> Optional[Vendor]:
        stmt = (
            select(Vendor)
            .where(Vendor.organization_id == organization_id, Vendor.id == vendor_id)
            .options(selectinload(Vendor.assessments), selectinload(Vendor.findings))
        )
        res = await db.execute(stmt)
        return res.scalars().first()


vendor_risk_service = VendorRiskService()
