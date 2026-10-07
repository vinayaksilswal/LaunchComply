"""Phase 7 Enterprise Risk Management Service with 5x5 Matrix and Treatment Workflows."""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.compliance_risk import Risk, RiskTreatmentAction, InformationAsset


def get_risk_level(score: int) -> str:
    if score >= 16:
        return "CRITICAL"
    elif score >= 10:
        return "HIGH"
    elif score >= 5:
        return "MEDIUM"
    return "LOW"


class RiskManagementService:
    """Enterprise Risk Register & 5x5 Scoring Engine."""

    async def list_risks(
        self, db: AsyncSession, organization_id: str, status: Optional[str] = None
    ) -> List[Risk]:
        stmt = (
            select(Risk)
            .where(Risk.organization_id == organization_id)
            .options(selectinload(Risk.treatment_actions))
            .order_by(Risk.inherent_score.desc())
        )
        if status:
            stmt = stmt.where(Risk.status == status)
        res = await db.execute(stmt)
        return res.scalars().all()

    async def get_risk(
        self, db: AsyncSession, organization_id: str, risk_id: str
    ) -> Optional[Risk]:
        stmt = (
            select(Risk)
            .where(Risk.organization_id == organization_id, Risk.id == risk_id)
            .options(selectinload(Risk.treatment_actions))
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    async def create_risk(
        self,
        db: AsyncSession,
        organization_id: str,
        risk_code: str,
        title: str,
        category: str,
        asset: str,
        threat: str,
        vulnerability: str,
        likelihood: int,
        impact: int,
        owner: str,
        existing_controls: Optional[str] = None,
        residual_likelihood: Optional[int] = None,
        residual_impact: Optional[int] = None,
        treatment: str = "MITIGATE",
        source_type: str = "MANUAL",
        source_id: Optional[str] = None,
    ) -> Risk:
        # Clamp 1-5
        l = max(1, min(5, likelihood))
        i = max(1, min(5, impact))
        inh_score = l * i

        rl = max(1, min(5, residual_likelihood or (max(1, l - 1))))
        ri = max(1, min(5, residual_impact or (max(1, i - 1))))
        res_score = rl * ri

        risk = Risk(
            organization_id=organization_id,
            risk_id=risk_code,
            title=title,
            category=category,
            asset=asset,
            threat=threat,
            vulnerability=vulnerability,
            likelihood=l,
            impact=i,
            inherent_score=inh_score,
            existing_controls=existing_controls or "Standard infrastructure baseline controls",
            residual_likelihood=rl,
            residual_impact=ri,
            residual_score=res_score,
            owner=owner,
            treatment=treatment,
            status="ASSESSED",
            source_type=source_type,
            source_id=source_id,
            review_date=datetime.utcnow() + timedelta(days=90),
        )
        db.add(risk)
        await db.commit()
        await db.refresh(risk)
        return risk

    async def accept_risk(
        self,
        db: AsyncSession,
        organization_id: str,
        risk_id: str,
        justification: str,
        approver: str,
        expires_days: int = 90,
    ) -> Optional[Risk]:
        risk = await self.get_risk(db, organization_id, risk_id)
        if not risk:
            return None

        risk.treatment = "ACCEPT"
        risk.treatment_justification = justification
        risk.treatment_approver = approver
        risk.treatment_expires_at = datetime.utcnow() + timedelta(days=expires_days)
        risk.status = "ACCEPTED"

        await db.commit()
        await db.refresh(risk)
        return risk

    async def add_treatment_action(
        self,
        db: AsyncSession,
        organization_id: str,
        risk_id: str,
        action: str,
        owner: str,
        due_date: datetime,
        linked_control_code: Optional[str] = None,
        linked_task_id: Optional[str] = None,
    ) -> RiskTreatmentAction:
        treatment = RiskTreatmentAction(
            organization_id=organization_id,
            risk_id=risk_id,
            action=action,
            owner=owner,
            due_date=due_date,
            status="PLANNED",
            linked_control_code=linked_control_code,
            linked_task_id=linked_task_id,
        )
        db.add(treatment)
        await db.commit()
        await db.refresh(treatment)
        return treatment

    async def get_risk_heatmap(
        self, db: AsyncSession, organization_id: str
    ) -> Dict[str, Any]:
        """Generates a 5x5 heatmap aggregation for inherent and residual risks."""
        risks = await self.list_risks(db, organization_id)

        inherent_matrix = [[0 for _ in range(5)] for _ in range(5)]  # rows: likelihood 5..1, cols: impact 1..5
        residual_matrix = [[0 for _ in range(5)] for _ in range(5)]

        critical_count = 0
        high_count = 0
        medium_count = 0
        low_count = 0

        for r in risks:
            l_idx = 5 - r.likelihood  # row index (0 is likelihood 5)
            i_idx = r.impact - 1       # col index (0 is impact 1)
            inherent_matrix[l_idx][i_idx] += 1

            rl_idx = 5 - r.residual_likelihood
            ri_idx = r.residual_impact - 1
            residual_matrix[rl_idx][ri_idx] += 1

            lvl = get_risk_level(r.residual_score)
            if lvl == "CRITICAL":
                critical_count += 1
            elif lvl == "HIGH":
                high_count += 1
            elif lvl == "MEDIUM":
                medium_count += 1
            else:
                low_count += 1

        return {
            "total_risks": len(risks),
            "critical_risks": critical_count,
            "high_risks": high_count,
            "medium_risks": medium_count,
            "low_risks": low_count,
            "inherent_matrix": inherent_matrix,
            "residual_matrix": residual_matrix,
        }


risk_service = RiskManagementService()
