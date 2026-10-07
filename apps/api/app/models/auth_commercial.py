"""Phase 8 Commercial Authentication, Security Tokens, Team Invitations, and Onboarding."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum

from app.models.base import BaseModel
from app.models.auth import MembershipRole


class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class EmailVerificationToken(BaseModel):
    """Cryptographic one-time token for account email verification."""
    __tablename__ = "commercial_email_verification_tokens"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(128), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)


class PasswordResetToken(BaseModel):
    """Cryptographic one-time token for account password reset."""
    __tablename__ = "commercial_password_reset_tokens"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(128), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)


class UserMFACredential(BaseModel):
    """TOTP MFA secret and backup codes for a user."""
    __tablename__ = "commercial_user_mfa_credentials"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    totp_secret_encrypted = Column(String(255), nullable=False)
    backup_codes_hash = Column(Text, nullable=True)  # JSON or comma-separated hashes
    is_confirmed = Column(Boolean, default=False, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)


class Invitation(BaseModel):
    """Team member invitation to join an organization."""
    __tablename__ = "commercial_invitations"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    role = Column(Enum(MembershipRole), default=MembershipRole.DEVELOPER, nullable=False)
    token_hash = Column(String(128), unique=True, nullable=False, index=True)
    invited_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)


class OnboardingState(BaseModel):
    """Customer guided onboarding and first-value activation state."""
    __tablename__ = "commercial_onboarding_states"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    current_step = Column(Integer, default=1, nullable=False)
    completed_steps_json = Column(Text, default="[]", nullable=False)
    milestones_json = Column(Text, default="[]", nullable=False)  # e.g. FIRST_ARCHITECTURE_GENERATED, FIRST_DEPLOYMENT
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
