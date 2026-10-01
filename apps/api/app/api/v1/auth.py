import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.auth import User, Organization, OrganizationMembership, MembershipRole
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse, OrganizationResponse, SwitchOrgRequest
from app.core.permissions import get_current_user
from app.core.audit import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    return re.sub(r'[\s\W-]+', '-', text).strip('-')

@router.post("/register", response_model=Token)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    
    # Create user
    user = User(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create organization
    org_slug = slugify(payload.organization_name)
    # Check if slug exists, append random suffix if needed
    slug_check = await db.execute(select(Organization).where(Organization.slug == org_slug))
    if slug_check.scalars().first():
        org_slug = f"{org_slug}-{user.id[:6]}"

    org = Organization(
        name=payload.organization_name,
        slug=org_slug,
        tier="growth",
        is_active=True,
        is_demo=False,
    )
    db.add(org)
    await db.flush()

    # Create Owner membership
    membership = OrganizationMembership(
        user_id=user.id,
        organization_id=org.id,
        role=MembershipRole.OWNER,
        is_active=True,
    )
    db.add(membership)
    await db.commit()

    token = create_access_token(user.id)
    
    # Audit log
    await log_audit_event(
        db=db,
        organization_id=org.id,
        actor_id=user.id,
        actor_email=user.email,
        action="USER_REGISTERED",
        entity_type="user",
        entity_id=user.id,
        details={"organization_name": org.name}
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        organization_id=org.id,
        organization_name=org.name,
        role=MembershipRole.OWNER,
    )

@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalars().first()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Get active organization membership
    result_mem = await db.execute(
        select(OrganizationMembership, Organization)
        .join(Organization, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == user.id, OrganizationMembership.is_active == True)
    )
    row = result_mem.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active organization found for this account"
        )
    membership, org = row

    token = create_access_token(user.id)

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        organization_id=org.id,
        organization_name=org.name,
        role=membership.role,
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OrganizationMembership, Organization)
        .join(Organization, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == current_user.id, OrganizationMembership.is_active == True)
    )
    rows = result.all()
    orgs = [
        OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            tier=org.tier,
            is_demo=org.is_demo,
            role=mem.role,
        )
        for mem, org in rows
    ]
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_platform_admin=current_user.is_platform_admin,
        organizations=orgs
    )
