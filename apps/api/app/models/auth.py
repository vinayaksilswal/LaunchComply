import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, Enum, DateTime, Text, Float
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class MembershipRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    DEVELOPER = "DEVELOPER"
    DEVOPS = "DEVOPS"
    SECURITY = "SECURITY"
    COMPLIANCE = "COMPLIANCE"
    AUDITOR = "AUDITOR"
    BILLING = "BILLING"
    CONSULTANT = "CONSULTANT"
    VIEWER = "VIEWER"

class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_platform_admin = Column(Boolean, default=False, nullable=False)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=True, nullable=False)
    avatar_url = Column(String(500), nullable=True)

    memberships = relationship("OrganizationMembership", back_populates="user", cascade="all, delete-orphan")

class Organization(BaseModel):
    __tablename__ = "organizations"
    
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    tier = Column(String(50), default="growth", nullable=False)  # starter, growth, enterprise
    is_active = Column(Boolean, default=True, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)
    is_test = Column(Boolean, default=False, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)
    customer_classification = Column(String(50), default="REAL_CUSTOMER", nullable=False, index=True)  # REAL_CUSTOMER, TEST_CUSTOMER, DEMO_CUSTOMER, INTERNAL_CUSTOMER, PILOT_CUSTOMER, PAID_CUSTOMER, CHURNED_CUSTOMER
    commercial_state = Column(String(50), default="TRIAL", nullable=False, index=True)  # PROSPECT, TRIAL, ACTIVE_PILOT, PAID, CHURNED, TEST_SANDBOX, DEMO
    stage_entered_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    onboarding_blocker = Column(String(255), nullable=True)
    desired_outcome = Column(Text, nullable=True)
    success_definition = Column(Text, nullable=True)
    aws_monthly_budget = Column(String(50), default="₹45,000", nullable=False)
    target_date = Column(DateTime, nullable=True)
    current_outcome_status = Column(String(50), default="IN_PROGRESS", nullable=False)
    paid_customer_gate_passed = Column(Boolean, default=False, nullable=False)
    first_real_payment_at = Column(DateTime, nullable=True)
    first_real_mrr = Column(Float, default=0.0, nullable=False)
    retention_status = Column(String(50), default="PENDING", nullable=False)
    primary_product_interest = Column(String(100), nullable=True)
    purchase_reason = Column(String(255), nullable=True)
    last_customer_contact = Column(DateTime, nullable=True)
    next_action = Column(String(255), nullable=True)
    next_action_due = Column(DateTime, nullable=True)
    technical_owner = Column(String(255), default="DevOps Architect", nullable=False)
    commercial_owner = Column(String(255), default="Commercial Lead", nullable=False)

    memberships = relationship("OrganizationMembership", back_populates="organization", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="organization", cascade="all, delete-orphan")

class OrganizationMembership(BaseModel):
    __tablename__ = "organization_memberships"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(MembershipRole), default=MembershipRole.OWNER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="memberships")
