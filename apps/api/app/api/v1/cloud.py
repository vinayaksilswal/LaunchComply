import uuid
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.entities import CloudAccount
from app.core.config import settings
from app.core.audit import log_audit_event

router = APIRouter(prefix="/cloud", tags=["Cloud Accounts"])

class ConnectAWSRequest(BaseModel):
    account_id: str
    role_arn: str
    region: str = "ap-south-1"

@router.get("/aws/onboarding-template")
async def get_onboarding_template(
    membership: OrganizationMembership = Depends(get_current_membership)
):
    external_id = f"launchcomply-ext-{membership.organization_id[:8]}"
    cloudformation_template = f"""AWSTemplateFormatVersion: '2010-09-09'
Description: LaunchComply Cross-Account Deployment & Security Role

Parameters:
  LaunchComplyAccountId:
    Type: String
    Default: '{settings.LAUNCHCOMPLY_AWS_ACCOUNT_ID}'
  ExternalId:
    Type: String
    Default: '{external_id}'

Resources:
  LaunchComplyCrossAccountRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: LaunchComplyCrossAccountAccessRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${{LaunchComplyAccountId}}:root'
            Action: 'sts:AssumeRole'
            Condition:
              StringEquals:
                'sts:ExternalId': !Ref ExternalId
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonECS_FullAccess
        - arn:aws:iam::aws:policy/AmazonRDSFullAccess
        - arn:aws:iam::aws:policy/CloudFrontFullAccess
        - arn:aws:iam::aws:policy/AmazonRoute53FullAccess
"""
    return {
        "external_id": external_id,
        "launchcomply_account_id": settings.LAUNCHCOMPLY_AWS_ACCOUNT_ID,
        "recommended_role_name": "LaunchComplyCrossAccountAccessRole",
        "cloudformation_yaml": cloudformation_template
    }

@router.get("/accounts")
async def list_cloud_accounts(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CloudAccount)
        .where(CloudAccount.organization_id == membership.organization_id)
    )
    return result.scalars().all()

@router.post("/accounts")
async def connect_cloud_account(
    payload: ConnectAWSRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    external_id = f"launchcomply-ext-{membership.organization_id[:8]}"
    cloud_acc = CloudAccount(
        organization_id=membership.organization_id,
        provider="AWS",
        account_id=payload.account_id,
        role_arn=payload.role_arn,
        external_id=external_id,
        region=payload.region,
        status="CONNECTED",
    )
    db.add(cloud_acc)
    await db.commit()
    await db.refresh(cloud_acc)

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="system@launchcomply.io",
        action="AWS_ACCOUNT_CONNECTED",
        entity_type="cloud_account",
        entity_id=cloud_acc.id,
        details={"account_id": payload.account_id, "region": payload.region}
    )

    return cloud_acc
