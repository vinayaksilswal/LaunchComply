from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.models.auth import MembershipRole

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    organization_id: str
    organization_name: str
    role: MembershipRole

class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    tier: str
    is_demo: bool
    role: MembershipRole

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_platform_admin: bool
    organizations: List[OrganizationResponse]

class SwitchOrgRequest(BaseModel):
    organization_id: str
