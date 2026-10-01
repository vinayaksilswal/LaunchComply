from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.applications import router as apps_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.architecture import router as architecture_router
from app.api.v1.security import router as security_router
from app.api.v1.vapt import router as vapt_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.deployments import router as deployments_router
from app.api.v1.cloud import router as cloud_router
from app.api.v1.audit import router as audit_router
from app.api.v1.services import router as services_router
from app.api.v1.source_control import router as source_control_router
from app.api.v1.analysis import router as analysis_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(apps_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(architecture_router)
api_v1_router.include_router(security_router)
api_v1_router.include_router(vapt_router)
api_v1_router.include_router(compliance_router)
api_v1_router.include_router(deployments_router)
api_v1_router.include_router(cloud_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(services_router)
api_v1_router.include_router(source_control_router)
api_v1_router.include_router(analysis_router)
