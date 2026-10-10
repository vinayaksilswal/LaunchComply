"""Customer-visible delivery progress; internal operator notes stay private."""
from fastapi import HTTPException
from sqlalchemy import select
from app.models.audit import AuditEvent
from app.models.service_payments import ServicePaymentQuote, ServiceCheckout
from app.models.service_delivery import ServiceDeliveryReport

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
    "BUSINESS_REQUEST_DELIVERY_ACCEPTED",
}


async def latest_report(db, request):
    return (await db.execute(select(ServiceDeliveryReport).where(
        ServiceDeliveryReport.request_id == request.id,
        ServiceDeliveryReport.organization_id == request.organization_id
    ).order_by(ServiceDeliveryReport.created_at.desc(), ServiceDeliveryReport.id.desc()).limit(1))).scalar_one_or_none()


async def delivery_acceptance(db, request, report):
    if not report:
        return None
    return (await db.execute(select(AuditEvent).where(
        AuditEvent.organization_id == request.organization_id,
        AuditEvent.entity_type == "service_request", AuditEvent.entity_id == request.id,
        AuditEvent.action == "BUSINESS_REQUEST_DELIVERY_ACCEPTED",
        AuditEvent.details["report_id"].as_string() == report.id,
        AuditEvent.details["content_sha256"].as_string() == report.content_sha256
    ).order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).limit(1))).scalar_one_or_none()


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
    reports = (await db.execute(select(ServiceDeliveryReport).where(
        ServiceDeliveryReport.organization_id == request.organization_id,
        ServiceDeliveryReport.request_id == request.id
    ).order_by(ServiceDeliveryReport.created_at.desc(), ServiceDeliveryReport.id.desc()).limit(100))).scalars().all()
    accepted = await delivery_acceptance(db, request, reports[0] if reports else None)
    quote = (await db.execute(select(ServicePaymentQuote).where(
        ServicePaymentQuote.organization_id == request.organization_id,
        ServicePaymentQuote.request_id == request.id))).scalar_one_or_none()
    events = (await db.execute(select(AuditEvent).where(
        AuditEvent.organization_id == request.organization_id,
        AuditEvent.entity_type == "service_request", AuditEvent.entity_id == request.id,
        AuditEvent.action.in_(PUBLIC_ACTIONS)).order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).limit(100))).scalars().all()
    submission = (await db.execute(select(AuditEvent).where(
        AuditEvent.organization_id == request.organization_id,
        AuditEvent.entity_type == "service_request", AuditEvent.entity_id == request.id,
        AuditEvent.action == "BUSINESS_REQUEST_SUBMITTED").order_by(AuditEvent.created_at.asc(), AuditEvent.id.asc()).limit(1))).scalar_one_or_none()
    # Only the server-generated submission snapshot is shared, never arbitrary audit fields.
    submitted_design = (submission.details or {}).get("submitted_design") if submission else None
    # No email, actor ID, internal note, arbitrary audit fields or cross-tenant data.
    return {"request": {"id": request.id, "title": request.title, "status": request.status,
        "service_code": request.service_code, "notes": request.customer_notes,
        "created_at": request.created_at, "estimated_delivery": request.estimated_delivery},
        "submitted_design": submitted_design,
        "reports": [{"id": report.id, "title": report.title, "created_at": report.created_at,
            "sha256": report.content_sha256} for report in reports],
        "reports_truncated": len(reports) == 100,
        "quote_id": quote.id if quote else None,
        "delivery_acceptance": {"report_id": reports[0].id, "sha256": reports[0].content_sha256,
            "accepted_at": accepted.created_at} if accepted else None,
        "events": [{"id": event.id, "action": event.action, "created_at": event.created_at,
            "status": (event.details or {}).get("status"),
            "message": (event.details or {}).get("customer_update", "") if event.action == "BUSINESS_REQUEST_STATUS_UPDATED"
                else (event.details or {}).get("message", "") if event.action == "BUSINESS_REQUEST_CUSTOMER_REPLIED" else "",
            "report_id": (event.details or {}).get("report_id") if event.action in {"SERVICE_REPORT_PUBLISHED", "BUSINESS_REQUEST_DELIVERY_ACCEPTED"} else None}
            for event in events], "truncated": len(events) == 100}
