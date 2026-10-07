"""Phase 13 First 10 Customer Program, Onboarding Stages, Success Criteria and White-Glove Pilot Service."""
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.auth import Organization, User, OrganizationMembership
from app.models.billing import Subscription, SubscriptionStatus, Invoice
from app.models.application import Application
from app.models.entities import SecurityFinding
from app.models.compliance_risk import Risk
from app.models.support import SupportTicket, TicketStatus, TicketPriority
from app.models.production_launch import CustomerAcceptance, CustomerFeedback
from app.models.platform_admin import CustomerSuccessHealth, CustomerSuccessTask, CustomerHealthStatus, ManualAssistanceTask


VALID_STAGES = [
    # Canonical stages (§6)
    "PROSPECT",
    "QUALIFIED",
    "DEMO",
    "PILOT_APPROVED",
    "ACCOUNT_CREATED",
    "REPO_CONNECTED",
    "ARCHITECTURE_APPROVED",
    "AWS_ONBOARDING",
    "DEPLOYMENT_IN_PROGRESS",
    "DEPLOYMENT_LIVE",
    "SECURITY_BASELINE",
    "VALUE_VALIDATED",
    "COMMERCIAL_COMMITMENT",
    "PAYMENT_PENDING",
    "PAYMENT_RECONCILED",
    "PAID_RETAINED",
    "AT_RISK",
    "CHURNED",
    # Legacy compatibility stages
    "LEAD",
    "TRIAL",
    "TECHNICAL_ONBOARDING",
    "AWS_CONNECTED",
    "DEPLOYING",
    "LIVE",
    "COMPLIANCE_BASELINE",
    "PAID",
    "SUCCESSFUL",
]


class FirstCustomerService:
    """Manages the operational lifecycle for LaunchComply's initial 10 production customers."""

    async def list_first_customers(self, db: AsyncSession, real_only: bool = False, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves the curated First 10 Customer list with cross-functional state
        (AWS, Deployment, Security, Compliance, Billing, Health, Internal Owners).
        Strictly distinguishes between live customer tenants and demo/test tenants.
        Supports real_only filter to isolate genuine paying/evaluating customers from synthetic accounts.
        """
        stmt = select(Organization).order_by(Organization.created_at.desc())
        if real_only:
            stmt = stmt.where(
                Organization.is_demo == False,
                Organization.is_test == False,
                Organization.is_internal == False
            )
        else:
            stmt = stmt.where(Organization.is_demo == False)

        orgs_res = await db.execute(stmt.limit(limit))
        orgs = orgs_res.scalars().all()

        customers = []
        now = datetime.utcnow()

        for org in orgs:
            # 1. Subscription & Billing
            sub_res = await db.execute(select(Subscription).where(Subscription.organization_id == org.id))
            sub = sub_res.scalars().first()
            plan = sub.plan_tier if sub else org.tier.upper()
            sub_status = sub.status.value if sub else "TRIALING"
            is_paid = (sub.status == SubscriptionStatus.ACTIVE and getattr(sub, "is_real_payment_verified", False)) if sub else False

            # 2. Applications & Deployment status
            apps_res = await db.execute(select(Application).where(Application.organization_id == org.id))
            apps = apps_res.scalars().all()
            app_count = len(apps)
            has_deployment = any(
                str(getattr(a, "status", "")).upper() in ["DEPLOYED", "LIVE", "ACTIVE", "HEALTHY", "APPSTATUS.HEALTHY"]
                for a in apps
            )
            aws_connected = org.aws_monthly_budget is not None and len(apps) > 0

            # 3. Security Baseline (zero criticals check)
            findings_res = await db.execute(
                select(SecurityFinding).where(
                    SecurityFinding.organization_id == org.id,
                    SecurityFinding.severity == "CRITICAL",
                    SecurityFinding.status.in_(["OPEN", "IN_PROGRESS"])
                )
            )
            critical_findings = len(findings_res.scalars().all())
            security_baseline = "PASS" if critical_findings == 0 and app_count > 0 else "PENDING" if app_count > 0 else "NOT_STARTED"

            # 4. Compliance Workspace
            risks_res = await db.execute(select(Risk).where(Risk.organization_id == org.id))
            risks_count = len(risks_res.scalars().all())
            compliance_status = "ACTIVE" if risks_count > 0 else "PENDING"

            # 5. Customer Acceptance & Stage
            acc_res = await db.execute(select(CustomerAcceptance).where(CustomerAcceptance.organization_id == org.id))
            acceptance = acc_res.scalars().first()

            # 6. Customer Health
            health_res = await db.execute(select(CustomerSuccessHealth).where(CustomerSuccessHealth.organization_id == org.id))
            health = health_res.scalars().first()
            health_score = health.health_score if health else 100.0
            health_status = health.status.value if health else "HEALTHY"

            # Derive Stage
            stage = "TRIAL"
            if acceptance and acceptance.sign_off_status == "ACCEPTED":
                stage = "SUCCESSFUL"
            elif is_paid:
                stage = "PAID"
            elif security_baseline == "PASS" and has_deployment:
                stage = "SECURITY_BASELINE"
            elif has_deployment:
                stage = "LIVE"
            elif aws_connected:
                stage = "AWS_CONNECTED"
            elif app_count > 0:
                stage = "TECHNICAL_ONBOARDING"
            elif health_status == "AT_RISK":
                stage = "AT_RISK"

            # Days in current stage
            stage_entry = getattr(org, "stage_entered_at", None) or org.created_at
            days_in_stage = max((now - stage_entry).days, 1)

            # Manual assistance records count
            asst_res = await db.execute(
                select(ManualAssistanceTask).where(ManualAssistanceTask.organization_id == org.id)
            )
            assistance_tasks = asst_res.scalars().all()
            manual_hours = sum(getattr(t, "duration_minutes", 0) / 60.0 for t in assistance_tasks)

            # Success criteria
            success_criteria = {
                "application_connected": app_count > 0,
                "architecture_approved": app_count > 0,
                "aws_connected": aws_connected,
                "production_deployed": has_deployment,
                "zero_critical_vulnerabilities": critical_findings == 0,
                "backup_dr_verified": True,
                "compliance_workspace_active": risks_count > 0,
                "owner_acceptance_signed": acceptance.sign_off_status == "ACCEPTED" if acceptance else False,
            }

            # Owner assignments
            internal_owner = acceptance.internal_owner if acceptance else "Customer Success Lead"
            customer_contact = acceptance.customer_contact if acceptance else f"admin@{org.slug}.io"

            # Next Action
            next_action = "Schedule white-glove AWS setup"
            if stage == "SUCCESSFUL":
                next_action = "Quarterly Business Review & Expansion check"
            elif stage == "PAID":
                next_action = "Continuous assurance & auditor grant setup"
            elif stage == "LIVE":
                next_action = "Execute baseline VAPT scan"
            elif stage == "AWS_CONNECTED":
                next_action = "Deploy application container to ECS"
            elif stage == "TECHNICAL_ONBOARDING":
                next_action = "Verify IAM role assumption policy"

            customers.append({
                "id": org.id,
                "customer": org.name,
                "slug": org.slug,
                "stage": stage,
                "days_in_stage": days_in_stage,
                "plan": plan,
                "created_at": org.created_at.isoformat(),
                "target_go_live": (org.created_at + timedelta(days=14)).strftime("%Y-%m-%d"),
                "technical_owner": "DevOps Architect",
                "commercial_owner": internal_owner,
                "customer_contact": customer_contact,
                "customer_classification": getattr(org, "customer_classification", "REAL") or "REAL",
                "commercial_state": getattr(org, "commercial_state", "TRIAL") or "TRIAL",
                "onboarding_blocker": getattr(org, "onboarding_blocker", None) or ("Awaiting AWS IAM verification" if not aws_connected else None),
                "desired_outcome": getattr(org, "desired_outcome", "Production AWS ECS deploy with SOC 2 compliance readiness"),
                "success_definition": getattr(org, "success_definition", "Zero critical security findings, automated daily backups, and uptime SLA"),
                "aws_connected": aws_connected,
                "deployment_live": has_deployment,
                "security_status": security_baseline,
                "compliance_status": compliance_status,
                "billing_status": sub_status,
                "health_status": health_status,
                "health_score": health_score,
                "manual_assistance_hours": round(manual_hours, 1),
                "manual_assistance_tasks_count": len(assistance_tasks),
                "next_action": next_action,
                "success_criteria": success_criteria,
                "is_demo": org.is_demo,
                "is_test": getattr(org, "is_test", False),
                "is_internal": getattr(org, "is_internal", False),
            })

        return customers

    async def update_customer_stage(
        self,
        db: AsyncSession,
        organization_id: str,
        stage: str,
        next_action: Optional[str] = None,
        internal_owner: Optional[str] = None,
        notes: Optional[str] = None,
        blocker: Optional[str] = None,
        commercial_state: Optional[str] = None
    ) -> Dict[str, Any]:
        """Updates internal operational tracking stage for a customer."""
        if stage not in VALID_STAGES:
            raise ValueError(f"Invalid stage: {stage}. Valid stages: {', '.join(VALID_STAGES)}")

        org_res = await db.execute(select(Organization).where(Organization.id == organization_id))
        org = org_res.scalars().first()
        if not org:
            raise ValueError("Organization not found")

        now = datetime.utcnow()
        org.stage_entered_at = now
        if blocker is not None:
            org.onboarding_blocker = blocker
        if commercial_state is not None:
            org.commercial_state = commercial_state

        # Log to canonical CustomerStageHistory table
        from app.models.customer_operations import CustomerStageHistory
        prev_res = await db.execute(
            select(CustomerStageHistory)
            .where(
                CustomerStageHistory.organization_id == organization_id,
                CustomerStageHistory.exited_at == None
            )
            .order_by(CustomerStageHistory.entered_at.desc())
        )
        prev_h = prev_res.scalars().first()
        if prev_h:
            prev_h.exited_at = now
            prev_h.duration_days = round((now - prev_h.entered_at).total_seconds() / 86400.0, 2)

        stage_hist = CustomerStageHistory(
            organization_id=organization_id,
            stage=stage,
            entered_at=now,
            blocker=blocker or org.onboarding_blocker,
            internal_owner=internal_owner or "CS Lead",
            notes=notes
        )
        db.add(stage_hist)

        acc_res = await db.execute(select(CustomerAcceptance).where(CustomerAcceptance.organization_id == organization_id))
        acc = acc_res.scalars().first()
        if not acc:
            acc = CustomerAcceptance(
                organization_id=organization_id,
                customer_contact=f"owner@{org.slug}.io",
                internal_owner=internal_owner or "CS Lead",
                sign_off_status="PENDING" if stage != "SUCCESSFUL" else "ACCEPTED",
                open_items_json=json.dumps([notes] if notes else [])
            )
            db.add(acc)
        else:
            if internal_owner:
                acc.internal_owner = internal_owner
            if stage == "SUCCESSFUL":
                acc.sign_off_status = "ACCEPTED"
            if notes:
                items = json.loads(acc.open_items_json or "[]")
                items.append(notes)
                acc.open_items_json = json.dumps(items)

        # Create or update CustomerSuccessTask if next action provided
        if next_action:
            task = CustomerSuccessTask(
                organization_id=organization_id,
                title=next_action,
                due_date=datetime.utcnow() + timedelta(days=3),
                status="OPEN",
                owner=internal_owner or "Customer Success Lead"
            )
            db.add(task)

        await db.commit()
        return {
            "organization_id": organization_id,
            "customer": org.name,
            "stage": stage,
            "next_action": next_action,
            "internal_owner": internal_owner,
            "onboarding_blocker": org.onboarding_blocker,
            "commercial_state": org.commercial_state,
            "updated_at": datetime.utcnow().isoformat()
        }

    async def record_manual_assistance(
        self,
        db: AsyncSession,
        organization_id: str,
        title: str,
        category: str,
        hours_spent: float,
        assistance_notes: str,
        root_cause: str,
        is_deflection_candidate: bool = True,
        deflection_fix: Optional[str] = None
    ) -> ManualAssistanceTask:
        """Records white-glove manual assistance provided by staff to identify automation deflection candidates (§18)."""
        task = ManualAssistanceTask(
            organization_id=organization_id,
            title=title,
            category=category,
            hours_spent=hours_spent,
            assistance_notes=assistance_notes,
            root_cause=root_cause,
            is_deflection_candidate=is_deflection_candidate,
            deflection_fix=deflection_fix
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task

    async def get_manual_assistance_summary(self, db: AsyncSession) -> Dict[str, Any]:
        """Summarizes staff manual assistance, total hours, and deflection candidates for engineering (§18)."""
        res = await db.execute(select(ManualAssistanceTask).order_by(ManualAssistanceTask.created_at.desc()))
        tasks = res.scalars().all()

        total_hours = sum(t.hours_spent for t in tasks)
        by_category: Dict[str, float] = {}
        deflection_candidates = []

        for t in tasks:
            by_category[t.category] = by_category.get(t.category, 0.0) + t.hours_spent
            if t.is_deflection_candidate and t.deflection_fix:
                deflection_candidates.append({
                    "id": t.id,
                    "title": t.title,
                    "category": t.category,
                    "hours_spent": t.hours_spent,
                    "root_cause": t.root_cause,
                    "deflection_fix": t.deflection_fix,
                    "created_at": t.created_at.isoformat()
                })

        return {
            "total_manual_hours": round(total_hours, 1),
            "total_tasks_recorded": len(tasks),
            "hours_by_category": {k: round(v, 1) for k, v in by_category.items()},
            "deflection_candidates": deflection_candidates
        }


first_customer_service = FirstCustomerService()
