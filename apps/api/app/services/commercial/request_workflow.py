"""Customer-visible delivery progress; internal operator notes stay private."""
from fastapi import HTTPException
from sqlalchemy import select
from app.models.audit import AuditEvent
from app.models.service_payments import ServicePaymentQuote, ServiceCheckout

TRANSITIONS = {
    "REQUESTED": {"REVIEWING", "WAITING_CUSTOMER"},
    "REVIEWING": {"IN_PROGRESS", "WAITING_CUSTOMER"},
    "IN_PROGRESS": {"WAITING_CUSTOMER", "DELIVERED"},
    "WAITING_CUSTOMER": {"REVIEWING", "IN_PROGRESS"},
    "DELIVERED": {"CLOSED", "REVIEWING"},
    "CLOSED": set(),
}
PUBLIC_ACTIONS = {
    "BUSINESS_REQUEST_SUBMITTED", "BUSINESS_REQUEST_STATUS_UPDATED",
    "BUSINESS_REQUEST_CUSTOMER_REPLIED", "SERVICE_REPORT_PUBLISHED",
}


async def require_real_service_payment(db, request):
    quote = (await db.execute(select(ServicePaymentQuote).where(
        ServicePaymentQuote.request_id == request.id,
        ServicePaymentQuote.organization_id == request.organization_id))).scalar_one_or_none()
    if quote:
        checkout = (await db.execute(select(ServiceCheckout).where(
            ServiceCheckout.quote_id == quote.id,
            ServiceCheckout.organization_id == request.organization_id))).scalar_one_or_none()
        if not checkout or not checkout.is_real_payment_verified:
            raise HTTPException(409, "This quoted service requires a verified real payment before work or delivery can begin.")


async def activity(db, request):
    events = (await db.execute(select(AuditEvent).where(
        AuditEvent.organization_id == request.organization_id,
        AuditEvent.entity_type == "service_request", AuditEvent.entity_id == request.id,
        AuditEvent.action.in_(PUBLIC_ACTIONS)).order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).limit(100))).scalars().all()
    # No email, actor ID, internal note, arbitrary audit fields or cross-tenant data.
    return {"request": {"id": request.id, "title": request.title, "status": request.status,
        "service_code": request.service_code, "notes": request.customer_notes,
        "created_at": request.created_at, "estimated_delivery": request.estimated_delivery},
        "events": [{"id": event.id, "action": event.action, "created_at": event.created_at,
            "status": (event.details or {}).get("status"),
            "message": (event.details or {}).get("customer_update", "") if event.action == "BUSINESS_REQUEST_STATUS_UPDATED"
                else (event.details or {}).get("message", "") if event.action == "BUSINESS_REQUEST_CUSTOMER_REPLIED" else "",
            "report_id": (event.details or {}).get("report_id") if event.action == "SERVICE_REPORT_PUBLISHED" else None}
            for event in events], "truncated": len(events) == 100}
