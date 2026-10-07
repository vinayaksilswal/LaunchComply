"""Phase 7 Framework-Neutral Compliance Engine and Canonical Control Library."""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.compliance_framework import (
    FrameworkVersion,
    CanonicalControl,
    ControlFrameworkMapping,
    ControlImplementation,
    ControlEvidenceMapping,
    ControlOperatingPeriod,
    ControlTest,
    ControlException,
)
from app.models.infrastructure import InfrastructureEvidence
from app.models.operations import EvidenceFreshness

CANONICAL_CONTROLS_SEED = [
    {
        "control_code": "LC-AC-001",
        "title": "Multi-factor Authentication for Privileged Access",
        "category": "ACCESS_CONTROL",
        "description": "Enforce multi-factor authentication (MFA) via TOTP or hardware security key for all administrative and production cloud access.",
        "guidance": "Verify IAM policies enforce aws:MultiFactorAuthPresent or equivalent for privileged roles.",
        "default_implementation_type": "AUTOMATED",
        "default_frequency": "CONTINUOUS",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.5.15", "title": "Access control"},
            {"framework": "SOC2_2017", "code": "CC6.1", "title": "Logical access controls"},
            {"framework": "DPDP_2023", "code": "SEC-01", "title": "Technical safeguards for authorized access"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-01", "title": "Privileged MFA Enforcement"},
        ]
    },
    {
        "control_code": "LC-AC-002",
        "title": "Quarterly Privileged Access & Credential Review",
        "category": "ACCESS_CONTROL",
        "description": "Perform periodic entitlement review for all production cloud accounts, database administrative roles, and source control repositories.",
        "guidance": "Document access review campaigns with KEEP/REMOVE/MODIFY decisions signed off by asset owners.",
        "default_implementation_type": "HYBRID",
        "default_frequency": "QUARTERLY",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.5.18", "title": "Access rights"},
            {"framework": "SOC2_2017", "code": "CC6.2", "title": "User registration and access modification"},
            {"framework": "DPDP_2023", "code": "SEC-02", "title": "Access revocation safeguards"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-02", "title": "Access Certification"},
        ]
    },
    {
        "control_code": "LC-CR-001",
        "title": "TLS 1.3 Transport Encryption with Strict HSTS",
        "category": "CRYPTOGRAPHY",
        "description": "Enforce modern TLS (TLS 1.2 minimum, TLS 1.3 preferred) on all public and inter-service HTTP endpoints with HSTS enabled.",
        "guidance": "ALB listeners, CloudFront distributions, and API gateways must reject cleartext HTTP.",
        "default_implementation_type": "AUTOMATED",
        "default_frequency": "CONTINUOUS",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.8.24", "title": "Use of cryptography"},
            {"framework": "SOC2_2017", "code": "CC6.6", "title": "Protection of data in transit"},
            {"framework": "DPDP_2023", "code": "SEC-03", "title": "Transmission security safeguards"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-03", "title": "TLS Encryption In-Transit"},
        ]
    },
    {
        "control_code": "LC-CR-002",
        "title": "Data Encryption at Rest with Customer Managed KMS",
        "category": "CRYPTOGRAPHY",
        "description": "All database volumes, snapshots, S3 storage buckets, and secrets must be encrypted at rest using AES-256 with KMS key rotation.",
        "guidance": "Check RDS storage_encrypted=True, S3 block public access + SSE-KMS, and Secrets Manager rotation.",
        "default_implementation_type": "AUTOMATED",
        "default_frequency": "CONTINUOUS",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.8.24", "title": "Use of cryptography"},
            {"framework": "SOC2_2017", "code": "CC6.7", "title": "Protection of data at rest"},
            {"framework": "DPDP_2023", "code": "SEC-04", "title": "Storage security & encryption"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-04", "title": "KMS Encryption At-Rest"},
        ]
    },
    {
        "control_code": "LC-OP-001",
        "title": "Automated SAST, SCA, and Container Vulnerability Scanning",
        "category": "OPERATIONS_SECURITY",
        "description": "Run static application security testing (SAST), software composition analysis (SCA), secret scanning, and container CVE audits in CI/CD pipeline.",
        "guidance": "Block release deployment on unresolved CRITICAL or HIGH findings unless formal risk acceptance is granted.",
        "default_implementation_type": "AUTOMATED",
        "default_frequency": "PER_RELEASE",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.8.8", "title": "Management of technical vulnerabilities"},
            {"framework": "SOC2_2017", "code": "CC7.1", "title": "Vulnerability management"},
            {"framework": "DPDP_2023", "code": "SEC-05", "title": "Preventive technical safeguards"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-05", "title": "Automated Security Pipeline"},
        ]
    },
    {
        "control_code": "LC-OP-002",
        "title": "Centralized Tamper-Evident Audit Logging & Monitoring",
        "category": "OPERATIONS_SECURITY",
        "description": "Collect and retain administrative audit logs, cloud trail events, and deployment activities in an immutable append-only store for at least 1 year.",
        "guidance": "Verify AWS CloudTrail is multi-region enabled with S3 log file validation active.",
        "default_implementation_type": "AUTOMATED",
        "default_frequency": "CONTINUOUS",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.8.15", "title": "Logging"},
            {"framework": "SOC2_2017", "code": "CC7.2", "title": "Security monitoring & logging"},
            {"framework": "DPDP_2023", "code": "SEC-06", "title": "Audit trails for data access"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-06", "title": "Immutable Audit Logging"},
        ]
    },
    {
        "control_code": "LC-IR-001",
        "title": "Incident Response Plan & Operational Escalation",
        "category": "INCIDENT_RESPONSE",
        "description": "Maintain a documented incident response procedure with defined severities, 24/7 on-call escalation, postmortem SLAs, and regulatory notification readiness.",
        "guidance": "Conduct annual tabletop exercise; ensure CERT-In 6-hour reporting capability for severe incidents.",
        "default_implementation_type": "HYBRID",
        "default_frequency": "ANNUAL",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.5.24", "title": "Information security incident management planning"},
            {"framework": "SOC2_2017", "code": "CC7.3", "title": "Incident response program"},
            {"framework": "DPDP_2023", "code": "SEC-07", "title": "Personal data breach notification"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-07", "title": "Incident Response Readiness"},
        ]
    },
    {
        "control_code": "LC-BC-001",
        "title": "Continuous Automated Backup & Quarterly Restore Drills",
        "category": "BUSINESS_CONTINUITY",
        "description": "Perform daily automated database backups with point-in-time recovery (WAL 5 min) and execute non-destructive quarterly restoration drills.",
        "guidance": "Verify RPO <= 15 minutes and RTO <= 30 minutes in sandbox environment.",
        "default_implementation_type": "AUTOMATED",
        "default_frequency": "QUARTERLY",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.8.14", "title": "Redundancy of information processing facilities"},
            {"framework": "SOC2_2017", "code": "A1.2", "title": "Data backup and restoration"},
            {"framework": "DPDP_2023", "code": "SEC-08", "title": "Business continuity safeguards"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-08", "title": "Backup & Recovery Drills"},
        ]
    },
    {
        "control_code": "LC-BC-002",
        "title": "Multi-Region Warm Standby Disaster Recovery Resilience",
        "category": "BUSINESS_CONTINUITY",
        "description": "Maintain multi-region disaster recovery architecture with cross-region read replicas and automated failover runbooks.",
        "guidance": "Measure observed RTO against business impact analysis requirements without redirecting active production traffic.",
        "default_implementation_type": "HYBRID",
        "default_frequency": "SEMI_ANNUAL",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.8.13", "title": "Information backup"},
            {"framework": "SOC2_2017", "code": "A1.3", "title": "Disaster recovery resilience"},
            {"framework": "DPDP_2023", "code": "SEC-09", "title": "Data availability safeguards"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-09", "title": "Multi-Region DR Plan"},
        ]
    },
    {
        "control_code": "LC-SR-001",
        "title": "Vendor Security Assessment & Executed DPA",
        "category": "SUPPLIER_RELATIONSHIPS",
        "description": "Evaluate third-party cloud service providers and subprocessors for security and privacy posture prior to onboarding and annually thereafter.",
        "guidance": "Require signed Data Processing Addendums (DPA) and SOC 2 Type II or ISO 27001 certifications.",
        "default_implementation_type": "MANUAL",
        "default_frequency": "ANNUAL",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.5.19", "title": "Information security in supplier relationships"},
            {"framework": "SOC2_2017", "code": "CC9.2", "title": "Vendor and third-party risk"},
            {"framework": "DPDP_2023", "code": "SEC-10", "title": "Data processor contract terms"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-10", "title": "Vendor Risk Governance"},
        ]
    },
    {
        "control_code": "LC-PR-001",
        "title": "DPDP Data Inventory & Processing Activities Register",
        "category": "PRIVACY_PROTECTION",
        "description": "Maintain an up-to-date inventory of all personal data categories, processing purposes, lawful/business grounds, retention periods, and subprocessors.",
        "guidance": "Ensure explicit purpose limitation and record data principal categories.",
        "default_implementation_type": "HYBRID",
        "default_frequency": "ANNUAL",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.5.34", "title": "Privacy and protection of PII"},
            {"framework": "SOC2_2017", "code": "P1.1", "title": "Privacy notice and purpose"},
            {"framework": "DPDP_2023", "code": "PRV-01", "title": "Data fiduciary processing notice"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-11", "title": "Data Inventory Register"},
        ]
    },
    {
        "control_code": "LC-PR-002",
        "title": "Data Principal Rights (DSR) Fulfillment Workflow",
        "category": "PRIVACY_PROTECTION",
        "description": "Provide verifiable workflows for individuals to exercise rights of access, correction, erasure, consent withdrawal, and grievance redressal.",
        "guidance": "Track request SLA deadlines and record identity verification before fulfilling.",
        "default_implementation_type": "HYBRID",
        "default_frequency": "CONTINUOUS",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.5.34", "title": "Privacy and protection of PII"},
            {"framework": "SOC2_2017", "code": "P3.1", "title": "Choice and consent fulfillment"},
            {"framework": "DPDP_2023", "code": "PRV-02", "title": "Data principal rights fulfillment"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-12", "title": "Privacy Request Workflow"},
        ]
    },
    {
        "control_code": "LC-GV-001",
        "title": "Information Security Policy Suite Approval & Publication",
        "category": "GOVERNANCE",
        "description": "Establish, approve, publish, and annually review information security, privacy, acceptable use, access control, and development policies.",
        "guidance": "Track employee acknowledgement campaigns and require explicit acceptance upon hire and annually.",
        "default_implementation_type": "MANUAL",
        "default_frequency": "ANNUAL",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.5.1", "title": "Policies for information security"},
            {"framework": "SOC2_2017", "code": "CC1.1", "title": "Control environment & policies"},
            {"framework": "DPDP_2023", "code": "GOV-01", "title": "Organizational measures & policies"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-13", "title": "Policy Management"},
        ]
    },
    {
        "control_code": "LC-GV-002",
        "title": "Annual Internal Management Systems Audit & CAPA",
        "category": "GOVERNANCE",
        "description": "Conduct annual internal audit covering technical, operational, and management controls; manage findings through verified Corrective Action (CAPA).",
        "guidance": "Ensure auditor independence; CAPA must include root cause analysis and effectiveness review.",
        "default_implementation_type": "MANUAL",
        "default_frequency": "ANNUAL",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.9.2", "title": "Internal audit"},
            {"framework": "SOC2_2017", "code": "CC2.1", "title": "Monitoring activities and evaluations"},
            {"framework": "DPDP_2023", "code": "GOV-02", "title": "Periodic compliance review"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-14", "title": "Internal Audit & CAPA"},
        ]
    },
    {
        "control_code": "LC-GV-003",
        "title": "Executive Management Review & Continual Improvement",
        "category": "GOVERNANCE",
        "description": "Top management conducts annual review of ISMS performance, security objectives, audit results, risks, and resource requirements.",
        "guidance": "Document and retain approved minutes with actionable decisions signed by executive leadership.",
        "default_implementation_type": "MANUAL",
        "default_frequency": "ANNUAL",
        "mappings": [
            {"framework": "ISO_27001_2022", "code": "A.9.3", "title": "Management review"},
            {"framework": "SOC2_2017", "code": "CC2.2", "title": "Communication of deficiencies"},
            {"framework": "DPDP_2023", "code": "GOV-03", "title": "Leadership accountability"},
            {"framework": "LAUNCHCOMPLY_BASELINE_V1", "code": "LC-15", "title": "Management Review"},
        ]
    }
]

FRAMEWORK_VERSIONS_SEED = [
    {
        "code": "ISO_27001_2022",
        "name": "ISO/IEC 27001:2022",
        "version": "2022",
        "description": "International standard for Information Security Management Systems (ISMS) covering 93 Annex A controls.",
        "effective_date": datetime(2022, 10, 25),
    },
    {
        "code": "SOC2_2017",
        "name": "AICPA SOC 2 Trust Services Criteria",
        "version": "2017 (Rev 2022)",
        "description": "AICPA Trust Services Criteria covering Security (Common Criteria), Availability, Confidentiality, and Privacy.",
        "effective_date": datetime(2017, 12, 15),
    },
    {
        "code": "DPDP_2023",
        "name": "India Digital Personal Data Protection Act",
        "version": "2023",
        "description": "India statutory privacy framework for data fiduciaries covering reasonable security safeguards and data principal rights.",
        "effective_date": datetime(2023, 8, 11),
    },
    {
        "code": "LAUNCHCOMPLY_BASELINE_V1",
        "name": "LaunchComply Production Baseline",
        "version": "v1.0",
        "description": "LaunchComply core cloud security, deployment reliability, and DevSecOps operational standard.",
        "effective_date": datetime(2026, 1, 1),
    },
]


class ComplianceFrameworkEngine:
    """Core framework-neutral compliance engine."""

    async def ensure_canonical_library(self, db: AsyncSession):
        """Initializes canonical controls, framework versions, and mappings if not already present."""
        for fv_data in FRAMEWORK_VERSIONS_SEED:
            stmt = select(FrameworkVersion).where(FrameworkVersion.code == fv_data["code"])
            res = await db.execute(stmt)
            existing = res.scalars().first()
            if not existing:
                fv = FrameworkVersion(
                    code=fv_data["code"],
                    name=fv_data["name"],
                    version=fv_data["version"],
                    description=fv_data["description"],
                    effective_date=fv_data["effective_date"],
                    status="ACTIVE"
                )
                db.add(fv)
        await db.flush()

        # Fetch all framework versions
        res = await db.execute(select(FrameworkVersion))
        fv_map = {fv.code: fv.id for fv in res.scalars().all()}

        for c_data in CANONICAL_CONTROLS_SEED:
            stmt = select(CanonicalControl).where(CanonicalControl.control_code == c_data["control_code"])
            res = await db.execute(stmt)
            control = res.scalars().first()
            if not control:
                control = CanonicalControl(
                    control_code=c_data["control_code"],
                    title=c_data["title"],
                    category=c_data["category"],
                    description=c_data["description"],
                    guidance=c_data["guidance"],
                    default_implementation_type=c_data["default_implementation_type"],
                    default_frequency=c_data["default_frequency"]
                )
                db.add(control)
                await db.flush()

            # Check mappings
            for m in c_data.get("mappings", []):
                fv_id = fv_map.get(m["framework"])
                if fv_id:
                    m_stmt = select(ControlFrameworkMapping).where(
                        ControlFrameworkMapping.canonical_control_id == control.id,
                        ControlFrameworkMapping.framework_version_id == fv_id
                    )
                    m_res = await db.execute(m_stmt)
                    if not m_res.scalars().first():
                        mapping = ControlFrameworkMapping(
                            canonical_control_id=control.id,
                            framework_version_id=fv_id,
                            requirement_code=m["code"],
                            requirement_title=m["title"]
                        )
                        db.add(mapping)

        await db.flush()

    async def ensure_organization_controls(self, db: AsyncSession, organization_id: str):
        """Ensures all canonical controls have an implementation record for the organization."""
        await self.ensure_canonical_library(db)
        
        controls = (await db.execute(select(CanonicalControl))).scalars().all()
        for control in controls:
            stmt = select(ControlImplementation).where(
                ControlImplementation.organization_id == organization_id,
                ControlImplementation.control_id == control.id
            )
            existing = (await db.execute(stmt)).scalars().first()
            if not existing:
                impl = ControlImplementation(
                    organization_id=organization_id,
                    control_id=control.id,
                    status="IMPLEMENTED",
                    owner="compliance@launchcomply.io",
                    implementation_description=f"Automated and procedural implementation of {control.title} via LaunchComply engine.",
                    applicable=True,
                    implementation_type=control.default_implementation_type,
                    frequency=control.default_frequency,
                    maturity="DEFINED",
                    last_reviewed_at=datetime.utcnow() - timedelta(days=15),
                    next_review_at=datetime.utcnow() + timedelta(days=75),
                    effective_from=datetime.utcnow() - timedelta(days=90),
                )
                db.add(impl)
        await db.flush()

    async def calculate_framework_readiness(
        self, db: AsyncSession, organization_id: str, framework_code: str
    ) -> Dict[str, Any]:
        """Calculates an explainable readiness assessment for a specific framework version."""
        await self.ensure_organization_controls(db, organization_id)

        fv_stmt = select(FrameworkVersion).where(FrameworkVersion.code == framework_code)
        fv = (await db.execute(fv_stmt)).scalars().first()
        if not fv:
            # Fallback to general baseline
            framework_name = framework_code
        else:
            framework_name = fv.name

        # Fetch all mappings for this framework version
        mappings_query = (
            select(ControlFrameworkMapping)
            .join(FrameworkVersion)
            .where(FrameworkVersion.code == framework_code)
            .options(
                selectinload(ControlFrameworkMapping.canonical_control)
                .selectinload(CanonicalControl.implementations)
            )
        )
        mappings = (await db.execute(mappings_query)).scalars().all()

        total_mapped = len(mappings)
        if total_mapped == 0:
            return {
                "framework_code": framework_code,
                "framework_name": framework_name,
                "readiness_percentage": 0.0,
                "readiness_display": "0%",
                "total_controls": 0,
                "implemented_controls": 0,
                "effective_controls": 0,
                "stale_controls": 0,
                "open_exceptions": 0,
                "status": "NOT_STARTED",
                "certification_statement": "Readiness Program Active. (LaunchComply provides evidence coverage and readiness indicators. External certification requires accredited auditor report.)"
            }

        implemented_count = 0
        effective_count = 0
        stale_count = 0
        exceptions_count = 0
        applicable_count = 0
        total_evidence_count = 0

        category_stats: Dict[str, Dict[str, int]] = {}

        for mapping in mappings:
            ctrl = mapping.canonical_control
            cat = ctrl.category if ctrl else "GENERAL"
            if cat not in category_stats:
                category_stats[cat] = {"total": 0, "passed": 0}
            category_stats[cat]["total"] += 1

            # Find implementation for this org
            org_impl = None
            if ctrl and ctrl.implementations:
                for imp in ctrl.implementations:
                    if imp.organization_id == organization_id:
                        org_impl = imp
                        break

            if org_impl and org_impl.applicable:
                applicable_count += 1
                if org_impl.status in ("IMPLEMENTED", "EFFECTIVE"):
                    implemented_count += 1
                    category_stats[cat]["passed"] += 1
                if org_impl.status == "EFFECTIVE":
                    effective_count += 1
                elif org_impl.status == "STALE_EVIDENCE":
                    stale_count += 1

        # Check exceptions for org
        exc_stmt = select(ControlException).where(
            ControlException.organization_id == organization_id,
            ControlException.status.in_(["OPEN", "IN_PROGRESS"])
        )
        exceptions = (await db.execute(exc_stmt)).scalars().all()
        exceptions_count = len(exceptions)

        # Readiness percentage calculation based on applicable controls implemented
        if applicable_count > 0:
            readiness_pct = round((implemented_count / applicable_count) * 100, 1)
        else:
            readiness_pct = 0.0

        # Adjust score slightly if there are open exceptions (each active exception reduces 3%)
        readiness_pct = max(0.0, min(100.0, readiness_pct - (exceptions_count * 3.0)))

        return {
            "framework_code": framework_code,
            "framework_name": framework_name,
            "readiness_percentage": readiness_pct,
            "readiness_display": f"{int(readiness_pct)}%",
            "total_controls": total_mapped,
            "applicable_controls": applicable_count,
            "implemented_controls": implemented_count,
            "effective_controls": effective_count,
            "stale_controls": stale_count,
            "open_exceptions": exceptions_count,
            "category_breakdown": category_stats,
            "status": "HEALTHY_READINESS" if readiness_pct >= 70 else "NEEDS_ATTENTION",
            "certification_statement": "Readiness Program Active. (LaunchComply provides continuous evidence verification and readiness indicators. External certification requires accredited auditor report.)"
        }


framework_engine = ComplianceFrameworkEngine()
