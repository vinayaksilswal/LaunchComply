from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON, Boolean
from app.models.base import BaseModel

class Architecture(BaseModel):
    __tablename__ = "architectures"
    
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), default="Production High-Availability Topology", nullable=False)
    version = Column(String(20), default="v1.0.0", nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    spec_json = Column(JSON, nullable=True)  # Full visual graph with nodes, edges, subnets

class CloudAccount(BaseModel):
    __tablename__ = "cloud_accounts"
    
    organization_id = Column(String(36), nullable=False, index=True)
    provider = Column(String(50), default="AWS", nullable=False)
    account_id = Column(String(50), nullable=False)
    role_arn = Column(String(500), nullable=False)
    external_id = Column(String(100), nullable=False)
    region = Column(String(50), default="ap-south-1", nullable=False)
    status = Column(String(50), default="CONNECTED", nullable=False)

    # Phase 16 Connection State Machine & Automation Fields (§51, §53, §54, §56, §58)
    connection_state = Column(String(50), default="NOT_STARTED", nullable=False)
    setup_method = Column(String(50), default="CLOUDFORMATION", nullable=False)
    stack_name = Column(String(255), nullable=True)
    stack_status = Column(String(50), default="UNKNOWN", nullable=True)
    template_version = Column(String(50), default="v1.0.0", nullable=True)
    template_checksum = Column(String(64), nullable=True)
    permission_profiles_json = Column(JSON, nullable=True)
    sts_result_hash = Column(String(64), nullable=True)
    assumed_role_arn = Column(String(500), nullable=True)
    session_expiry = Column(DateTime, nullable=True)
    health_status = Column(String(50), default="HEALTHY", nullable=False)
    last_verified_at = Column(DateTime, nullable=True)
    drift_detected = Column(Boolean, default=False, nullable=False)
    drift_details_json = Column(JSON, nullable=True)
    discovered_resources_json = Column(JSON, nullable=True)
    setup_started_at = Column(DateTime, nullable=True)
    connected_at = Column(DateTime, nullable=True)
    operator_minutes_spent = Column(Integer, default=0, nullable=False)
    help_requested = Column(Boolean, default=False, nullable=False)

class Deployment(BaseModel):
    __tablename__ = "deployments"
    
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), nullable=False, index=True)
    version = Column(String(50), default="v1.4.2", nullable=False)
    status = Column(String(50), default="LIVE", nullable=False) # DRAFT, PLANNING, PROVISIONING, BUILDING, DEPLOYING, VERIFYING, LIVE, FAILED, ROLLING_BACK
    commit_sha = Column(String(50), default="a7b3e9f", nullable=False)
    initiated_by = Column(String(255), default="System Onboarding", nullable=False)
    deployment_mode = Column(String(50), default="SIMULATED", nullable=False)  # SIMULATED, TEST_AWS, STAGING, CUSTOMER_PRODUCTION
    evidence_level = Column(String(50), default="SIMULATED", nullable=False)  # NOT_STARTED, CONFIGURED, SIMULATED, TEST_VERIFIED, CUSTOMER_VERIFIED, PRODUCTION_VERIFIED
    is_customer_approved = Column(Boolean, default=False, nullable=False)
    approval_id = Column(String(36), nullable=True)
    logs_json = Column(JSON, nullable=True)

class SecurityFinding(BaseModel):
    __tablename__ = "security_findings"
    
    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=True, index=True)
    assessment_id = Column(String(36), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False) # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    status = Column(String(50), default="OPEN", nullable=False, index=True) # OPEN, CONFIRMED, IN_PROGRESS, READY_FOR_RETEST, RESOLVED, ACCEPTED_RISK, FALSE_POSITIVE, REOPENED
    cvss_score = Column(String(10), default="7.5", nullable=False)
    cvss_vector = Column(String(100), nullable=True)
    category = Column(String(100), default="Application Security", nullable=False)
    owasp_mapping = Column(String(100), default="A01:2021-Broken Access Control", nullable=False)
    cwe = Column(String(50), nullable=True)
    description = Column(String(2000), nullable=False)
    suggested_fix = Column(String(4000), nullable=True)
    affected_asset = Column(String(255), default="Production Application", nullable=False)
    
    scanner = Column(String(50), default="LAUNCHCOMPLY_SECURITY_ENGINE", nullable=False)
    finding_type = Column(String(100), default="VULNERABILITY", nullable=False)
    endpoint = Column(String(500), nullable=True)
    file = Column(String(500), nullable=True)
    line = Column(Integer, nullable=True)
    evidence = Column(Text, nullable=True)
    confidence = Column(String(20), default="HIGH", nullable=False)
    business_impact = Column(String(1000), nullable=True)
    technical_impact = Column(String(1000), nullable=True)
    remediation = Column(Text, nullable=True)
    
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    retest_status = Column(String(50), default="NONE", nullable=False) # NONE, QUEUED, FIXED, STILL_PRESENT, REOPENED
    sla_due_date = Column(DateTime, nullable=True)
    fingerprint = Column(String(64), nullable=True, index=True)

class VAPTProject(BaseModel):
    __tablename__ = "vapt_projects"
    
    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), default="Annual Enterprise External & Web API VAPT", nullable=False)
    status = Column(String(50), default="TESTING", nullable=False) # REQUESTED, SCOPING, AUTHORIZED, TESTING, FINDINGS, REMEDIATION, RETEST, FINAL_REPORT, CLOSED
    scope = Column(String(500), default="app.acmecloud.io, api.acmecloud.io, AWS VPC public endpoints", nullable=False)
    methodology = Column(String(255), default="OWASP Web Security Testing Guide (WSTG) v4.2 + PTES", nullable=False)
    lead_tester = Column(String(255), default="Siddharth Rao (Offensive Security Certified)", nullable=False)
    critical_count = Column(String(10), default="1", nullable=False)
    high_count = Column(String(10), default="3", nullable=False)
    medium_count = Column(String(10), default="8", nullable=False)

class ComplianceAssessment(BaseModel):
    __tablename__ = "compliance_assessments"
    
    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    framework_code = Column(String(50), nullable=False) # DPDP, ISO27001, SOC2, LAUNCHCOMPLY_BASELINE
    framework_name = Column(String(255), nullable=False)
    readiness_percentage = Column(String(10), nullable=False)
    passing_controls = Column(String(10), default="38", nullable=False)
    total_controls = Column(String(10), default="50", nullable=False)
    status = Column(String(50), default="IN_PROGRESS", nullable=False)

class BackupPolicy(BaseModel):
    __tablename__ = "backup_policies"
    
    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    resource_name = Column(String(255), default="RDS PostgreSQL Production Cluster", nullable=False)
    frequency = Column(String(50), default="Daily at 02:00 UTC (Continuous WAL 5min)", nullable=False)
    retention_days = Column(String(20), default="35 days", nullable=False)
    encryption_status = Column(String(50), default="AWS KMS AES-256", nullable=False)
    rpo_minutes = Column(String(20), default="5 minutes", nullable=False)
    rto_minutes = Column(String(20), default="30 minutes", nullable=False)
    last_backup_time = Column(String(100), default="Today at 02:00 UTC", nullable=False)
    last_restore_test_date = Column(String(100), default="2026-09-15", nullable=False)
    last_restore_status = Column(String(50), default="PASS", nullable=False)

class Subprocessor(BaseModel):
    __tablename__ = "subprocessors"
    
    organization_id = Column(String(36), nullable=False, index=True)
    provider_name = Column(String(255), nullable=False)
    purpose = Column(String(255), nullable=False)
    data_processed = Column(String(255), nullable=False)
    country = Column(String(100), default="India / USA", nullable=False)
    dpa_status = Column(String(50), default="EXECUTED", nullable=False)
    risk_level = Column(String(20), default="LOW", nullable=False)

class ServiceRequest(BaseModel):
    __tablename__ = "service_requests"
    
    organization_id = Column(String(36), nullable=False, index=True)
    service_code = Column(String(100), nullable=False) # VAPT_ENGAGEMENT, CLOUD_MIGRATION, ISO27001_ACCELERATOR, AWS_HARDENING
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="IN_PROGRESS", nullable=False) # REQUESTED, QUALIFICATION, PROPOSAL, APPROVED, IN_PROGRESS, DELIVERED
    customer_notes = Column(String(1000), nullable=True)
    estimated_delivery = Column(String(100), default="2 weeks", nullable=False)
