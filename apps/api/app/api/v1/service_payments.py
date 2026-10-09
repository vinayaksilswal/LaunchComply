import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import require_platform_admin
from app.api.v1.architecture_workspace import member, editor, latest, design_is_approved
from app.models.auth import User
from app.models.application import Application
from app.models.entities import ServiceRequest, CloudAccount
from app.models.audit import AuditEvent
from app.models.service_payments import ServicePaymentQuote, ServiceCheckout, ServicePaymentEvent
from app.services.commercial import service_payments as gateway

router = APIRouter(tags=["Service Payments"])
Provider = Literal["STRIPE", "RAZORPAY"]


def quote_output(quote, checkout=None):
    return {"id": quote.id, "request_id": quote.request_id, "title": quote.title, "scope": quote.scope,
            "amount_minor": quote.amount_minor, "currency": quote.currency, "status": quote.status,
            "delivery_mode": quote.delivery_mode, "created_at": quote.created_at,
            "checkout": {"provider": checkout.provider, "mode": checkout.mode, "status": checkout.status,
                         "is_real_payment_verified": checkout.is_real_payment_verified, "paid_at": checkout.paid_at}
            if checkout else None}


async def emit(db, quote, actor, action, details=None):
    db.add(AuditEvent(organization_id=quote.organization_id, actor_id=actor.id if actor else "payment-provider",
        actor_email=actor.email if actor else "payment-provider", action=action,
        entity_type="service_quote", entity_id=quote.id, details=details or {}))


async def deployment_design(db, item):
    if item.service_code != "DEPLOYMENT_HELP":
        return None
    event = (await db.execute(select(AuditEvent).where(AuditEvent.organization_id == item.organization_id,
        AuditEvent.entity_id == item.id, AuditEvent.action == "BUSINESS_REQUEST_SUBMITTED").limit(1))).scalar_one_or_none()
    app_id = (event.details or {}).get("application_id") if event else None
    app = (await db.execute(select(Application).where(Application.id == app_id,
        Application.organization_id == item.organization_id))).scalar_one_or_none() if app_id else None
    arch = await latest(db, app) if app else None
    if not design_is_approved(arch):
        raise HTTPException(409, "Deployment quotes require a request linked to an application with an approved saved design.")
    accounts = (await db.execute(select(CloudAccount).where(CloudAccount.organization_id == item.organization_id,
        CloudAccount.status == "CONNECTED"))).scalars().all()
    if not any((account.permission_profiles_json or {}).get("verification_source") == "AWS_STS_API" for account in accounts):
        raise HTTPException(409, "Verify the customer's AWS account through the live connection flow before quoting deployment.")
    return arch


@router.get("/service-payments/quotes")
async def quotes(request_id: str | None = None, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    conditions = [ServicePaymentQuote.organization_id == membership.organization_id]
    if request_id: conditions.append(ServicePaymentQuote.request_id == request_id)
    rows = (await db.execute(select(ServicePaymentQuote, ServiceCheckout).outerjoin(ServiceCheckout, ServiceCheckout.quote_id == ServicePaymentQuote.id)
        .where(*conditions).order_by(ServicePaymentQuote.created_at.desc()).limit(100))).all()
    return {"quotes": [quote_output(quote, checkout) for quote, checkout in rows],
            "providers": [gateway.provider_config(provider) for provider in ("STRIPE", "RAZORPAY")]}


class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    quote_id: uuid.UUID
    title: str = Field(min_length=3, max_length=255)
    scope: str = Field(min_length=30, max_length=5000)
    amount_minor: int = Field(ge=100, le=100_000_000)
    currency: Literal["INR", "USD"]
    delivery_ready: Literal[True]


@router.get("/admin/operations-queue/{request_id}/quote")
async def admin_quote(request_id: str, admin=Depends(require_platform_admin), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(ServicePaymentQuote, ServiceCheckout).outerjoin(ServiceCheckout, ServiceCheckout.quote_id == ServicePaymentQuote.id)
        .where(ServicePaymentQuote.request_id == request_id))).one_or_none()
    return {"quote": quote_output(*row) if row else None}


@router.post("/admin/operations-queue/{request_id}/quote")
async def create_quote(request_id: str, payload: QuoteRequest, admin=Depends(require_platform_admin), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id).with_for_update())).scalar_one_or_none()
    if not item: raise HTTPException(404, "Request not found.")
    existing = (await db.execute(select(ServicePaymentQuote).where(ServicePaymentQuote.request_id == request_id))).scalar_one_or_none()
    if existing:
        if existing.id == str(payload.quote_id) and existing.amount_minor == payload.amount_minor and existing.currency == payload.currency and existing.scope == payload.scope and existing.title == payload.title:
            return quote_output(existing)
        raise HTTPException(409, "This request already has an immutable quote. Do not issue another charge for it.")
    if item.status not in {"REVIEWING", "WAITING_CUSTOMER"}:
        raise HTTPException(409, "Review the request and confirm delivery scope before publishing a quote.")
    arch = await deployment_design(db, item)
    quote = ServicePaymentQuote(id=str(payload.quote_id), organization_id=item.organization_id, request_id=item.id,
        architecture_id=arch.id if arch else None, created_by=admin.id, title=payload.title, scope=payload.scope,
        amount_minor=payload.amount_minor, currency=payload.currency, status="OPEN", delivery_mode="ASSISTED_SERVICE")
    db.add(quote)
    await emit(db, quote, admin, "SERVICE_QUOTE_PUBLISHED", {"amount_minor": quote.amount_minor, "currency": quote.currency})
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "This quote identifier has already been used. Refresh the request before quoting.") from None
    return quote_output(quote)


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider: Provider
    accepted_scope: Literal[True]


@router.post("/service-payments/quotes/{quote_id}/checkout")
async def checkout(quote_id: str, payload: CheckoutRequest, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    quote = (await db.execute(select(ServicePaymentQuote).where(ServicePaymentQuote.id == quote_id,
        ServicePaymentQuote.organization_id == membership.organization_id).with_for_update())).scalar_one_or_none()
    if not quote: raise HTTPException(404, "Quote not found in your business.")
    if quote.status != "OPEN": raise HTTPException(409, "This quote is no longer payable.")
    item = await db.get(ServiceRequest, quote.request_id)
    if item.status in {"DELIVERED", "CLOSED"}: raise HTTPException(409, "This service is already complete. Contact operations before payment.")
    arch = await deployment_design(db, item)
    if arch and arch.id != quote.architecture_id:
        raise HTTPException(409, "The approved design changed after this quote. Contact operations for a scope review before payment.")
    config = gateway.provider_config(payload.provider)
    if not config["available"]: raise HTTPException(503, config["reason"])
    record = (await db.execute(select(ServiceCheckout).where(ServiceCheckout.quote_id == quote.id))).scalar_one_or_none()
    if not record:
        record = ServiceCheckout(id=str(uuid.uuid4()), organization_id=quote.organization_id, quote_id=quote.id,
            provider=payload.provider, mode=config["mode"], status="CREATING")
        db.add(record)
        # Persist the recovery reference before any external request.
        await db.commit()
        quote = (await db.execute(select(ServicePaymentQuote).where(ServicePaymentQuote.id == quote_id).with_for_update()
                                 .execution_options(populate_existing=True))).scalar_one()
        record = (await db.execute(select(ServiceCheckout).where(ServiceCheckout.quote_id == quote.id)
                                  .execution_options(populate_existing=True))).scalar_one()
        if quote.status != "OPEN": raise HTTPException(409, "This quote is no longer payable.")
        await db.refresh(item)
        if item.status in {"DELIVERED", "CLOSED"}: raise HTTPException(409, "This service is already complete. Contact operations before payment.")
        arch = await deployment_design(db, item)
        if arch and arch.id != quote.architecture_id:
            raise HTTPException(409, "The approved design changed. Contact operations before payment.")
    if record.provider != payload.provider or record.mode != config["mode"]:
        raise HTTPException(409, "Continue using the provider selected for this quote, or contact operations to review it.")
    if record.status in {"PAID", "TEST_PAID", "EXPIRED"}:
        raise HTTPException(409, "This checkout cannot be reused. Refresh its payment status or contact operations.")
    if record.checkout_url:
        result = await reconcile(db, quote, record)
        await db.commit()
        if result["checkout"]["status"] in {"PAID", "TEST_PAID", "EXPIRED"}:
            raise HTTPException(409, "This checkout is paid or expired. Refresh your quote before continuing.")
        return {"checkout_url": gateway.safe_checkout_url(record.provider, record.checkout_url), "mode": record.mode}
    reference, url, expires = await gateway.create_checkout(quote, record)
    record.provider_reference, record.checkout_url, record.status = reference, url, "CHECKOUT_READY"
    if expires: record.expires_at = datetime.fromtimestamp(expires, timezone.utc)
    await emit(db, quote, await db.get(User, membership.user_id), "SERVICE_CHECKOUT_CREATED", {"provider": record.provider, "mode": record.mode,
        "accepted_scope_sha256": hashlib.sha256(quote.scope.encode()).hexdigest(), "amount_minor": quote.amount_minor, "currency": quote.currency})
    await db.commit()
    return {"checkout_url": url, "mode": record.mode}


async def reconcile(db, quote, checkout):
    state = await gateway.inspect_payment(quote, checkout)
    if state == "PAID" and checkout.status not in {"PAID", "TEST_PAID"}:
        checkout.is_real_payment_verified = checkout.mode == "live"
        checkout.status = "PAID" if checkout.mode == "live" else "TEST_PAID"
        checkout.paid_at = datetime.now(timezone.utc)
        quote.status = "PAID" if checkout.mode == "live" else "TEST_PAID"
        await emit(db, quote, None, "SERVICE_PAYMENT_VERIFIED", {"provider": checkout.provider, "mode": checkout.mode})
    elif state == "EXPIRED" and checkout.status not in {"PAID", "TEST_PAID"}:
        checkout.status = "EXPIRED"
    # No infrastructure job or subscription entitlement is triggered by payment.
    return quote_output(quote, checkout)


@router.post("/service-payments/quotes/{quote_id}/refresh")
async def refresh_payment(quote_id: str, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    quote = (await db.execute(select(ServicePaymentQuote).where(ServicePaymentQuote.id == quote_id,
        ServicePaymentQuote.organization_id == membership.organization_id).with_for_update())).scalar_one_or_none()
    if not quote: raise HTTPException(404, "Quote not found in your business.")
    checkout = (await db.execute(select(ServiceCheckout).where(ServiceCheckout.quote_id == quote.id))).scalar_one_or_none()
    if not checkout: raise HTTPException(409, "No checkout has been created.")
    result = await reconcile(db, quote, checkout)
    await db.commit()
    return result


@router.post("/service-payments/webhooks/{provider}")
async def webhook(provider: Literal["stripe", "razorpay"], request: Request, db: AsyncSession = Depends(get_db)):
    name = provider.upper()
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > 262144: raise HTTPException(413, "Webhook payload too large.")
    signature = request.headers.get("stripe-signature" if provider == "stripe" else "x-razorpay-signature", "")
    if not gateway.verify_signature(name, bytes(raw), signature): raise HTTPException(400, "Invalid payment signature.")
    try:
        event = json.loads(raw)
        kind = event.get("type", event.get("event", "unknown"))
        if provider == "stripe":
            ref = event.get("data", {}).get("object", {}).get("id")
            event_id = event["id"]
        else:
            ref = event.get("payload", {}).get("payment_link", {}).get("entity", {}).get("id")
            event_id = request.headers.get("x-razorpay-event-id") or hashlib.sha256(raw).hexdigest()
        if not isinstance(event_id, str) or len(event_id) > 150 or not isinstance(kind, str) or len(kind) > 100:
            raise ValueError()
    except (ValueError, KeyError, AttributeError, TypeError):
        raise HTTPException(400, "Invalid payment event.") from None
    checkout = (await db.execute(select(ServiceCheckout).where(ServiceCheckout.provider == name,
        ServiceCheckout.provider_reference == ref))).scalar_one_or_none() if ref else None
    if not checkout: return {"status": "IGNORED"}
    quote = (await db.execute(select(ServicePaymentQuote).where(ServicePaymentQuote.id == checkout.quote_id).with_for_update())).scalar_one()
    checkout = (await db.execute(select(ServiceCheckout).where(ServiceCheckout.id == checkout.id)
                                .execution_options(populate_existing=True))).scalar_one()
    previous = (await db.execute(select(ServicePaymentEvent).where(ServicePaymentEvent.provider == name,
        ServicePaymentEvent.provider_event_id == event_id))).scalar_one_or_none()
    if previous: return {"status": "ALREADY_PROCESSED"}
    result = await reconcile(db, quote, checkout)
    db.add(ServicePaymentEvent(provider=name, provider_event_id=event_id, event_type=kind,
        payload_sha256=hashlib.sha256(raw).hexdigest(), checkout_id=checkout.id, status=result["status"]))
    await db.commit()
    return {"status": "PROCESSED"}
