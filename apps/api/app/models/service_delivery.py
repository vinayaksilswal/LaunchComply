from sqlalchemy import Column, String, Text, ForeignKey
from app.models.base import BaseModel

class ServiceDeliveryReport(BaseModel):
    __tablename__ = "service_delivery_reports"
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    request_id = Column(String(36), ForeignKey("service_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    published_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    content_sha256 = Column(String(64), nullable=False)
