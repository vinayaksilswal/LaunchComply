"""Phase 14 Onboarding Diagnostics & Manual Assistance Tracking Service.

Tracks granular onboarding funnel friction, failure reasons (e.g. AWS IAM, GitHub, DNS),
stage delays, and operator manual assistance tasks (§31, §32, §41-47, §114-116, §181).
Identifies high-impact automation candidates for future engineering.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.auth import Organization
from app.models.platform_admin import ManualAssistanceTask


class OnboardingDiagnosticsService:
    """Diagnoses customer onboarding friction and tracks manual operator interventions."""

    async def get_top_blockers(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Calculates onboarding blocker frequency, affected organizations, and average delay (§31, §32).
        Helps Customer Success prioritize interventions and product teams automate friction.
        """
        org_res = await db.execute(select(Organization).where(Organization.is_demo == False))
        orgs = org_res.scalars().all()

        blocker_counts: Dict[str, List[Organization]] = {}
        now = datetime.utcnow()

        for org in orgs:
            blocker = getattr(org, "onboarding_blocker", None)
            if blocker:
                blocker_counts.setdefault(blocker, []).append(org)

        # Build curated aggregated list
        results = []
        for blocker, affected_orgs in blocker_counts.items():
            delays = []
            for o in affected_orgs:
                entry = getattr(o, "stage_entered_at", None) or o.created_at
                delays.append((now - entry).days)
            avg_delay = round(sum(delays) / len(delays), 1) if delays else 0.0

            results.append({
                "blocker": blocker,
                "customers_affected_count": len(affected_orgs),
                "affected_customer_slugs": [o.slug for o in affected_orgs],
                "average_delay_days": avg_delay,
                "severity": "HIGH" if avg_delay > 3 or len(affected_orgs) > 2 else "MEDIUM",
                "recommended_action": self._get_recommended_remediation(blocker)
            })

        # Ensure top standard categories represented
        if not results:
            results = [
                {
                    "blocker": "AWS IAM Role Assumption / STS Trust Policy",
                    "customers_affected_count": 0,
                    "affected_customer_slugs": [],
                    "average_delay_days": 0.0,
                    "severity": "LOW",
                    "recommended_action": "Provide 1-click CloudFormation template in trust setup modal."
                }
            ]

        results.sort(key=lambda x: x["customers_affected_count"], reverse=True)

        return {
            "total_blocked_customers": sum(r["customers_affected_count"] for r in results),
            "top_blockers": results,
            "governing_standard": "BUSINESS_METRICS.md §5"
        }

    def _get_recommended_remediation(self, blocker: str) -> str:
        b_lower = blocker.lower()
        if "aws" in b_lower or "iam" in b_lower or "sts" in b_lower:
            return "Deploy assisted CloudFormation stack or launch live TAM screen-share setup."
        elif "dns" in b_lower or "domain" in b_lower or "ssl" in b_lower:
            return "Check Route53 / Cloudflare CNAME propagation and ACM certificate validation state."
        elif "github" in b_lower or "repo" in b_lower:
            return "Verify read-only GitHub App installation and repository permissions."
        elif "billing" in b_lower or "payment" in b_lower:
            return "Issue formal enterprise invoice or verify bank transfer reconciliation UTR."
        elif "security" in b_lower or "vapt" in b_lower:
            return "Send Rules of Engagement for customer owner digital signature."
        return "Schedule 15-minute technical unblocking call with Customer Success Engineer."

    async def list_manual_assistance_tasks(self, db: AsyncSession, org_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Lists tracked manual interventions, hours consumed, and automation candidates (§45-47, §114-116).
        """
        stmt = select(ManualAssistanceTask).order_by(ManualAssistanceTask.created_at.desc())
        if org_id:
            stmt = stmt.where(ManualAssistanceTask.organization_id == org_id)

        res = await db.execute(stmt)
        tasks = res.scalars().all()

        total_minutes = sum(t.duration_minutes for t in tasks)
        by_category: Dict[str, int] = {}
        automation_candidates = []

        for t in tasks:
            by_category[t.category] = by_category.get(t.category, 0) + t.duration_minutes
            if t.is_automation_candidate:
                automation_candidates.append({
                    "id": t.id,
                    "task_name": t.task_name,
                    "category": t.category,
                    "duration_minutes": t.duration_minutes,
                    "operator": t.operator,
                    "resolution_notes": t.resolution_notes,
                    "created_at": t.created_at.isoformat()
                })

        return {
            "total_tasks": len(tasks),
            "total_hours_spent": round(total_minutes / 60.0, 1),
            "category_hours": {k: round(v / 60.0, 1) for k, v in by_category.items()},
            "automation_candidates_count": len(automation_candidates),
            "automation_candidates": automation_candidates,
            "tasks": [
                {
                    "id": t.id,
                    "organization_id": t.organization_id,
                    "task_name": t.task_name,
                    "category": t.category,
                    "duration_minutes": t.duration_minutes,
                    "operator": t.operator,
                    "resolution_notes": t.resolution_notes,
                    "is_automation_candidate": t.is_automation_candidate,
                    "created_at": t.created_at.isoformat()
                }
                for t in tasks
            ]
        }

    async def log_manual_assistance_task(
        self,
        db: AsyncSession,
        organization_id: str,
        task_name: str,
        category: str,
        duration_minutes: int,
        operator: str,
        resolution_notes: Optional[str] = None,
        is_automation_candidate: bool = False
    ) -> ManualAssistanceTask:
        """Logs human work spent unblocking a customer to guide future automation roadmap."""
        task = ManualAssistanceTask(
            organization_id=organization_id,
            task_name=task_name,
            category=category.upper(),
            duration_minutes=duration_minutes,
            operator=operator,
            resolution_notes=resolution_notes,
            is_automation_candidate=is_automation_candidate
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task


onboarding_diagnostics_service = OnboardingDiagnosticsService()
