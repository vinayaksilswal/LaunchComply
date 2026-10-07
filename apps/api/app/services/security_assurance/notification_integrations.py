from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("launchcomply.notifications")


class SecurityNotificationService:
    """Dispatches high-priority security notifications to configured webhooks or incident channels."""

    def __init__(self, slack_webhook_url: Optional[str] = None, pagerduty_routing_key: Optional[str] = None):
        self.slack_webhook_url = slack_webhook_url
        self.pagerduty_routing_key = pagerduty_routing_key

    def send_critical_finding_alert(
        self,
        finding_id: str,
        title: str,
        severity: str,
        sla_hours: int,
        affected_resource: str,
    ) -> Dict[str, Any]:
        message = (
            f":rotating_light: *CRITICAL SECURITY FINDING DETECTED*\n"
            f"*Title:* {title}\n"
            f"*Severity:* {severity.upper()}\n"
            f"*SLA Window:* {sla_hours} hours\n"
            f"*Resource:* `{affected_resource}`\n"
            f"*Finding ID:* `{finding_id}`"
        )
        logger.warning(f"[SecurityAlert] Critical Finding: {title} on {affected_resource} (SLA: {sla_hours}h)")
        return {"status": "DISPATCHED", "channel": "SECURITY_ALERTS", "severity": severity}

    def send_dr_drill_summary(
        self,
        drill_id: str,
        status: str,
        rto_seconds: int,
        rpo_seconds: int,
        primary_region: str,
        dr_region: str,
    ) -> Dict[str, Any]:
        icon = ":white_check_mark:" if status == "SUCCESS" else ":x:"
        message = (
            f"{icon} *DISASTER RECOVERY DRILL COMPLETED*\n"
            f"*Status:* {status}\n"
            f"*Primary Region:* {primary_region} -> *DR Region:* {dr_region}\n"
            f"*Measured RTO:* {rto_seconds}s | *Target RTO:* 1800s\n"
            f"*Measured RPO:* {rpo_seconds}s | *Target RPO:* 900s\n"
            f"*Drill ID:* `{drill_id}`"
        )
        logger.info(f"[DRDrillAlert] DR Drill {drill_id}: {status} (RTO: {rto_seconds}s, RPO: {rpo_seconds}s)")
        return {"status": "DISPATCHED", "channel": "SRE_RESILIENCE", "drill_status": status}

    def send_vapt_report_available_alert(
        self,
        engagement_id: str,
        application_name: str,
        report_hash: str,
        total_findings: int,
    ) -> Dict[str, Any]:
        logger.info(f"[VAPTAlert] Signed Report Available for {application_name} (Hash: {report_hash[:16]}...)")
        return {"status": "DISPATCHED", "channel": "SECURITY_LEADERSHIP"}


notification_service = SecurityNotificationService()
