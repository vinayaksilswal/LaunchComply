"""Phase 8 Support Ticketing and SLA Operations Service."""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.support import (
    SupportTicket,
    SupportMessage,
    SupportAttachment,
    TicketPriority,
    TicketStatus,
    TicketCategory,
)
from app.models.billing import Subscription


SLA_HOURS_MATRIX = {
    "STARTER": {"LOW": 48.0, "NORMAL": 24.0, "HIGH": 12.0, "URGENT": 4.0},
    "GROWTH": {"LOW": 24.0, "NORMAL": 8.0, "HIGH": 4.0, "URGENT": 2.0},
    "BUSINESS": {"LOW": 12.0, "NORMAL": 4.0, "HIGH": 2.0, "URGENT": 1.0},
    "ENTERPRISE": {"LOW": 4.0, "NORMAL": 2.0, "HIGH": 1.0, "URGENT": 0.5},
}


class SupportService:
    """Manages customer support cases and SLA response tracking."""

    async def create_ticket(
        self,
        db: AsyncSession,
        organization_id: str,
        user_id: Optional[str],
        user_email: str,
        user_name: str,
        title: str,
        category: TicketCategory,
        priority: TicketPriority,
        initial_message: str
    ) -> SupportTicket:
        """Creates a new support ticket with calculated SLA due date."""
        now = datetime.utcnow()
        year = now.year

        count_res = await db.execute(
            select(SupportTicket).where(SupportTicket.ticket_number.like(f"LC-TCK-{year}-%"))
        )
        total_year = len(count_res.scalars().all())
        seq = total_year + 1
        ticket_number = f"LC-TCK-{year}-{seq:04d}"

        # Determine SLA target from organization plan
        sub_res = await db.execute(select(Subscription).where(Subscription.organization_id == organization_id))
        sub = sub_res.scalars().first()
        plan_tier = sub.plan_tier if sub else "GROWTH"

        priority_val = priority.value if hasattr(priority, "value") else str(priority)
        category_enum = category if isinstance(category, TicketCategory) else TicketCategory(str(category))
        priority_enum = priority if isinstance(priority, TicketPriority) else TicketPriority(str(priority))

        plan_matrix = SLA_HOURS_MATRIX.get(plan_tier, SLA_HOURS_MATRIX["GROWTH"])
        response_hours = plan_matrix.get(priority_val, 8.0)
        sla_due_at = now + timedelta(hours=response_hours)

        ticket = SupportTicket(
            ticket_number=ticket_number,
            organization_id=organization_id,
            user_id=user_id,
            title=title,
            category=category_enum,
            priority=priority_enum,
            status=TicketStatus.OPEN,
            sla_response_due_at=sla_due_at,
        )
        db.add(ticket)
        await db.flush()

        msg = SupportMessage(
            ticket_id=ticket.id,
            sender_id=user_id,
            sender_email=user_email,
            sender_name=user_name,
            is_internal=False,
            content=initial_message
        )
        db.add(msg)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    async def add_message(
        self,
        db: AsyncSession,
        ticket_id: str,
        sender_id: Optional[str],
        sender_email: str,
        sender_name: str,
        content: str,
        is_internal: bool = False
    ) -> SupportMessage:
        """Adds a reply message to the ticket and updates SLA timestamps."""
        res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
        ticket = res.scalars().first()
        if not ticket:
            raise ValueError("Support ticket not found.")

        now = datetime.utcnow()
        # If platform response and first time, log first_responded_at
        if is_internal and not ticket.first_responded_at:
            ticket.first_responded_at = now
            ticket.status = TicketStatus.WAITING_CUSTOMER
        elif not is_internal:
            ticket.status = TicketStatus.IN_PROGRESS

        msg = SupportMessage(
            ticket_id=ticket.id,
            sender_id=sender_id,
            sender_email=sender_email,
            sender_name=sender_name,
            is_internal=is_internal,
            content=content
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg

    async def list_tickets(
        self,
        db: AsyncSession,
        organization_id: Optional[str] = None
    ) -> List[SupportTicket]:
        """Lists support tickets. If organization_id is provided, scopes to tenant."""
        stmt = (
            select(SupportTicket)
            .options(selectinload(SupportTicket.messages))
            .order_by(SupportTicket.created_at.desc())
        )
        if organization_id:
            stmt = stmt.where(SupportTicket.organization_id == organization_id)
        res = await db.execute(stmt)
        return res.scalars().all()


support_service = SupportService()
