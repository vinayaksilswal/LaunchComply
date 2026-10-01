from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class DashboardFinding(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    cvss_score: str
    category: str
    affected_asset: str

class ComplianceScore(BaseModel):
    framework_code: str
    framework_name: str
    readiness_percentage: str
    passing_controls: str
    total_controls: str

class DashboardOverviewResponse(BaseModel):
    organization_id: str
    organization_name: str
    application_name: str
    environment: str
    application_status: str
    production_readiness: str
    security_posture: str
    compliance_readiness: str
    backup_status: str
    domain: str
    domain_verified: bool
    https_active: bool
    critical_findings: int
    high_findings: int
    medium_findings: int
    aws_monthly_estimate: str
    frameworks: List[str]
    infrastructure: List[str]
    compliance_scores: List[ComplianceScore]
    recent_findings: List[DashboardFinding]

class AuditEventResponse(BaseModel):
    id: str
    action: str
    actor_email: str
    entity_type: str
    entity_id: Optional[str]
    ip_address: Optional[str]
    created_at: str
    details: Optional[Dict[str, Any]]
