"""Phase 7 India DPDP Privacy Operations, Data Inventory, and DSR Service."""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.compliance_privacy import (
    DataInventoryItem,
    ProcessingActivity,
    PrivacyRequest,
    DataRetentionPolicy,
)

DEFAULT_DATA_INVENTORY = [
    {
        "system_name": "RDS PostgreSQL Production Database",
        "application_name": "Acme SaaS Core",
        "dataset_name": "User Account Profiles & Authentication",
        "data_category": "IDENTIFIER",
        "personal_data": True,
        "sensitive_classification": "PERSONAL",
        "purpose": "User authentication, profile management, and account communication.",
        "source": "Directly from customer during registration",
        "data_principals": "Registered Customer Users",
        "storage_location": "AWS RDS ap-south-1 (Mumbai)",
        "storage_region": "ap-south-1",
        "retention_period": "Duration of active account + 3 years",
        "deletion_method": "Row deletion with zero-fill overwrite on RDS drop",
        "encryption_in_transit": "TLS 1.3",
        "encryption_at_rest": "AWS KMS AES-256",
        "access_control": "Application Service Role + IAM Database Authentication",
        "subprocessor": "Amazon Web Services (AWS)",
        "cross_border_transfer": False,
    },
    {
        "system_name": "Stripe Payment Gateway",
        "application_name": "Billing & Subscriptions",
        "dataset_name": "Customer Payment Metadata & Invoicing",
        "data_category": "FINANCIAL",
        "personal_data": True,
        "sensitive_classification": "SENSITIVE_PERSONAL",
        "purpose": "Processing subscription billing, tax invoicing, and refunds.",
        "source": "Customer credit card and GSTIN input",
        "data_principals": "Account Billing Administrators",
        "storage_location": "Stripe Cloud Vault (PCI-DSS Level 1)",
        "storage_region": "USA / Global",
        "retention_period": "7 years (Statutory GST / Tax Compliance)",
        "deletion_method": "Stripe Customer Redaction API",
        "encryption_in_transit": "TLS 1.3 with Certificate Pinning",
        "encryption_at_rest": "AES-256",
        "access_control": "Restricted Billing API Keys with IP Whitelisting",
        "subprocessor": "Stripe Payments India Pvt Ltd / Stripe Inc.",
        "cross_border_transfer": True,
    },
    {
        "system_name": "CloudWatch & Application Logs",
        "application_name": "Observability Stack",
        "dataset_name": "API Request Telemetry & IP Logs",
        "data_category": "TECHNICAL_TELEMETRY",
        "personal_data": True,
        "sensitive_classification": "PERSONAL",
        "purpose": "Security auditing, CERT-In compliance, and performance diagnostics.",
        "source": "HTTP Request Headers & ALB Access Logs",
        "data_principals": "All Platform Visitors",
        "storage_location": "AWS CloudWatch Logs ap-south-1",
        "storage_region": "ap-south-1",
        "retention_period": "365 days (CERT-In mandate)",
        "deletion_method": "Automated CloudWatch log retention expiry",
        "encryption_in_transit": "TLS 1.3",
        "encryption_at_rest": "AWS KMS AES-256",
        "access_control": "Least-privilege DevOps IAM roles",
        "subprocessor": "Amazon Web Services (AWS)",
        "cross_border_transfer": False,
    },
]

DEFAULT_PROCESSING_ACTIVITIES = [
    {
        "activity_name": "Customer Account Provisioning & Onboarding",
        "purpose": "Create tenant workspace, provision database tenancy, and send initial invitation.",
        "systems_involved": "Next.js Frontend, FastAPI Backend, RDS PostgreSQL, Twilio/SendGrid",
        "data_categories": "Full Name, Work Email, Organization Name, Hashed Password",
        "data_principals": "Prospective and Active SaaS Customers",
        "collection_source": "Signup Form",
        "processing_basis": "CONTRACTUAL_NECESSITY",
        "retention_schedule": "Active contract term + 3 years",
        "third_party_sharing": "None except infrastructure subprocessor",
        "subprocessors_involved": "AWS, SendGrid",
        "security_safeguards": "Argon2 password hashing, KMS encryption, TLS 1.3, MFA",
        "owner": "privacy@acmecloud.io",
    },
    {
        "activity_name": "Subscription Billing & GST Invoicing",
        "purpose": "Process recurring credit card charges and issue compliant GST B2B tax invoices.",
        "systems_involved": "FastAPI Billing Service, Stripe API, PostgreSQL Billing Ledger",
        "data_categories": "Billing Contact Name, GSTIN, Company Address, Stripe Customer ID",
        "data_principals": "Customer Billing Contacts",
        "collection_source": "Checkout Form",
        "processing_basis": "LEGAL_OBLIGATION",
        "retention_schedule": "7 years per India statutory accounting mandates",
        "third_party_sharing": "Stripe, Tax Authorities on demand",
        "subprocessors_involved": "Stripe Payments",
        "security_safeguards": "PCI-DSS tokenization, no raw card numbers stored, KMS encryption",
        "owner": "finance@acmecloud.io",
    }
]


class PrivacyOperationsService:
    """India DPDP Privacy Operations, Data Inventory, and Request Fulfillment."""

    async def ensure_privacy_data(
        self, db: AsyncSession, organization_id: str
    ):
        stmt = select(DataInventoryItem).where(DataInventoryItem.organization_id == organization_id)
        existing = (await db.execute(stmt)).scalars().first()
        if not existing:
            for item in DEFAULT_DATA_INVENTORY:
                inv = DataInventoryItem(
                    organization_id=organization_id,
                    **item
                )
                db.add(inv)
            for act in DEFAULT_PROCESSING_ACTIVITIES:
                pa = ProcessingActivity(
                    organization_id=organization_id,
                    **act
                )
                db.add(pa)
            
            # Create a sample privacy request
            req = PrivacyRequest(
                organization_id=organization_id,
                request_number="DSR-2026-001",
                request_type="ERASURE",
                data_principal_name="Rahul Sharma",
                data_principal_email="rahul.sharma@example.com",
                status="IN_PROGRESS",
                received_at=datetime.utcnow() - timedelta(days=2),
                due_at=datetime.utcnow() + timedelta(days=28),
                owner="privacy@acmecloud.io",
                verification_method="EMAIL_OTP",
                response_notes="Identity verified via OTP. Scoping associated audit records and subscription records for lawful retention exemptions.",
            )
            db.add(req)
            await db.commit()

    async def list_data_inventory(
        self, db: AsyncSession, organization_id: str
    ) -> List[DataInventoryItem]:
        await self.ensure_privacy_data(db, organization_id)
        stmt = select(DataInventoryItem).where(DataInventoryItem.organization_id == organization_id)
        res = await db.execute(stmt)
        return res.scalars().all()

    async def list_processing_activities(
        self, db: AsyncSession, organization_id: str
    ) -> List[ProcessingActivity]:
        await self.ensure_privacy_data(db, organization_id)
        stmt = select(ProcessingActivity).where(ProcessingActivity.organization_id == organization_id)
        res = await db.execute(stmt)
        return res.scalars().all()

    async def list_privacy_requests(
        self, db: AsyncSession, organization_id: str
    ) -> List[PrivacyRequest]:
        await self.ensure_privacy_data(db, organization_id)
        stmt = select(PrivacyRequest).where(PrivacyRequest.organization_id == organization_id).order_by(PrivacyRequest.received_at.desc())
        res = await db.execute(stmt)
        return res.scalars().all()

    async def create_privacy_request(
        self,
        db: AsyncSession,
        organization_id: str,
        request_type: str,
        data_principal_name: str,
        data_principal_email: str,
        owner: str = "privacy@launchcomply.io",
        sla_days: int = 30,
    ) -> PrivacyRequest:
        count_stmt = select(PrivacyRequest).where(PrivacyRequest.organization_id == organization_id)
        res = await db.execute(count_stmt)
        seq = len(res.scalars().all()) + 1
        req_num = f"DSR-2026-{seq:03d}"

        req = PrivacyRequest(
            organization_id=organization_id,
            request_number=req_num,
            request_type=request_type,
            data_principal_name=data_principal_name,
            data_principal_email=data_principal_email,
            status="RECEIVED",
            received_at=datetime.utcnow(),
            due_at=datetime.utcnow() + timedelta(days=sla_days),
            owner=owner,
            verification_method="EMAIL_OTP",
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)
        return req


privacy_service = PrivacyOperationsService()
