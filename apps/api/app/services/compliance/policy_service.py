"""Phase 7 Policy Management, Versioning, Employee Acknowledgements, and Training Service."""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.compliance_policy import (
    Policy,
    PolicyVersion,
    PolicyApproval,
    PolicyAcknowledgement,
    TrainingRecord,
)

POLICY_TEMPLATES = [
    {
        "title": "Information Security Policy",
        "slug": "information-security-policy",
        "category": "SECURITY",
        "description": "Foundational governance document establishing executive commitment, security roles, acceptable behavior, and ISMS objectives.",
        "content": """# Information Security Policy (Draft - Requires Organization Review)

## 1. Purpose & Objective
This policy defines the management framework and mandatory baseline security requirements for safeguarding customer data, cloud assets, and intellectual property.

## 2. Scope
Applies to all employees, contractors, third-party partners, and systems accessing LaunchComply production environments.

## 3. Core Principles
- Confidentiality: Restricted access based on least privilege and multi-factor authentication.
- Integrity: Immutable logging, code reviews, and cryptographic verification of all production changes.
- Availability: High-availability architectures, automated backups, and multi-region disaster recovery resilience.

## 4. Compliance & Review
Reviewed annually by executive management. Violations are subject to disciplinary action.
"""
    },
    {
        "title": "Access Control & Authentication Policy",
        "slug": "access-control-policy",
        "category": "SECURITY",
        "description": "Mandates multi-factor authentication (MFA), least privilege role-based access control (RBAC), and quarterly entitlement reviews.",
        "content": """# Access Control & Authentication Policy (Draft - Requires Organization Review)

## 1. Principles
- Least privilege access enforced via RBAC roles.
- Mandatory MFA (Hardware token or TOTP) on all cloud consoles, identity providers, and code repositories.
- Quarterly access review campaigns with mandatory sign-off from system owners.
"""
    },
    {
        "title": "Incident Response & Breach Notification Policy",
        "slug": "incident-response-policy",
        "category": "OPERATIONS",
        "description": "Defines security incident classification, 24/7 on-call escalation, postmortem timelines, and regulatory breach notification SLAs.",
        "content": """# Incident Response Policy (Draft - Requires Organization Review)

## 1. Triage & Severities
- SEV-1 (Critical): Active breach or total service outage. 15-minute response SLA.
- SEV-2 (High): Major degradation or high-severity vulnerability without confirmed exploit. 1-hour SLA.
- SEV-3 (Medium): Minor issue or localized component failure. 4-hour SLA.

## 2. Notification Requirements
- CERT-In reporting within mandatory 6-hour reporting window for qualifying cyber security incidents.
- Customer notification within contractual SLA commitments.
"""
    },
    {
        "title": "Backup & Disaster Recovery Policy",
        "slug": "backup-dr-policy",
        "category": "BUSINESS_CONTINUITY",
        "description": "Establishes automated backup frequency, point-in-time recovery, quarterly restoration drills, and multi-region failover procedures.",
        "content": """# Backup & Disaster Recovery Policy (Draft - Requires Organization Review)

## 1. Retention & Encryption
- Daily automated database snapshots retained for 35 days.
- Continuous WAL archival providing 5-minute RPO.
- All backups encrypted at rest with AWS KMS AES-256.
- Quarterly non-destructive restore drills required to validate data integrity.
"""
    },
    {
        "title": "Privacy & Data Protection Policy",
        "slug": "privacy-policy",
        "category": "PRIVACY",
        "description": "Ensures compliance with India DPDP Act (2023) regarding data fiduciary duties, purpose limitation, and data principal rights.",
        "content": """# Privacy & Data Protection Policy (Draft - Requires Organization Review)

## 1. Purpose
Defines measures for lawful collection, storage, and processing of digital personal data.

## 2. Safeguards
- Clear notice provided prior to or at time of personal data collection.
- Data principal rights (Access, Correction, Erasure, Grievance) answered within configured SLA.
- Technical safeguards including encryption at-rest and in-transit.
"""
    }
]


class PolicyManagementService:
    """Enterprise Policy Center and Acknowledgement Tracking."""

    async def ensure_default_policies(
        self, db: AsyncSession, organization_id: str
    ) -> List[Policy]:
        stmt = (
            select(Policy)
            .where(Policy.organization_id == organization_id)
            .options(selectinload(Policy.versions))
        )
        res = await db.execute(stmt)
        existing_policies = res.scalars().all()
        if existing_policies:
            return existing_policies

        for t in POLICY_TEMPLATES:
            policy = Policy(
                organization_id=organization_id,
                title=t["title"],
                slug=t["slug"],
                category=t["category"],
                description=t["description"],
                owner="ciso@acmecloud.io",
                status="PUBLISHED",
                current_version="1.0",
                effective_date=datetime.utcnow() - timedelta(days=60),
                next_review_date=datetime.utcnow() + timedelta(days=300),
                is_mandatory_acknowledgement=True,
            )
            db.add(policy)
            await db.flush()

            version = PolicyVersion(
                organization_id=organization_id,
                policy_id=policy.id,
                version_number="1.0",
                content_markdown=t["content"],
                change_summary="Initial publication of organization security policy.",
                author="ciso@acmecloud.io",
                status="PUBLISHED",
            )
            db.add(version)
            await db.flush()

            approval = PolicyApproval(
                organization_id=organization_id,
                policy_version_id=version.id,
                approver_email="ciso@acmecloud.io",
                approver_name="Chief Information Security Officer",
                role="CISO",
                approved_at=datetime.utcnow() - timedelta(days=60),
                comments="Approved following executive review.",
            )
            db.add(approval)

            # Add sample acknowledgement
            ack = PolicyAcknowledgement(
                organization_id=organization_id,
                policy_version_id=version.id,
                employee_email="alex.mercer@acmecloud.io",
                employee_name="Alex Mercer",
                assigned_at=datetime.utcnow() - timedelta(days=55),
                due_at=datetime.utcnow() - timedelta(days=25),
                acknowledged_at=datetime.utcnow() - timedelta(days=50),
                status="ACKNOWLEDGED",
            )
            db.add(ack)

        await db.commit()
        res = await db.execute(stmt)
        return res.scalars().all()

    async def list_policies(
        self, db: AsyncSession, organization_id: str
    ) -> List[Policy]:
        return await self.ensure_default_policies(db, organization_id)

    async def get_policy(
        self, db: AsyncSession, organization_id: str, policy_id: str
    ) -> Optional[Policy]:
        stmt = (
            select(Policy)
            .where(Policy.organization_id == organization_id, Policy.id == policy_id)
            .options(
                selectinload(Policy.versions)
                .selectinload(PolicyVersion.approvals),
                selectinload(Policy.versions)
                .selectinload(PolicyVersion.acknowledgements),
            )
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    async def create_policy(
        self,
        db: AsyncSession,
        organization_id: str,
        title: str,
        slug: str,
        category: str,
        description: str,
        content_markdown: str,
        author: str,
    ) -> Policy:
        policy = Policy(
            organization_id=organization_id,
            title=title,
            slug=slug,
            category=category,
            description=description,
            owner=author,
            status="DRAFT",
            current_version="1.0",
        )
        db.add(policy)
        await db.flush()

        version = PolicyVersion(
            organization_id=organization_id,
            policy_id=policy.id,
            version_number="1.0",
            content_markdown=content_markdown,
            change_summary="Initial draft created.",
            author=author,
            status="DRAFT",
        )
        db.add(version)
        await db.commit()
        await db.refresh(policy)
        return policy


policy_service = PolicyManagementService()
