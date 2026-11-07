"""Durable record of each guided-launch create step.

A row is written before a provider is contacted, so a timeout or crash leaves
an AMBIGUOUS/CREATING record that must be reconciled against the provider
before anything is created again. One row per application part.
"""
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint

from app.models.base import BaseModel

LAUNCH_STEP_STATES = ("CREATING", "CREATED", "FAILED", "AMBIGUOUS")


class LaunchStep(BaseModel):
    __tablename__ = "launch_steps"
    __table_args__ = (UniqueConstraint("organization_id", "application_id", "part_id", name="uq_launch_step_part"),)

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    part_id = Column(String(64), nullable=False)
    role = Column(String(20), nullable=False)
    provider = Column(String(20), nullable=False)
    connection_id = Column(String(36), ForeignKey("hosting_provider_connections.id", ondelete="SET NULL"), nullable=True)
    resource_name = Column(String(64), nullable=False)
    fingerprint = Column(String(64), nullable=False)
    status = Column(String(20), nullable=False)
    provider_resource_id = Column(String(120), nullable=True)
    error = Column(Text, nullable=True)
    attempt_started_at = Column(DateTime(timezone=True), nullable=False)
    created_by = Column(String(36), nullable=False)
