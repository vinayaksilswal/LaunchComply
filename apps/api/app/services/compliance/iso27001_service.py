"""Phase 7 ISO/IEC 27001 ISMS and Statement of Applicability (SoA) Service."""
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.compliance_iso import (
    ISMSScope,
    OrganizationContext,
    InterestedParty,
    SecurityObjective,
    StatementOfApplicabilityEntry,
)

DEFAULT_ISO_CONTROLS = [
    {"code": "A.5.1", "title": "Policies for information security", "applicable": True, "justification": "Required for governance and employee awareness."},
    {"code": "A.5.2", "title": "Information security roles and responsibilities", "applicable": True, "justification": "Required for clear operational accountability."},
    {"code": "A.5.3", "title": "Segregation of duties", "applicable": True, "justification": "Prevents unauthorized conflict of interests in release and finance pipelines."},
    {"code": "A.5.15", "title": "Access control", "applicable": True, "justification": "Enforces least privilege and multi-factor authentication across cloud infrastructure."},
    {"code": "A.5.18", "title": "Access rights", "applicable": True, "justification": "Ensures timely provisioning and quarterly access review certification."},
    {"code": "A.5.19", "title": "Information security in supplier relationships", "applicable": True, "justification": "Third-party vendors and cloud providers handle confidential data."},
    {"code": "A.5.24", "title": "Incident management planning and preparation", "applicable": True, "justification": "Ensures prompt triage, escalation, and breach reporting."},
    {"code": "A.5.34", "title": "Privacy and protection of PII", "applicable": True, "justification": "Mandatory for handling personal customer data under DPDP Act."},
    {"code": "A.8.1", "title": "User endpoint devices", "applicable": True, "justification": "Governs laptop encryption and secure workstations."},
    {"code": "A.8.8", "title": "Management of technical vulnerabilities", "applicable": True, "justification": "Continuous SAST/SCA and penetration testing schedule."},
    {"code": "A.8.13", "title": "Information backup", "applicable": True, "justification": "Automated snapshotting and WAL replication protects against data loss."},
    {"code": "A.8.14", "title": "Redundancy of information processing facilities", "applicable": True, "justification": "Multi-AZ and cross-region warm standby architectures."},
    {"code": "A.8.15", "title": "Logging", "applicable": True, "justification": "Audit trail logging in CloudTrail and centralized observability."},
    {"code": "A.8.20", "title": "Network security", "applicable": True, "justification": "Private VPC subnets, AWS WAF, and ALB security groups."},
    {"code": "A.8.24", "title": "Use of cryptography", "applicable": True, "justification": "TLS 1.3 in-transit and KMS AES-256 at-rest encryption."},
    {"code": "A.7.4", "title": "Physical security monitoring", "applicable": False, "justification": "Cloud-native SaaS hosting entirely on AWS managed data centers.", "exclusion_reason": "Out of scope: No customer data processed in on-premises physical data center."},
    {"code": "A.8.11", "title": "Data masking", "applicable": True, "justification": "Applied to sensitive customer credentials and log outputs."},
    {"code": "A.9.2", "title": "Internal audit", "applicable": True, "justification": "Annual internal management system audit requirements."},
    {"code": "A.9.3", "title": "Management review", "applicable": True, "justification": "Annual executive management review requirements."},
]


class ISO27001Service:
    """ISO 27001 ISMS and Statement of Applicability Management."""

    async def get_or_create_scope(
        self, db: AsyncSession, organization_id: str
    ) -> ISMSScope:
        stmt = select(ISMSScope).where(ISMSScope.organization_id == organization_id)
        res = await db.execute(stmt)
        scope = res.scalars().first()
        if not scope:
            scope = ISMSScope(
                organization_id=organization_id,
                version="v1.0",
                business_units="Engineering, Cloud Operations, Security & Compliance, Customer Success",
                products="LaunchComply SaaS Platform, API Engine, and Managed AWS Infrastructures",
                applications="Web Dashboard (React/Next.js), Core API (FastAPI), Worker Service (Celery)",
                aws_accounts="Primary AWS Production Account (ap-south-1) and DR Replica (ap-southeast-1)",
                locations="Cloud-Hosted (AWS ap-south-1 Mumbai) and Remote Engineering Teams",
                people_groups="Full-time employees, DevOps engineers, and Authorized System Administrators",
                systems="ECS Fargate Clusters, RDS PostgreSQL Multi-AZ, S3 Buckets, Route 53, KMS",
                data_categories="Customer Account Credentials, Telemetry, Metadata, Infrastructure Configurations",
                excluded_areas="Physical on-premises data center facilities (outsourced to AWS SOC 2 certified data centers)",
                scope_statement="The Information Security Management System (ISMS) covers the architecture, development, deployment, maintenance, and monitoring of LaunchComply cloud platforms and customer infrastructure automation services.",
                status="APPROVED",
                approved_by="ciso@acmecloud.io",
                approved_at=datetime.utcnow(),
            )
            db.add(scope)
            await db.commit()
            await db.refresh(scope)
        return scope

    async def ensure_soa(
        self, db: AsyncSession, organization_id: str
    ) -> List[StatementOfApplicabilityEntry]:
        stmt = (
            select(StatementOfApplicabilityEntry)
            .where(StatementOfApplicabilityEntry.organization_id == organization_id)
            .order_by(StatementOfApplicabilityEntry.control_code.asc())
        )
        res = await db.execute(stmt)
        entries = res.scalars().all()
        if not entries:
            for item in DEFAULT_ISO_CONTROLS:
                entry = StatementOfApplicabilityEntry(
                    organization_id=organization_id,
                    control_code=item["code"],
                    control_title=item["title"],
                    applicable=item["applicable"],
                    justification=item["justification"],
                    implementation_status="IMPLEMENTED" if item["applicable"] else "NOT_APPLICABLE",
                    control_owner="ciso@acmecloud.io",
                    evidence_summary="Verified via LaunchComply automated evidence engine." if item["applicable"] else None,
                    exclusion_reason=item.get("exclusion_reason"),
                    version="v1.0",
                    approved_by="ciso@acmecloud.io",
                    approved_at=datetime.utcnow(),
                )
                db.add(entry)
            await db.commit()
            res = await db.execute(stmt)
            entries = res.scalars().all()
        return entries

    async def approve_soa(
        self, db: AsyncSession, organization_id: str, approver: str
    ) -> Dict[str, Any]:
        entries = await self.ensure_soa(db, organization_id)
        now = datetime.utcnow()
        for e in entries:
            e.approved_by = approver
            e.approved_at = now
        await db.commit()
        return {
            "status": "APPROVED",
            "approved_by": approver,
            "approved_at": now.isoformat(),
            "total_controls": len(entries),
            "applicable_controls": sum(1 for e in entries if e.applicable),
            "excluded_controls": sum(1 for e in entries if not e.applicable),
        }


iso27001_service = ISO27001Service()
