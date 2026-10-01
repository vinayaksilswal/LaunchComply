from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, JSON
from app.models.base import BaseModel

class AuditEvent(BaseModel):
    __tablename__ = "audit_events"
    
    organization_id = Column(String(36), index=True, nullable=False)
    actor_id = Column(String(36), nullable=False)
    actor_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False, index=True)  # e.g., AWS_CONNECTED, DEPLOYMENT_APPROVED, VAPT_STARTED
    entity_type = Column(String(100), nullable=False)        # application, deployment, organization, user
    entity_id = Column(String(36), nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    details = Column(JSON, nullable=True)
