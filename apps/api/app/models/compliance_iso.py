"""Phase 7 ISO/IEC 27001 ISMS and Statement of Applicability Models."""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text
from app.models.base import BaseModel


class ISMSScope(BaseModel):
    __tablename__ = "isms_scopes"

    organization_id = Column(String(36), nullable=False, index=True)
    version = Column(String(20), default="v1.0", nullable=False)
    business_units = Column(Text, nullable=False)
    products = Column(Text, nullable=False)
    applications = Column(Text, nullable=False)
    aws_accounts = Column(Text, nullable=False)
    locations = Column(Text, nullable=False)
    people_groups = Column(Text, nullable=False)
    systems = Column(Text, nullable=False)
    data_categories = Column(Text, nullable=False)
    excluded_areas = Column(Text, nullable=True)
    scope_statement = Column(Text, nullable=False)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="DRAFT", nullable=False, index=True)  # DRAFT, APPROVED, ARCHIVED


class OrganizationContext(BaseModel):
    __tablename__ = "organization_contexts"

    organization_id = Column(String(36), nullable=False, index=True)
    internal_issues = Column(Text, nullable=False)
    external_issues = Column(Text, nullable=False)
    regulatory_landscape = Column(Text, nullable=False)
    market_context = Column(Text, nullable=False)
    last_reviewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(String(255), nullable=False)


class InterestedParty(BaseModel):
    __tablename__ = "interested_parties"

    organization_id = Column(String(36), nullable=False, index=True)
    party_name = Column(String(255), nullable=False)
    requirements = Column(Text, nullable=False)
    expectations = Column(Text, nullable=False)
    relevance = Column(String(50), default="HIGH", nullable=False)  # HIGH, MEDIUM, LOW
    owner = Column(String(255), nullable=False)
    last_reviewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SecurityObjective(BaseModel):
    __tablename__ = "security_objectives"

    organization_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    metric = Column(String(255), nullable=False)
    target_value = Column(String(100), nullable=False)
    current_value = Column(String(100), nullable=False)
    period = Column(String(100), default="Quarterly", nullable=False)
    owner = Column(String(255), nullable=False)
    status = Column(String(50), default="ON_TRACK", nullable=False, index=True)  # ON_TRACK, AT_RISK, BEHIND, ACHIEVED


class StatementOfApplicabilityEntry(BaseModel):
    __tablename__ = "soa_entries"

    organization_id = Column(String(36), nullable=False, index=True)
    control_code = Column(String(100), nullable=False, index=True)  # e.g., A.5.1, A.8.24
    control_title = Column(String(255), nullable=False)
    applicable = Column(Boolean, default=True, nullable=False)
    justification = Column(Text, nullable=False)
    implementation_status = Column(String(50), default="IMPLEMENTED", nullable=False)  # IMPLEMENTED, IN_PROGRESS, NOT_STARTED, NOT_APPLICABLE
    control_owner = Column(String(255), nullable=False)
    evidence_summary = Column(Text, nullable=True)
    exclusion_reason = Column(Text, nullable=True)
    version = Column(String(20), default="v1.0", nullable=False)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime, nullable=True)
