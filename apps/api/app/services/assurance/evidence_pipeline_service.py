"""Phase 11 Evidence Pipeline, Authenticity, Integrity Hash Chaining & Freshness Engine."""
import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc

from app.models.assurance import (
    EvidenceObservation,
    EvidenceIntegrityChain,
    EvidenceFreshnessPolicy,
    EvidenceAuthenticityStatus,
    EvidenceFreshnessStatus,
)


DEFAULT_FRESHNESS_POLICIES = [
    {"evidence_class": "CLOUD_CONFIG", "max_age_hours": 24, "warning_threshold_hours": 12},
    {"evidence_class": "BACKUP_HEALTH", "max_age_hours": 24, "warning_threshold_hours": 12},
    {"evidence_class": "VAPT_REPORT", "max_age_hours": 2160, "warning_threshold_hours": 1440},  # 90 days
    {"evidence_class": "ACCESS_REVIEW", "max_age_hours": 2160, "warning_threshold_hours": 1440},  # 90 days
    {"evidence_class": "POLICY", "max_age_hours": 8760, "warning_threshold_hours": 7200},  # 365 days
]


class EvidencePipelineService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def initialize_default_policies(self, organization_id: str) -> List[EvidenceFreshnessPolicy]:
        """Ensure standard freshness policies are active for the tenant."""
        created = []
        for pol in DEFAULT_FRESHNESS_POLICIES:
            existing = await self.db.execute(
                select(EvidenceFreshnessPolicy).where(
                    and_(
                        EvidenceFreshnessPolicy.organization_id == organization_id,
                        EvidenceFreshnessPolicy.evidence_class == pol["evidence_class"],
                    )
                )
            )
            if not existing.scalar_one_or_none():
                policy = EvidenceFreshnessPolicy(
                    organization_id=organization_id,
                    evidence_class=pol["evidence_class"],
                    max_age_hours=pol["max_age_hours"],
                    warning_threshold_hours=pol["warning_threshold_hours"],
                )
                self.db.add(policy)
                created.append(policy)
        if created:
            await self.db.commit()
        return created

    async def verify_chain_integrity(self, organization_id: str) -> Tuple[bool, int, List[Dict[str, Any]]]:
        """Cryptographically verify the tamper-evident sequential hash chain for all stored evidence."""
        query = await self.db.execute(
            select(EvidenceIntegrityChain)
            .join(EvidenceObservation, EvidenceObservation.id == EvidenceIntegrityChain.evidence_observation_id)
            .where(EvidenceIntegrityChain.organization_id == organization_id)
            .order_by(EvidenceIntegrityChain.sequence_number.asc())
        )
        chain_entries = query.scalars().all()

        if not chain_entries:
            return True, 0, []

        expected_prev = "0" * 64
        verified_count = 0
        violations = []

        for entry in chain_entries:
            if entry.previous_hash != expected_prev:
                violations.append({
                    "sequence": entry.sequence_number,
                    "error": f"Previous hash mismatch. Expected {expected_prev}, found {entry.previous_hash}",
                })

            # Fetch the associated normalized hash from observation
            obs_res = await self.db.execute(
                select(EvidenceObservation).where(EvidenceObservation.id == entry.evidence_observation_id)
            )
            obs = obs_res.scalar_one_or_none()
            norm_hash = obs.normalized_payload_hash if obs else ""

            expected_current = hashlib.sha256(f"{entry.previous_hash}:{norm_hash}:{entry.sequence_number}".encode()).hexdigest()
            if entry.current_hash != expected_current:
                violations.append({
                    "sequence": entry.sequence_number,
                    "error": f"Current hash corrupted. Computed {expected_current}, found {entry.current_hash}",
                })

            expected_prev = entry.current_hash
            verified_count += 1

        is_valid = len(violations) == 0
        return is_valid, verified_count, violations

    async def evaluate_freshness(self, organization_id: str) -> Dict[str, Any]:
        """Inspect all evidence observations and flag expiring or stale records according to policies."""
        pol_res = await self.db.execute(
            select(EvidenceFreshnessPolicy).where(EvidenceFreshnessPolicy.organization_id == organization_id)
        )
        policies = {p.evidence_class: p for p in pol_res.scalars().all()}
        if not policies:
            await self.initialize_default_policies(organization_id)
            pol_res = await self.db.execute(
                select(EvidenceFreshnessPolicy).where(EvidenceFreshnessPolicy.organization_id == organization_id)
            )
            policies = {p.evidence_class: p for p in pol_res.scalars().all()}

        obs_res = await self.db.execute(
            select(EvidenceObservation).where(EvidenceObservation.organization_id == organization_id)
        )
        observations = obs_res.scalars().all()

        now = datetime.utcnow()
        current_count = 0
        expiring_count = 0
        stale_count = 0

        for obs in observations:
            pol = policies.get(obs.source_provider, policies.get("CLOUD_CONFIG"))
            max_age = timedelta(hours=pol.max_age_hours if pol else 24)
            warn_age = timedelta(hours=pol.warning_threshold_hours if pol else 12)

            age = now - obs.collected_at
            if age > max_age or now > obs.valid_until:
                obs.freshness_status = EvidenceFreshnessStatus.STALE
                stale_count += 1
            elif age > warn_age:
                obs.freshness_status = EvidenceFreshnessStatus.EXPIRING
                expiring_count += 1
            else:
                obs.freshness_status = EvidenceFreshnessStatus.CURRENT
                current_count += 1

        await self.db.commit()

        total = len(observations) or 1
        freshness_percentage = round((current_count / total) * 100, 1)

        return {
            "total_evidence_observations": len(observations),
            "current_count": current_count,
            "expiring_count": expiring_count,
            "stale_count": stale_count,
            "freshness_percentage": freshness_percentage,
        }

    async def search_evidence(
        self,
        organization_id: str,
        control_code: Optional[str] = None,
        source_provider: Optional[str] = None,
        authenticity_status: Optional[str] = None,
    ) -> List[EvidenceObservation]:
        """Search evidence vault across structured metadata."""
        query = select(EvidenceObservation).where(EvidenceObservation.organization_id == organization_id)
        if control_code:
            query = query.where(EvidenceObservation.control_code == control_code)
        if source_provider:
            query = query.where(EvidenceObservation.source_provider == source_provider)
        if authenticity_status:
            query = query.where(EvidenceObservation.authenticity_status == authenticity_status)

        query = query.order_by(desc(EvidenceObservation.collected_at))
        result = await self.db.execute(query)
        return result.scalars().all()
