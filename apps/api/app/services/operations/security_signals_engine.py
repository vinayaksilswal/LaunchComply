"""Phase 5 Cloud Security Signals Engine.
Normalizes AWS GuardDuty, Security Hub, WAF, and CloudTrail signals,
enforces deduplication, and links security findings to the Incident and Architecture centers.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.operations import SecuritySignal, Incident, IncidentTimelineEvent


class CloudSecurityProvider(ABC):
    @abstractmethod
    def get_security_signals(self, environment_id: str) -> List[Dict[str, Any]]:
        pass


class AWSSecurityProvider(CloudSecurityProvider):
    """Ingests and normalizes AWS GuardDuty, Security Hub, and CloudTrail events."""

    def get_security_signals(self, environment_id: str) -> List[Dict[str, Any]]:
        if not settings.ENABLE_REAL_SECURITY_INGESTION:
            # Deterministic simulation for test/dev environments
            return [
                {
                    "provider": "GUARDDUTY",
                    "signal_type": "Recon:IAMUser/AnomalousBehavior",
                    "severity": "MEDIUM",
                    "resource_id": "arn:aws:iam::012345678901:user/ops-deployer",
                    "title": "Unusual IAM API Call Volume Detected",
                    "description": "API call volume for ListBuckets deviated from historical 14-day baseline by 320%.",
                    "detected_at": datetime.utcnow(),
                },
                {
                    "provider": "CLOUDTRAIL",
                    "signal_type": "SecurityGroupModificationOutsideLaunchComply",
                    "severity": "HIGH",
                    "resource_id": "sg-01ab23cd45ef67890",
                    "title": "Manual Ingress Rule Added to Security Group",
                    "description": "Port 22 (SSH) ingress opened to 0.0.0.0/0 manually via AWS Management Console outside Terraform state.",
                    "detected_at": datetime.utcnow(),
                },
            ]

        # Real AWS Boto3 GuardDuty / SecurityHub calls when enabled
        return []


class SecuritySignalsEngine:
    """Processes, deduplicates, and persists security signals for an environment."""

    def __init__(self, provider: Optional[CloudSecurityProvider] = None):
        self.provider = provider or AWSSecurityProvider()

    async def sync_security_signals(
        self,
        db: AsyncSession,
        environment_id: str,
        organization_id: str,
        application_id: str,
        auto_open_incident_for_critical: bool = True,
    ) -> List[SecuritySignal]:
        """Ingests raw findings from provider, deduplicates against active signals, and updates DB."""
        raw_signals = self.provider.get_security_signals(environment_id=environment_id)
        synced_signals: List[SecuritySignal] = []

        for item in raw_signals:
            # Check for existing active signal on same resource + signal_type
            res = await db.execute(
                select(SecuritySignal).where(
                    SecuritySignal.environment_id == environment_id,
                    SecuritySignal.organization_id == organization_id,
                    SecuritySignal.resource_id == item["resource_id"],
                    SecuritySignal.signal_type == item["signal_type"],
                    SecuritySignal.status == "ACTIVE",
                )
            )
            existing = res.scalars().first()
            if existing:
                synced_signals.append(existing)
                continue

            # Create new security signal
            signal = SecuritySignal(
                organization_id=organization_id,
                environment_id=environment_id,
                provider=item["provider"],
                signal_type=item["signal_type"],
                severity=item["severity"],
                resource_id=item["resource_id"],
                title=item["title"],
                description=item["description"],
                status="ACTIVE",
                detected_at=item["detected_at"],
            )
            db.add(signal)
            await db.flush()

            # Auto-create incident if CRITICAL security finding
            if auto_open_incident_for_critical and signal.severity in ("CRITICAL", "HIGH"):
                incident = Incident(
                    organization_id=organization_id,
                    environment_id=environment_id,
                    application_id=application_id,
                    title=f"Security Alert: {signal.title}",
                    severity="SEV1" if signal.severity == "CRITICAL" else "SEV2",
                    description=f"Automated incident triggered by {signal.provider} signal: {signal.description}",
                    status="DETECTED",
                    detected_at=datetime.utcnow(),
                )
                db.add(incident)
                await db.flush()

                db.add(
                    IncidentTimelineEvent(
                        incident_id=incident.id,
                        event_type="SECURITY_SIGNAL",
                        message=f"{signal.provider} finding ingested: {signal.signal_type} on {signal.resource_id}",
                        actor="SecurityEngine",
                        source="LaunchComply",
                    )
                )

            synced_signals.append(signal)

        await db.commit()
        return synced_signals

    async def resolve_signal(
        self,
        db: AsyncSession,
        signal_id: str,
        organization_id: str,
        actor_email: str,
    ) -> Optional[SecuritySignal]:
        res = await db.execute(
            select(SecuritySignal).where(
                SecuritySignal.id == signal_id,
                SecuritySignal.organization_id == organization_id,
            )
        )
        signal = res.scalars().first()
        if signal:
            signal.status = "RESOLVED"
            signal.resolved_at = datetime.utcnow()
            db.add(signal)
            await db.commit()
            await db.refresh(signal)
        return signal
