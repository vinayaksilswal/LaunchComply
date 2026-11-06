"""Connections to third-party hosting providers (Vercel, Render, Neon, Cloudinary).

Credentials are stored only as Fernet ciphertext. Inventory and health snapshots
are provider observations at ``last_synced_at``; they are not a live stream.
"""
from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint

from app.models.base import BaseModel


HOSTING_PROVIDERS = ("VERCEL", "RENDER", "NEON", "CLOUDINARY")


class HostingProviderConnection(BaseModel):
    __tablename__ = "hosting_provider_connections"
    __table_args__ = (UniqueConstraint("organization_id", "provider", "account_ref", name="uq_hosting_connection_account"),)

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(20), nullable=False, index=True)
    label = Column(String(120), nullable=False)
    # Team ID (Vercel), owner ID (Render), org ID (Neon) or cloud name (Cloudinary).
    account_ref = Column(String(120), nullable=False, default="")
    account_name = Column(String(255), nullable=True)
    credential_encrypted = Column(Text, nullable=False)
    credential_hint = Column(String(16), nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")
    last_error = Column(Text, nullable=True)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    inventory_json = Column(JSON, nullable=True)
    health_json = Column(JSON, nullable=True)
    created_by = Column(String(36), nullable=False)
