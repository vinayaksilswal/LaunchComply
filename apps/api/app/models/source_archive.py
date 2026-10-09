from sqlalchemy import Column, ForeignKey, Integer, JSON, LargeBinary, String
from app.models.base import BaseModel


class ApplicationSourceArchive(BaseModel):
    __tablename__ = "application_source_archives"

    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    sha256 = Column(String(64), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    file_count = Column(Integer, nullable=False)
    encrypted_archive = Column(LargeBinary, nullable=False)
    evidence_json = Column(JSON, nullable=False)
