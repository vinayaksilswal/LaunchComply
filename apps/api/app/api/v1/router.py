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
from app.api.v1.infrastructure import router as infrastructure_router
from app.api.v1.releases import router as releases_router
from app.api.v1.operations import router as operations_router
from app.api.v1.security_assurance import router as security_assurance_router
from app.api.v1.compliance_os import router as compliance_os_router
from app.api.v1.commercial import router as commercial_router
from app.api.v1.platform_admin import router as platform_admin_router

from app.api.v1.enterprise import router as enterprise_router
from app.api.v1.assurance import router as assurance_router, public_assurance_router

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
api_v1_router.include_router(infrastructure_router, prefix="/infrastructure", tags=["Infrastructure"])
api_v1_router.include_router(releases_router)
api_v1_router.include_router(operations_router)
api_v1_router.include_router(security_assurance_router)
api_v1_router.include_router(compliance_os_router)
api_v1_router.include_router(commercial_router)
api_v1_router.include_router(platform_admin_router)
api_v1_router.include_router(enterprise_router)
api_v1_router.include_router(assurance_router)
api_v1_router.include_router(public_assurance_router)




