"""Phase 5 Notification Abstraction & Role-Based Alert Routing.
Dispatches operational notifications to InApp, Slack, Teams, Email, or PagerDuty.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class NotificationPayload(BaseModel):
    title: str
    message: str
    severity: str  # INFO, WARNING, CRITICAL
    category: str  # PRODUCTION_DEGRADED, ALERT, INCIDENT, BACKUP, SECURITY, COST, COMPLIANCE
    target_roles: List[str]  # OWNER, DEVOPS, SECURITY, COMPLIANCE, BILLING
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = datetime.utcnow()


class NotificationProvider(ABC):
    @abstractmethod
    async def send_notification(self, payload: NotificationPayload) -> bool:
        pass


class InAppNotificationProvider(NotificationProvider):
    """In-app persistent notification queue."""

    def __init__(self):
        self.dispatched_notifications: List[NotificationPayload] = []

    async def send_notification(self, payload: NotificationPayload) -> bool:
        self.dispatched_notifications.append(payload)
        return True


class NotificationRouter:
    """Routes events to the appropriate recipient roles based on operational category."""

    ROLE_ROUTING_MAP = {
        "PRODUCTION_DEGRADED": ["OWNER", "DEVOPS"],
        "CRITICAL_ALERT": ["DEVOPS", "OWNER"],
        "INCIDENT": ["OWNER", "DEVOPS", "SECURITY"],
        "BACKUP_FAILURE": ["DEVOPS", "COMPLIANCE"],
        "SECURITY_SIGNAL": ["SECURITY", "OWNER"],
        "DRIFT_DETECTED": ["DEVOPS"],
        "COST_ANOMALY": ["OWNER", "BILLING"],
        "COMPLIANCE_STALE": ["COMPLIANCE", "OWNER"],
    }

    def __init__(self, provider: Optional[NotificationProvider] = None):
        self.provider = provider or InAppNotificationProvider()

    async def notify(
        self,
        category: str,
        title: str,
        message: str,
        severity: str = "INFO",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        target_roles = self.ROLE_ROUTING_MAP.get(category, ["OWNER", "DEVOPS"])
        payload = NotificationPayload(
            title=title,
            message=message,
            severity=severity,
            category=category,
            target_roles=target_roles,
            metadata=metadata or {},
        )
        return await self.provider.send_notification(payload)
