from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class EnvironmentSchema(BaseModel):
    id: str
    name: str
    slug: str
    aws_region: str
    is_live: bool
    domain_name: str
    https_active: bool
    status: str

class ApplicationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    repo_url: Optional[str] = None
    repo_branch: str = "main"
    framework_frontend: str = "React"
    framework_backend: str = "FastAPI"
    database_engine: str = "PostgreSQL"

class ApplicationResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    slug: str
    description: Optional[str]
    repo_url: Optional[str]
    repo_branch: str
    framework_frontend: str
    framework_backend: str
    database_engine: str
    runtime: str
    status: str
    production_readiness_score: str
    security_posture_score: str
    compliance_readiness_score: str
    environments: List[EnvironmentSchema] = []
    created_at: datetime

class StackAnalysisRequest(BaseModel):
    repo_url: Optional[str] = None
    source_type: str = "github" # github, manual, archive
    frontend_hint: Optional[str] = None
    backend_hint: Optional[str] = None
    database_hint: Optional[str] = None

class StackAnalysisResult(BaseModel):
    frontend: str
    backend: str
    database: str
    runtime: str
    container_ready: bool
    estimated_monthly_inr: str
    detected_services: List[str]
    suggested_aws_architecture: List[str]
