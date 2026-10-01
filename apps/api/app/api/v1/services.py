from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.entities import ServiceRequest
from app.core.audit import log_audit_event

router = APIRouter(prefix="/services", tags=["Professional Services"])

class ServiceRequestCreate(BaseModel):
    service_code: str
    title: str
    customer_notes: Optional[str] = None

@router.get("/catalog")
async def get_service_catalog():
    return [
        {
            "code": "DEPLOY_APPLICATION",
            "title": "Deploy My Application",
            "category": "Cloud Architecture",
            "price_range": "₹45,000 - ₹90,000",
            "description": "End-to-end production deployment on your AWS account: ECS Fargate, RDS PostgreSQL Multi-AZ, WAF, CloudFront, Route 53, and CI/CD pipeline.",
            "duration": "3 - 5 business days",
        },
        {
            "code": "ARCHITECTURE_REVIEW",
            "title": "AWS Architecture & Well-Architected Review",
            "category": "Cloud Architecture",
            "price_range": "₹35,000 - ₹65,000",
            "description": "Comprehensive review across 6 AWS Well-Architected pillars: Security, Reliability, Performance Efficiency, Cost Optimization, Operational Excellence, and Sustainability.",
            "duration": "2 - 4 business days",
        },
        {
            "code": "VAPT_ENGAGEMENT",
            "title": "Professional Web API & Infrastructure VAPT",
            "category": "Security & VAPT",
            "price_range": "₹75,000 - ₹1,50,000",
            "description": "Manual & automated penetration testing by certified offensive security engineers (OSCP/CRTP). Covers OWASP Top 10, API security, and AWS misconfiguration.",
            "duration": "7 - 10 business days",
        },
        {
            "code": "DPDP_READINESS",
            "title": "India DPDP Act (2023) Privacy Readiness",
            "category": "Privacy & Legal",
            "price_range": "₹60,000 - ₹1,20,000",
            "description": "Data processing inventory, consent notice workflows, data principal rights workflows, DPA templates, and subprocessor risk assessments.",
            "duration": "1 - 2 weeks",
        },
        {
            "code": "ISO27001_ACCELERATOR",
            "title": "ISO/IEC 27001:2022 Implementation Readiness",
            "category": "Compliance Advisory",
            "price_range": "₹1,50,000 - ₹3,00,000",
            "description": "ISMS scope definition, 93 Annex A control implementation, risk assessment register, policy generation, and internal audit preparation.",
            "duration": "3 - 4 weeks",
        },
        {
            "code": "SOC2_READINESS",
            "title": "SOC 2 Type II Enterprise Preparation",
            "category": "Compliance Advisory",
            "price_range": "₹1,80,000 - ₹3,50,000",
            "description": "Trust Services Criteria scoping, continuous control automation, evidence vault population, and auditor walkthrough preparation.",
            "duration": "4 - 6 weeks",
        }
    ]

@router.get("/requests")
async def list_service_requests(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ServiceRequest)
        .where(ServiceRequest.organization_id == membership.organization_id)
        .order_by(ServiceRequest.created_at.desc())
    )
    return result.scalars().all()

@router.post("/requests")
async def create_service_request(
    payload: ServiceRequestCreate,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    req = ServiceRequest(
        organization_id=membership.organization_id,
        service_code=payload.service_code,
        title=payload.title,
        status="REQUESTED",
        customer_notes=payload.customer_notes,
        estimated_delivery="1 - 2 weeks"
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="system@launchcomply.io",
        action="SERVICE_REQUESTED",
        entity_type="service_request",
        entity_id=req.id,
        details={"service_code": payload.service_code, "title": payload.title}
    )

    return req
