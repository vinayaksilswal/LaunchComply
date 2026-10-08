from fastapi import APIRouter, Depends, HTTPException
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.entities import Architecture
from app.core.audit import log_audit_event

router = APIRouter(prefix="/architecture", tags=["Architecture"])

@router.get("/")
async def get_architecture(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Architecture)
        .where(Architecture.organization_id == membership.organization_id)
        .order_by(Architecture.created_at.desc())
    )
    arch = result.scalars().first()
    if not arch:
        if not settings.DEMO_MODE or settings.ENVIRONMENT.lower() in {"production", "staging"}:
            return {"status": "NOT_ANALYZED", "nodes": [], "edges": []}
        # Default fallback topology specification
        return {
            "name": "AWS Production High-Availability Topology",
            "version": "v1.0.0",
            "status": "ACTIVE",
            "vpc": {"cidr": "10.0.0.0/16", "region": "ap-south-1", "az_count": 2},
            "nodes": [
                {"id": "dns-1", "name": "Route 53", "tier": "PUBLIC_EDGE", "category": "DNS", "ports": "53/UDP", "status": "LIVE", "cost": "₹450"},
                {"id": "cdn-1", "name": "CloudFront CDN", "tier": "PUBLIC_EDGE", "category": "CDN", "ports": "443/HTTPS", "status": "LIVE", "cost": "₹1,800"},
                {"id": "waf-1", "name": "AWS WAF", "tier": "PUBLIC_EDGE", "category": "WAF", "ports": "OWASP Top 10 Rules", "status": "LIVE", "cost": "₹2,500"},
                {"id": "alb-1", "name": "Application Load Balancer", "tier": "PUBLIC_SUBNET", "category": "ALB", "ports": "80->443 SSL", "status": "LIVE", "cost": "₹2,200"},
                {"id": "ecs-1", "name": "ECS Fargate (FastAPI API)", "tier": "PRIVATE_APP", "category": "Compute", "ports": "8000/TCP", "status": "LIVE", "cost": "₹12,400"},
                {"id": "rds-1", "name": "RDS PostgreSQL Multi-AZ", "tier": "DATABASE_ISOLATED", "category": "Database", "ports": "5432/TCP", "status": "LIVE", "cost": "₹14,500"},
                {"id": "cache-1", "name": "ElastiCache Redis", "tier": "PRIVATE_APP", "category": "Cache", "ports": "6379/TCP", "status": "LIVE", "cost": "₹2,800"},
                {"id": "s3-1", "name": "S3 KMS Encrypted Vault", "tier": "EXTERNAL_AWS", "category": "Storage", "ports": "HTTPS IAM", "status": "LIVE", "cost": "₹1,850"},
            ],
            "edges": [
                {"from": "dns-1", "to": "cdn-1", "label": "DNS Resolution"},
                {"from": "cdn-1", "to": "waf-1", "label": "Edge Filter"},
                {"from": "waf-1", "to": "alb-1", "label": "SSL Termination"},
                {"from": "alb-1", "to": "ecs-1", "label": "Private Target Group"},
                {"from": "ecs-1", "to": "rds-1", "label": "Encrypted TLS (port 5432)"},
                {"from": "ecs-1", "to": "cache-1", "label": "Session Cache (port 6379)"},
                {"from": "ecs-1", "to": "s3-1", "label": "IAM Presigned Uploads"},
            ]
        }
    return {
        "id": arch.id,
        "name": arch.name,
        "version": arch.version,
        "status": arch.status,
        "topology": arch.spec_json
    }

@router.get("/export-package")
async def export_architecture_package(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    if not settings.DEMO_MODE or settings.ENVIRONMENT.lower() in {"production", "staging"}:
        raise HTTPException(503, "Use the architecture workspace to export your actual draft. An infrastructure package has not been generated.")
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="system@launchcomply.io",
        action="ARCHITECTURE_PACKAGE_DOWNLOADED",
        entity_type="architecture",
        details={"package_format": "zip_bundle", "included_iac": ["terraform", "cloudformation"]}
    )

    terraform_preview = """# LaunchComply Generated Production Architecture
# Provider: AWS ap-south-1 (Mumbai)

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "launchcomply-prod-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["ap-south-1a", "ap-south-1b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]
  database_subnets= ["10.0.20.0/24", "10.0.21.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false
  enable_vpn_gateway = false

  enable_dns_hostnames = true
  enable_dns_support   = true
}
"""

    return {
        "status": "READY_FOR_DOWNLOAD",
        "generated_at": "2026-10-01T10:30:00Z",
        "manifest": [
            {"file": "architecture.pdf", "type": "Architecture Blueprint", "size": "1.4 MB"},
            {"file": "infrastructure-inventory.csv", "type": "Asset Register", "size": "48 KB"},
            {"file": "deployment-summary.pdf", "type": "Deployment Specification", "size": "820 KB"},
            {"file": "network-and-data-flow.pdf", "type": "Data Flow Diagram", "size": "1.1 MB"},
            {"file": "security-controls.pdf", "type": "Security Posture Summary", "size": "950 KB"},
            {"file": "backup-dr-summary.pdf", "type": "Disaster Recovery Runbook", "size": "640 KB"},
            {"file": "main.tf", "type": "Terraform Infrastructure as Code", "size": "14 KB"},
        ],
        "terraform_preview": terraform_preview
    }
