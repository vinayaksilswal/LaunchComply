import uuid
import hashlib
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import require_platform_admin
from app.api.v1.architecture_workspace import editor, member, application, latest, design_is_approved
from app.models.auth import Organization, User
from app.models.entities import ServiceRequest
from app.models.audit import AuditEvent
from app.models.service_delivery import ServiceDeliveryReport
from app.models.service_payments import ServicePaymentQuote, ServiceCheckout
from app.services.commercial.request_workflow import activity, TRANSITIONS, require_real_service_payment, latest_report, delivery_acceptance

router = APIRouter(tags=["Business Requests"])
Code = Literal["DEPLOYMENT_HELP", "SECURITY_ASSESSMENT", "COMPLIANCE_HELP", "AWS_CONNECTION", "BACKUP_REVIEW", "COST_REVIEW", "SUPPORT", "VAPT_ASSESSMENT", "ISO27001_HELP", "SOC2_HELP", "PRIVACY_HELP"]
State = Literal["REQUESTED", "REVIEWING", "IN_PROGRESS", "WAITING_CUSTOMER", "DELIVERED", "CLOSED"]
SERVICE_FAMILIES = {
    "security": {"SECURITY_ASSESSMENT", "VAPT_ASSESSMENT"},
    "compliance": {"COMPLIANCE_HELP", "ISO27001_HELP", "SOC2_HELP", "PRIVACY_HELP"},
}

@router.get("/business-requests")
async def customer_requests(service_code: Code | None = None, service_family: Literal["security", "compliance"] | None = None,
    membership=Depends(member), db: AsyncSession = Depends(get_db)):
    conditions = [ServiceRequest.organization_id == membership.organization_id]
    if service_code: conditions.append(ServiceRequest.service_code == service_code)
    if service_family: conditions.append(ServiceRequest.service_code.in_(SERVICE_FAMILIES[service_family]))
    items = (await db.execute(select(ServiceRequest).where(*conditions).order_by(ServiceRequest.created_at.desc()).limit(100))).scalars().all()
    ids = [item.id for item in items]
    reports = (await db.execute(select(ServiceDeliveryReport).where(ServiceDeliveryReport.organization_id == membership.organization_id,
        ServiceDeliveryReport.request_id.in_(ids)).order_by(ServiceDeliveryReport.created_at.desc()))).scalars().all() if ids else []
    quotes = (await db.execute(select(ServicePaymentQuote, ServiceCheckout).outerjoin(ServiceCheckout, ServiceCheckout.quote_id == ServicePaymentQuote.id)
        .where(ServicePaymentQuote.organization_id == membership.organization_id, ServicePaymentQuote.request_id.in_(ids)))).all() if ids else []
    quote_map = {quote.request_id: {"id": quote.id, "title": quote.title, "amount_minor": quote.amount_minor,
        "currency": quote.currency, "status": quote.status, "is_real_payment_verified": bool(checkout and checkout.is_real_payment_verified)}
        for quote, checkout in quotes}
    return {"truncated": len(items) == 100, "requests": [{"id": item.id, "title": item.title, "service_code": item.service_code, "status": item.status,
        "notes": item.customer_notes, "created_at": item.created_at, "estimated_delivery": item.estimated_delivery,
        "quote": quote_map.get(item.id),
        "reports": [{"id": report.id, "title": report.title, "created_at": report.created_at, "sha256": report.content_sha256}
            for report in reports if report.request_id == item.id]} for item in items]}

@router.get("/business-requests/reports/{report_id}")
async def report(report_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(ServiceDeliveryReport).where(ServiceDeliveryReport.id == report_id,
        ServiceDeliveryReport.organization_id == membership.organization_id))).scalar_one_or_none()
    if not item: raise HTTPException(404, "Report not found in your business.")
    return {"id": item.id, "request_id": item.request_id, "title": item.title, "content": item.content, "created_at": item.created_at, "sha256": item.content_sha256}

class CreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    request_id: uuid.UUID
    service_code: Code
    application_id: str | None = Field(default=None, max_length=36)
    architecture_id: str | None = Field(default=None, max_length=36)
    notes: str = Field(default="", max_length=700)

@router.post("/business-requests")
async def create(payload: CreateRequest, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, payload.application_id, membership, lock=bool(payload.architecture_id)) if payload.application_id else None
    submitted_design = None
    notes = (f"Application: {app.name} ({app.id})\n" if app else "") + payload.notes
    if payload.architecture_id:
        if not app or payload.service_code != "DEPLOYMENT_HELP":
            raise HTTPException(422, "A saved architecture reference is only supported for a business asset deployment review.")
        arch = await latest(db, app)
        if not arch or arch.id != payload.architecture_id or (arch.spec_json or {}).get("source_changed"):
            raise HTTPException(409, "The saved design changed. Refresh deployment preparation before submitting this review.")
        spec = arch.spec_json or {}
        evidence = spec.get("evidence") or {}
        targets = spec.get("requirements") or {}
        from app.services.architecture.design_review import build_review
        submitted_design = {"architecture_id": arch.id, "version": arch.version, "application_id": app.id,
            "review": build_review(spec["graph"], evidence, targets, spec.get("source_changed", False))}
        context = (f"Saved design: {arch.version} ({arch.id})\nSource snapshot: {evidence.get('commit') or 'Not recorded'}\n"
            f"Design approval: {'Recorded' if design_is_approved(arch) else 'Not recorded'}\n"
            f"Region: {targets.get('region') or 'Not chosen'}; availability: {targets.get('availability') or 'Not chosen'}\n"
            f"Peak requests/min: {targets.get('peak_requests_per_minute') or 'Not recorded'}; concurrent users: {targets.get('concurrent_users') or 'Not recorded'}\n")
        notes = context + notes
    if len(notes) > 1000:
        raise HTTPException(422, "These notes and saved design references exceed the request limit. Shorten your notes before submitting.")
    existing = await db.get(ServiceRequest, str(payload.request_id))
    if existing:
        if existing.organization_id == membership.organization_id and existing.service_code == payload.service_code and existing.customer_notes == notes:
            return {"id": existing.id, "status": existing.status}
        raise HTTPException(409, "This request identifier has already been used.")
    titles = {"DEPLOYMENT_HELP": "Help deploy my app", "SECURITY_ASSESSMENT": "Review app security", "COMPLIANCE_HELP": "Prepare business compliance", "AWS_CONNECTION": "Connect AWS monitoring", "BACKUP_REVIEW": "Review backups and recovery", "COST_REVIEW": "Connect cloud cost reporting", "SUPPORT": "Help with my workspace", "VAPT_ASSESSMENT": "Vulnerability assessment application", "ISO27001_HELP": "ISO 27001 preparation application", "SOC2_HELP": "SOC 2 preparation application", "PRIVACY_HELP": "Privacy review application"}
    item = ServiceRequest(id=str(payload.request_id), organization_id=membership.organization_id,
        service_code=payload.service_code, title=titles[payload.service_code], status="REQUESTED", customer_notes=notes,
        estimated_delivery="Awaiting operations review")
    db.add(item)
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id, actor_email=user.email,
        action="BUSINESS_REQUEST_SUBMITTED", entity_type="service_request", entity_id=item.id,
        details={"service_code": item.service_code, "application_id": app.id if app else None,
                 "submitted_design": submitted_design}))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await db.get(ServiceRequest, str(payload.request_id))
        if existing and existing.organization_id == membership.organization_id and existing.service_code == payload.service_code and existing.customer_notes == notes:
            return {"id": existing.id, "status": existing.status}
        raise HTTPException(409, "This request identifier has already been used.") from None
    return {"id": item.id, "status": item.status}

@router.get("/business-requests/{request_id}/activity")
async def customer_activity(request_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id,
        ServiceRequest.organization_id == membership.organization_id))).scalar_one_or_none()
    if not item: raise HTTPException(404, "Request not found in your business.")
    return await activity(db, item)

@router.get("/business-requests/{request_id}")
async def customer_request(request_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id,
        ServiceRequest.organization_id == membership.organization_id))).scalar_one_or_none()
    if not item: raise HTTPException(404, "Request not found in your business.")
    return await activity(db, item)

class AcceptDelivery(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    report_id: uuid.UUID
    content_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    reviewed_delivery: Literal[True]

@router.post("/business-requests/{request_id}/acceptance")
async def accept_delivery(request_id: str, payload: AcceptDelivery, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id,
        ServiceRequest.organization_id == membership.organization_id).with_for_update())).scalar_one_or_none()
    if not item: raise HTTPException(404, "Request not found in your business.")
    report = await latest_report(db, item)
    if not report or report.id != str(payload.report_id) or report.content_sha256 != payload.content_sha256:
        raise HTTPException(409, "The latest report changed. Refresh and review the current delivery before accepting it.")
    # The request lock serializes publication and acceptance. A retry creates no second receipt.
    accepted = await delivery_acceptance(db, item, report)
    if accepted:
        return {"report_id": report.id, "sha256": report.content_sha256, "accepted_at": accepted.created_at}
    if item.status != "DELIVERED":
        raise HTTPException(409, "This request is not awaiting delivery acceptance. Review the team's progress before accepting it.")
    user = await db.get(User, membership.user_id)
    receipt = AuditEvent(organization_id=item.organization_id, actor_id=user.id, actor_email=user.email,
        action="BUSINESS_REQUEST_DELIVERY_ACCEPTED", entity_type="service_request", entity_id=item.id,
        details={"report_id": report.id, "content_sha256": report.content_sha256})
    db.add(receipt)
    await db.commit()
    return {"report_id": report.id, "sha256": report.content_sha256, "accepted_at": receipt.created_at}

class CustomerReply(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    reply_id: uuid.UUID
    expected_status: State
    message: str = Field(min_length=3, max_length=1000)

@router.post("/business-requests/{request_id}/replies")
async def reply(request_id: str, payload: CustomerReply, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id,
        ServiceRequest.organization_id == membership.organization_id).with_for_update())).scalar_one_or_none()
    if not item: raise HTTPException(404, "Request not found in your business.")
    existing = await db.get(AuditEvent, str(payload.reply_id))
    if existing:
        if existing.organization_id == membership.organization_id and existing.entity_id == item.id and existing.action == "BUSINESS_REQUEST_CUSTOMER_REPLIED" and (existing.details or {}).get("message") == payload.message:
            return {"id": existing.id, "status": item.status}
        raise HTTPException(409, "This reply identifier has already been used.")
    if item.status != payload.expected_status: raise HTTPException(409, "This request changed. Refresh its progress before replying.")
    if item.status == "CLOSED": raise HTTPException(409, "This request is closed. Apply for a new service or contact support.")
    before = item.status
    if before == "WAITING_CUSTOMER": item.status = "REVIEWING"
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(id=str(payload.reply_id), organization_id=membership.organization_id,
        actor_id=membership.user_id, actor_email=user.email, entity_type="service_request", entity_id=item.id,
        action="BUSINESS_REQUEST_CUSTOMER_REPLIED", details={"message": payload.message, "status": item.status, "previous_status": before}))
    await db.commit()
    return {"id": str(payload.reply_id), "status": item.status}

@router.get("/admin/operations-queue")
async def queue(offset: int = Query(default=0, ge=0, le=10000), status: State | None = None,
    admin=Depends(require_platform_admin), db: AsyncSession = Depends(get_db)):
    counts = (await db.execute(select(ServiceRequest.status, func.count()).group_by(ServiceRequest.status))).all()
    conditions = [ServiceRequest.status == status] if status else []
    rows = (await db.execute(select(ServiceRequest, Organization.name).join(Organization, Organization.id == ServiceRequest.organization_id)
        .where(*conditions).order_by(ServiceRequest.created_at.desc()).offset(offset).limit(50))).all()
    return {"counts": dict(counts), "requests": [{"id": item.id, "organization_name": name,
        "title": item.title, "service_code": item.service_code, "status": item.status,
        "notes": item.customer_notes, "estimated_delivery": item.estimated_delivery,
        "created_at": item.created_at} for item, name in rows], "offset": offset}

class UpdateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    status: State
    expected_status: str = Field(max_length=50)
    note: str = Field(default="", max_length=1000)
    estimated_delivery: str | None = Field(default=None, max_length=100)
    customer_update: str = Field(default="", max_length=1000)

@router.patch("/admin/operations-queue/{request_id}")
async def update(request_id: str, payload: UpdateRequest, admin=Depends(require_platform_admin), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id).with_for_update())).scalar_one_or_none()
    if not item: raise HTTPException(404, "Request not found.")
    if item.status != payload.expected_status: raise HTTPException(409, "Another operator updated this request. Refresh before changing it.")
    if payload.status != item.status and payload.status not in TRANSITIONS.get(item.status, set()):
        raise HTTPException(409, "This status change is not part of the delivery workflow. Review the request before starting work or delivering it.")
    if payload.status == "WAITING_CUSTOMER" and not payload.customer_update:
        raise HTTPException(422, "Tell the customer what information you need before marking this request waiting for them.")
    if payload.status in {"IN_PROGRESS", "DELIVERED"}:
        await require_real_service_payment(db, item)
    if payload.status in {"DELIVERED", "CLOSED"} and item.service_code in {"SECURITY_ASSESSMENT", "COMPLIANCE_HELP", "VAPT_ASSESSMENT", "ISO27001_HELP", "SOC2_HELP", "PRIVACY_HELP"}:
        count = (await db.execute(select(func.count()).select_from(ServiceDeliveryReport).where(ServiceDeliveryReport.request_id == item.id))).scalar_one()
        if not count: raise HTTPException(409, "Publish the assessment report before marking this service delivered.")
    if payload.status == "CLOSED" and item.status != "CLOSED":
        report = await latest_report(db, item)
        if report and not await delivery_acceptance(db, item, report):
            raise HTTPException(409, "The customer must accept the latest delivered report before this request can close.")
    before = item.status
    item.status = payload.status
    if payload.estimated_delivery: item.estimated_delivery = payload.estimated_delivery
    db.add(AuditEvent(organization_id=item.organization_id, actor_id=admin.id, actor_email=admin.email,
        action="BUSINESS_REQUEST_STATUS_UPDATED", entity_type="service_request", entity_id=item.id,
        details={"previous_status": before, "status": item.status, "note": payload.note, "customer_update": payload.customer_update}))
    await db.commit()
    return {"id": item.id, "status": item.status}

@router.get("/admin/operations-queue/{request_id}/activity")
async def admin_activity(request_id: str, admin=Depends(require_platform_admin), db: AsyncSession = Depends(get_db)):
    item = await db.get(ServiceRequest, request_id)
    if not item: raise HTTPException(404, "Request not found.")
    return await activity(db, item)

class PublishReport(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    report_id: uuid.UUID
    title: str = Field(min_length=3, max_length=255)
    content: str = Field(min_length=20, max_length=20000)

@router.get("/admin/operations-queue/{request_id}/reports")
async def delivered_reports(request_id: str, admin=Depends(require_platform_admin), db: AsyncSession = Depends(get_db)):
    item = await db.get(ServiceRequest, request_id)
    if not item:
        raise HTTPException(404, "Request not found.")
    reports = (await db.execute(select(ServiceDeliveryReport).where(ServiceDeliveryReport.request_id == item.id,
        ServiceDeliveryReport.organization_id == item.organization_id).order_by(ServiceDeliveryReport.created_at.desc()).limit(100))).scalars().all()
    return {"reports": [{"id": report.id, "title": report.title, "content": report.content, "created_at": report.created_at,
        "sha256": report.content_sha256} for report in reports]}

@router.post("/admin/operations-queue/{request_id}/reports")
async def publish(request_id: str, payload: PublishReport, admin=Depends(require_platform_admin), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id).with_for_update())).scalar_one_or_none()
    if not item: raise HTTPException(404, "Request not found.")
    digest = hashlib.sha256(payload.content.encode()).hexdigest()
    existing = await db.get(ServiceDeliveryReport, str(payload.report_id))
    if existing:
        if existing.request_id == item.id and existing.content_sha256 == digest and existing.title == payload.title:
            return {"id": existing.id, "status": item.status}
        raise HTTPException(409, "This report identifier has already been used.")
    if item.status not in {"REVIEWING", "IN_PROGRESS", "DELIVERED"}:
        raise HTTPException(409, "Review this request before publishing delivered work. Closed or waiting requests cannot be delivered.")
    await require_real_service_payment(db, item)
    report = ServiceDeliveryReport(id=str(payload.report_id), organization_id=item.organization_id,
        request_id=item.id, published_by=admin.id, title=payload.title, content=payload.content, content_sha256=digest)
    db.add(report)
    item.status = "DELIVERED"
    db.add(AuditEvent(organization_id=item.organization_id, actor_id=admin.id, actor_email=admin.email,
        action="SERVICE_REPORT_PUBLISHED", entity_type="service_request", entity_id=item.id,
        details={"report_id": report.id, "content_sha256": digest}))
    await db.commit()
    return {"id": report.id, "status": item.status}
