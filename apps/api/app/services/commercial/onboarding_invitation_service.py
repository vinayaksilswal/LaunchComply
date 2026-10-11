"""Phase 8 Team Invitations, Email Verification, Password Reset, MFA, and Customer Onboarding Engine."""
import secrets
import hashlib
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.auth import User, Organization, OrganizationMembership, MembershipRole
from app.models.auth_commercial import (
    Invitation,
    InvitationStatus,
    EmailVerificationToken,
    PasswordResetToken,
    UserMFACredential,
    OnboardingState,
)
from app.core.security import get_password_hash


class OnboardingInvitationService:
    """Manages team invitations, user credentials security lifecycle, and customer onboarding milestones."""

    # ------------------------------------------------------------------------
    # 1. Team Invitations
    # ------------------------------------------------------------------------

    async def create_invitation(
        self,
        db: AsyncSession,
        organization_id: str,
        email: str,
        role: MembershipRole,
        invited_by_user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a cryptographically secure one-time team invitation."""
        # Serialize membership mutations for a business, including invitation acceptance.
        org = (await db.execute(select(Organization).where(Organization.id == organization_id).with_for_update())).scalar_one_or_none()
        actor = (await db.execute(select(OrganizationMembership).where(
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.user_id == invited_by_user_id,
            OrganizationMembership.is_active == True))).scalars().first()
        if not org or not org.is_active or not actor or actor.role not in {MembershipRole.OWNER, MembershipRole.ADMIN}:
            raise ValueError("Business owner or administrator access is required.")
        if role == MembershipRole.OWNER or (role == MembershipRole.ADMIN and actor.role != MembershipRole.OWNER):
            raise ValueError("Only the business owner can invite administrators. Ownership cannot be assigned by invitation.")
        email = email.strip().lower()
        existing = (await db.execute(select(OrganizationMembership).join(User, User.id == OrganizationMembership.user_id).where(
            OrganizationMembership.organization_id == organization_id, OrganizationMembership.is_active == True,
            func.lower(User.email) == email))).scalars().first()
        if existing:
            raise ValueError("This person is already an active team member.")
        pending = (await db.execute(select(Invitation).where(Invitation.organization_id == organization_id,
            func.lower(Invitation.email) == email, Invitation.status == InvitationStatus.PENDING))).scalars().all()
        if any(item.expires_at > datetime.utcnow() for item in pending):
            raise ValueError("A pending invitation already exists. Revoke it before issuing a replacement.")
        for item in pending:
            item.status = InvitationStatus.EXPIRED
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.utcnow() + timedelta(days=7)

        invite = Invitation(
            organization_id=organization_id,
            email=email.lower().strip(),
            role=role,
            token_hash=token_hash,
            invited_by_user_id=invited_by_user_id,
            status=InvitationStatus.PENDING,
            expires_at=expires_at
        )
        db.add(invite)
        await db.commit()

        return {
            "invitation_id": invite.id,
            "email": invite.email,
            "role": invite.role.value,
            "expires_at": invite.expires_at.isoformat(),
            "invite_token": raw_token,  # returned once to email/display
            "invite_link": f"/signup?invite_token={raw_token}"
        }

    async def accept_invitation(
        self,
        db: AsyncSession,
        raw_token: str,
        user: User
    ) -> Dict[str, Any]:
        """Validates invitation token and binds user to organization."""
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        res = await db.execute(
            select(Invitation).where(
                Invitation.token_hash == token_hash,
                Invitation.status == InvitationStatus.PENDING
            )
        )
        invite = res.scalars().first()
        if not invite:
            raise ValueError("Invitation not found or already used.")

        org = (await db.execute(select(Organization).where(Organization.id == invite.organization_id).with_for_update())).scalar_one_or_none()
        invite = (await db.execute(select(Invitation).where(Invitation.id == invite.id).with_for_update()
            .execution_options(populate_existing=True))).scalar_one()
        if not org or not org.is_active or invite.status != InvitationStatus.PENDING or invite.role == MembershipRole.OWNER:
            raise ValueError("Invitation is no longer available.")
        issuer = (await db.execute(select(OrganizationMembership).where(
            OrganizationMembership.organization_id == invite.organization_id,
            OrganizationMembership.user_id == invite.invited_by_user_id,
            OrganizationMembership.is_active == True))).scalars().first()
        if not issuer or issuer.role not in {MembershipRole.OWNER, MembershipRole.ADMIN} or (invite.role == MembershipRole.ADMIN and issuer.role != MembershipRole.OWNER):
            raise ValueError("The inviting administrator no longer has permission. Ask for a new invitation.")

        if invite.email.strip().casefold() != user.email.strip().casefold():
            raise ValueError("Sign in with the email address this invitation was sent to.")

        if invite.expires_at < datetime.utcnow():
            invite.status = InvitationStatus.EXPIRED
            await db.commit()
            raise ValueError("Invitation has expired.")

        # Create or update membership
        mem_res = await db.execute(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == invite.organization_id,
                OrganizationMembership.user_id == user.id
            )
        )
        membership = mem_res.scalars().first()
        if not membership:
            membership = OrganizationMembership(
                organization_id=invite.organization_id,
                user_id=user.id,
                role=invite.role,
                is_active=True
            )
            db.add(membership)
        elif not membership.is_active:
            membership.role = invite.role
            membership.is_active = True

        invite.status = InvitationStatus.ACCEPTED
        invite.accepted_at = datetime.utcnow()
        await db.commit()

        return {
            "organization_id": invite.organization_id,
            "role": membership.role.value,
            "status": "ACCEPTED"
        }

    # ------------------------------------------------------------------------
    # 2. Email Verification & Password Reset
    # ------------------------------------------------------------------------

    async def request_email_verification(self, db: AsyncSession, user: User) -> str:
        """Generates email verification token."""
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        evt = EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        db.add(evt)
        await db.commit()
        return raw_token

    async def verify_email_token(self, db: AsyncSession, raw_token: str) -> bool:
        """Confirms user email verification."""
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        res = await db.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token_hash == token_hash,
                EmailVerificationToken.used_at == None
            )
        )
        token_record = res.scalars().first()
        if not token_record or token_record.expires_at < datetime.utcnow():
            return False

        token_record.used_at = datetime.utcnow()
        user_res = await db.execute(select(User).where(User.id == token_record.user_id))
        user = user_res.scalars().first()
        if user:
            user.email_verified = True
        await db.commit()
        return True

    async def request_password_reset(self, db: AsyncSession, email: str) -> Optional[str]:
        """Generates password reset token if account exists."""
        res = await db.execute(select(User).where(User.email == email.lower().strip()))
        user = res.scalars().first()
        if not user:
            return None

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        prt = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(hours=2)
        )
        db.add(prt)
        await db.commit()
        return raw_token

    async def reset_password_with_token(self, db: AsyncSession, raw_token: str, new_password: str) -> bool:
        """Applies new password using valid reset token."""
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        res = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at == None
            )
        )
        token_record = res.scalars().first()
        if not token_record or token_record.expires_at < datetime.utcnow():
            return False

        user_res = await db.execute(select(User).where(User.id == token_record.user_id))
        user = user_res.scalars().first()
        if not user:
            return False

        user.hashed_password = get_password_hash(new_password)
        token_record.used_at = datetime.utcnow()
        await db.commit()
        return True

    # ------------------------------------------------------------------------
    # 3. Customer Onboarding & Activation Milestones
    # ------------------------------------------------------------------------

    async def get_or_create_onboarding_state(self, db: AsyncSession, organization_id: str) -> OnboardingState:
        """Retrieves or starts the customer onboarding state."""
        res = await db.execute(
            select(OnboardingState).where(OnboardingState.organization_id == organization_id)
        )
        state = res.scalars().first()
        if not state:
            state = OnboardingState(
                organization_id=organization_id,
                current_step=1,
                completed_steps_json=json.dumps([1]),
                milestones_json=json.dumps([]),
                is_completed=False
            )
            db.add(state)
            await db.commit()
            await db.refresh(state)
        return state

    async def record_milestone(
        self,
        db: AsyncSession,
        organization_id: str,
        milestone: str
    ) -> OnboardingState:
        """Records a value moment activation milestone."""
        state = await self.get_or_create_onboarding_state(db, organization_id)
        milestones = json.loads(state.milestones_json or "[]")
        if milestone not in milestones:
            milestones.append(milestone)
            state.milestones_json = json.dumps(milestones)

            # Auto-advance step if applicable
            step_order = [
                "FIRST_APP_CREATED",
                "FIRST_ARCHITECTURE_GENERATED",
                "FIRST_AWS_CONNECTED",
                "FIRST_DEPLOYMENT",
                "FIRST_SECURITY_SCAN",
                "FIRST_COMPLIANCE_FRAMEWORK"
            ]
            if milestone in step_order:
                idx = step_order.index(milestone) + 2
                if idx > state.current_step:
                    state.current_step = idx

            if len(milestones) >= 4 and not state.is_completed:
                state.is_completed = True
                state.completed_at = datetime.utcnow()

            await db.commit()
            await db.refresh(state)
        return state


onboarding_invitation_service = OnboardingInvitationService()
