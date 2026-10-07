"""Phase 13 CRM Leads, Demo Requests, Standardized Proposals, and Service Orders Service."""
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.crm import (
    Lead,
    Opportunity,
    ServiceQuote,
    ServiceOrder,
    LeadStatus,
    OpportunityStage,
    QuoteStatus,
    OrderStatus,
)


PROPOSAL_TEMPLATES = [
    {
        "template_id": "SAAS_SUBSCRIPTION",
        "title": "LaunchComply SaaS Platform Annual Agreement",
        "problem": "Manual DevOps deployments, unverified cloud configurations, and lack of continuous compliance posture.",
        "current_state": "Applications hosted on ad-hoc servers or manual AWS console without formal automated guardrails.",
        "scope": "LaunchComply Growth/Business Platform Access, Architecture Generation, ECS automated pipelines, and continuous assurance.",
        "deliverables": [
            "Continuous multi-environment deployments",
            "Continuous ISO 27001 / SOC 2 control monitoring",
            "Auditor Workspace with cryptographic proof packages",
            "Multi-region automated restore drills"
        ],
        "timeline": "Immediate self-serve provisioning + 14-day assisted setup",
        "price_guidance": "₹1,99,990 - ₹4,99,990 / year",
        "responsibilities": "Customer provides AWS IAM read/write role assumption; LaunchComply provisions architecture and continuous assurance bots.",
        "assumptions": "Customer maintains active AWS cloud subscription.",
        "exclusions": "Third-party AWS consumption charges are billed directly by AWS.",
        "terms": "Net-30 payment terms, 99.9% uptime SLA, SOC 2 compliant processing."
    },
    {
        "template_id": "AWS_DEPLOYMENT",
        "title": "AWS Production Architecture & Deployment Advisory",
        "problem": "Unscalable or insecure AWS infrastructure lacking VPC isolation, autoscaling, and automated CI/CD.",
        "current_state": "Application running on Docker Compose or bare EC2 instances without multi-AZ resilience.",
        "scope": "Turnkey AWS Well-Architected ECS Fargate infrastructure deployment with RDS PostgreSQL Multi-AZ and Route53 DNS.",
        "deliverables": [
            "Terraform / OpenTofu verified infrastructure modules",
            "Production ECS Fargate cluster with Auto-Scaling",
            "Encrypted RDS PostgreSQL with automated snapshot policy",
            "CloudWatch structured dashboards and P1 alarm routing"
        ],
        "timeline": "2 Weeks from IAM credential verification",
        "price_guidance": "₹99,999 (Fixed Fee)",
        "responsibilities": "Joint architecture review sessions and DNS record delegation.",
        "assumptions": "Dockerized web application repository available on GitHub.",
        "exclusions": "Application-level code refactoring.",
        "terms": "50% advance on kickoff, 50% on customer production acceptance."
    },
    {
        "template_id": "VAPT",
        "title": "Comprehensive Vulnerability Assessment & Penetration Testing (VAPT)",
        "problem": "Unverified web application and cloud API vulnerabilities exposed to cyber threats and compliance audit failure.",
        "current_state": "Pre-launch or annual compliance audit requirement without formal third-party security certification.",
        "scope": "Black-box and grey-box web application testing (OWASP Top 10, API Security Top 10, Cloud IAM privilege escalation).",
        "deliverables": [
            "Executive vulnerability assessment summary",
            "Detailed technical finding report with reproduction steps and CVSS scores",
            "Remediation verification and re-test within 30 days",
            "Formal signed VAPT Attestation Certificate"
        ],
        "timeline": "5-7 business days testing + 2 business days reporting",
        "price_guidance": "₹1,49,999 (Per Application Scope)",
        "responsibilities": "Customer provides test environment accounts and written testing authorization.",
        "assumptions": "Dedicated staging environment with test data.",
        "exclusions": "Social engineering, physical office attacks, or DDoS testing.",
        "terms": "Explicit digital Rules of Engagement authorization required prior to packet dispatch."
    },
    {
        "template_id": "ISO_27001_READINESS",
        "title": "ISO/IEC 27001:2022 Certification FastTrack Readiness",
        "problem": "Requirement to achieve ISO 27001 certification to unlock enterprise SaaS sales pipeline.",
        "current_state": "Ad-hoc internal policies without formal ISMS, risk assessment matrix, or Annex A controls mapping.",
        "scope": "Turnkey ISMS buildout, Statement of Applicability (SoA), internal audit, and Stage 1 & 2 auditor handoff.",
        "deliverables": [
            "Complete 23 statutory ISO policies customized to company operations",
            "Risk Assessment Matrix with treatable risk registers",
            "Automated evidence collection for 93 Annex A controls",
            "Formal Internal Audit report and Management Review minutes"
        ],
        "timeline": "4-6 weeks to audit-ready state",
        "price_guidance": "₹1,99,999 (Implementation Advisory)",
        "responsibilities": "Management participation in risk review and policy adoption.",
        "assumptions": "Senior leadership support for mandatory security controls.",
        "exclusions": "Accredited certification body registrar audit fees.",
        "terms": "Guaranteed audit readiness or advisory support until Stage 1 completion."
    },
    {
        "template_id": "SOC_2_READINESS",
        "title": "SOC 2 Type I & Type II Enterprise Readiness",
        "problem": "US and global enterprise prospects blocking vendor deals pending SOC 2 attestation report.",
        "current_state": "Security practices exist informally but lack continuous automated evidence collection and auditor mapping.",
        "scope": "Security, Availability, and Confidentiality Trust Services Criteria (TSC) control implementation.",
        "deliverables": [
            "SOC 2 Trust Services Criteria control matrix",
            "Automated evidence sync for AWS, GitHub, Okta, and Endpoint controls",
            "Auditor Portal workspace with scoped auditor access",
            "Pre-audit gap remediation and CPA audit coordination"
        ],
        "timeline": "4 weeks for Type I readiness; 3-month observation for Type II",
        "price_guidance": "₹1,99,999 (Advisory + Continuous Evidence)",
        "responsibilities": "Timely evidence sign-off and vendor review execution.",
        "assumptions": "AWS cloud deployment with enforced MFA.",
        "exclusions": "Independent CPA firm attestation fee.",
        "terms": "Milestone-based delivery."
    },
    {
        "template_id": "MANAGED_COMPLIANCE",
        "title": "Managed Compliance & Virtual CISO (vCISO) Operations",
        "problem": "SaaS startups lacking full-time security and compliance staff to handle customer questionnaires and audits.",
        "current_state": "Engineers pulled away from roadmap development to answer vendor questionnaires and configure evidence.",
        "scope": "Dedicated vCISO advisory, customer security questionnaire handling, quarterly access reviews, and vendor assessments.",
        "deliverables": [
            "Dedicated senior security lead (vCISO)",
            "Turnkey turnaround on enterprise vendor security questionnaires (SIG/CAIQ)",
            "Quarterly user access and privilege reviews",
            "Annual vendor and subprocessor security reviews"
        ],
        "timeline": "Annual ongoing retainer",
        "price_guidance": "₹49,999 / month",
        "responsibilities": "Routing inbound prospect questionnaires to vCISO desk.",
        "assumptions": "Quarterly operational sync.",
        "exclusions": "Full-time on-site personnel.",
        "terms": "Monthly billing with 30-day cancellation notice."
    },
    {
        "template_id": "MANAGED_CLOUD",
        "title": "Managed Cloud Security & DevOps Assurance",
        "problem": "Need for ongoing 24/7 infrastructure observability, patch management, and incident support.",
        "current_state": "Founding engineers manage production infrastructure on-call.",
        "scope": "24/7 CloudWatch and security alert triage, weekly DR snapshot validation, and container patching.",
        "deliverables": [
            "Proactive alert monitoring and remediation",
            "Monthly non-destructive restore rehearsals with RTO evidence",
            "Zero-downtime container updates and base image patching",
            "Monthly cloud cost and optimization report"
        ],
        "timeline": "Ongoing monthly retainer",
        "price_guidance": "₹39,999 / month",
        "responsibilities": "Granting scoped CloudWatch and deployment permissions.",
        "assumptions": "Workload hosted on AWS.",
        "exclusions": "Application-level feature programming.",
        "terms": "1-hour critical response SLA."
    }
]


class CRMService:
    """Manages sales leads, opportunity pipeline, and commercial service orders."""

    def get_proposal_templates(self) -> List[Dict[str, Any]]:
        """Returns standardized enterprise service proposal templates (§50, §51)."""
        return PROPOSAL_TEMPLATES

    async def create_lead(
        self,
        db: AsyncSession,
        name: str,
        email: str,
        company: Optional[str] = None,
        phone: Optional[str] = None,
        source: str = "WEBSITE",
        notes: Optional[str] = None,
        estimated_value: float = 0.0
    ) -> Lead:
        """Captures a new commercial lead from marketing forms or contact requests."""
        lead = Lead(
            name=name,
            email=email.lower().strip(),
            company=company,
            phone=phone,
            source=source,
            status=LeadStatus.NEW,
            estimated_value=estimated_value,
            notes=notes
        )
        db.add(lead)
        await db.commit()
        await db.refresh(lead)
        return lead

    async def create_demo_request(
        self,
        db: AsyncSession,
        name: str,
        email: str,
        company: str,
        phone: Optional[str] = None,
        source: str = "BOOK_DEMO",
        use_case: Optional[str] = None,
        company_size: Optional[str] = None,
        cloud_provider: Optional[str] = "AWS",
        current_deployment: Optional[str] = None,
        desired_compliance: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a qualified sales demo request (§42, §43, §44), automatically logging
        both a Lead and an active Sales Opportunity.
        """
        qualification_notes = f"Use Case: {use_case or 'SaaS Production Readiness'} | Size: {company_size or '11-50'} | Cloud: {cloud_provider or 'AWS'} | Compliance: {desired_compliance or 'ISO 27001 / SOC 2'} | Additional: {notes or 'None'}"

        lead = Lead(
            name=name,
            email=email.lower().strip(),
            company=company,
            phone=phone,
            source=source,
            status=LeadStatus.NEW,
            estimated_value=199990.00,
            notes=qualification_notes
        )
        db.add(lead)
        await db.flush()

        # Create Opportunity
        opp = Opportunity(
            title=f"{company} - {desired_compliance or 'SaaS GA Launch & Compliance'}",
            lead_id=lead.id,
            stage=OpportunityStage.NEW,
            product_or_service=desired_compliance or "Growth SaaS Subscription",
            estimated_value=199990.00,
            currency="INR",
            expected_close_date=datetime.utcnow() + timedelta(days=21),
            owner="Commercial Sales Lead",
            next_action="Confirm 20-minute demo slot"
        )
        db.add(opp)
        await db.commit()
        await db.refresh(lead)
        await db.refresh(opp)

        return {
            "status": "SUCCESS",
            "lead_id": lead.id,
            "opportunity_id": opp.id,
            "company": company,
            "message": "Demo request logged. Sales team notified."
        }

    async def create_service_quote(
        self,
        db: AsyncSession,
        organization_id: str,
        service_name: str,
        scope_description: str,
        deliverables_description: str,
        subtotal: float,
        tax_amount: float = 0.0,
        currency: str = "INR"
    ) -> ServiceQuote:
        """Generates a commercial quote for professional services (e.g. VAPT, ISO implementation)."""
        now = datetime.utcnow()
        year = now.year

        count_res = await db.execute(select(ServiceQuote).where(ServiceQuote.quote_number.like(f"LC-QUO-{year}-%")))
        seq = len(count_res.scalars().all()) + 1
        quote_number = f"LC-QUO-{year}-{seq:04d}"

        quote = ServiceQuote(
            quote_number=quote_number,
            organization_id=organization_id,
            service_name=service_name,
            scope_description=scope_description,
            deliverables_description=deliverables_description,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=subtotal + tax_amount,
            currency=currency,
            valid_until=now + timedelta(days=30),
            status=QuoteStatus.SENT,
            proposal_text=f"LaunchComply Advisory Proposal: {service_name}. Scope: {scope_description}."
        )
        db.add(quote)
        await db.commit()
        await db.refresh(quote)
        return quote

    async def accept_service_quote(
        self,
        db: AsyncSession,
        quote_id: str,
        organization_id: str
    ) -> ServiceOrder:
        """Converts an accepted service quote into an active ServiceOrder."""
        res = await db.execute(
            select(ServiceQuote).where(
                ServiceQuote.id == quote_id,
                ServiceQuote.organization_id == organization_id
            )
        )
        quote = res.scalars().first()
        if not quote:
            raise ValueError("Service quote not found.")

        quote.status = QuoteStatus.ACCEPTED

        now = datetime.utcnow()
        year = now.year
        ord_count_res = await db.execute(select(ServiceOrder).where(ServiceOrder.order_number.like(f"LC-ORD-{year}-%")))
        seq = len(ord_count_res.scalars().all()) + 1
        order_number = f"LC-ORD-{year}-{seq:04d}"

        order = ServiceOrder(
            order_number=order_number,
            quote_id=quote.id,
            organization_id=organization_id,
            service_name=quote.service_name,
            status=OrderStatus.CREATED,
            assigned_consultant="LaunchComply Advisory & Security Team",
            total_amount=quote.total_amount,
            currency=quote.currency,
            milestones_json=json.dumps([
                {"name": "Kickoff & Discovery", "status": "PENDING"},
                {"name": "Execution & Fieldwork", "status": "PENDING"},
                {"name": "Draft Deliverable Review", "status": "PENDING"},
                {"name": "Final Attestation & Sign-off", "status": "PENDING"},
            ])
        )
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order


crm_services_service = CRMService()
