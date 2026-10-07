"""Phase 10 AI Compliance & Security Copilot Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class CopilotMode(str, enum.Enum):
    SECURITY = "SECURITY"
    COMPLIANCE = "COMPLIANCE"
    CLOUD = "CLOUD"
    VAPT = "VAPT"
    INCIDENT = "INCIDENT"
    AUDIT = "AUDIT"
    EXECUTIVE = "EXECUTIVE"


class CopilotConfidence(str, enum.Enum):
    SUPPORTED = "SUPPORTED"
    PARTIALLY_SUPPORTED = "PARTIALLY_SUPPORTED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class ActionProposalType(str, enum.Enum):
    CREATE_TASK = "CREATE_TASK"
    CREATE_RISK = "CREATE_RISK"
    DRAFT_POLICY = "DRAFT_POLICY"
    GENERATE_REMEDIATION_PR = "GENERATE_REMEDIATION_PR"
    DRAFT_AUDITOR_RESPONSE = "DRAFT_AUDITOR_RESPONSE"


class ActionProposalStatus(str, enum.Enum):
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class QuestionnaireItemStatus(str, enum.Enum):
    UNANSWERED = "UNANSWERED"
    AI_DRAFTED = "AI_DRAFTED"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    APPROVED = "APPROVED"
    NEEDS_EVIDENCE = "NEEDS_EVIDENCE"
    REJECTED = "REJECTED"


class CopilotConversation(BaseModel):
    """Contextual conversation thread with the LaunchComply Copilot."""
    __tablename__ = "copilot_conversations"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    mode = Column(Enum(CopilotMode), default=CopilotMode.COMPLIANCE, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)


class CopilotMessage(BaseModel):
    """Evidence-grounded message inside a copilot conversation."""
    __tablename__ = "copilot_messages"

    conversation_id = Column(String(36), ForeignKey("copilot_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), default="USER", nullable=False)  # USER, ASSISTANT, SYSTEM
    content = Column(Text, nullable=False)
    confidence = Column(Enum(CopilotConfidence), default=CopilotConfidence.SUPPORTED, nullable=False)
    tokens_used = Column(Integer, default=0, nullable=False)
    model_name = Column(String(100), default="launchcomply-copilot-v1", nullable=False)


class CopilotEvidenceReference(BaseModel):
    """Structured evidence citation linked to a Copilot answer."""
    __tablename__ = "copilot_evidence_references"

    message_id = Column(String(36), ForeignKey("copilot_messages.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # EVIDENCE, CONTROL, FINDING, INCIDENT, AWS_RESOURCE, RELEASE, RISK, POLICY
    entity_id = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    snippet = Column(Text, nullable=True)


class CopilotActionProposal(BaseModel):
    """Action proposed by Copilot requiring explicit human approval."""
    __tablename__ = "copilot_action_proposals"

    message_id = Column(String(36), ForeignKey("copilot_messages.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(Enum(ActionProposalType), nullable=False)
    proposed_payload_json = Column(Text, default="{}", nullable=False)
    status = Column(Enum(ActionProposalStatus), default=ActionProposalStatus.PROPOSED, nullable=False, index=True)
    reviewed_by = Column(String(36), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)


class ApprovedSecurityAnswer(BaseModel):
    """Reusable library of approved security answers for vendor questionnaires."""
    __tablename__ = "copilot_approved_security_answers"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    question_pattern = Column(String(500), nullable=False, index=True)
    approved_answer = Column(Text, nullable=False)
    evidence_references_json = Column(Text, default="[]", nullable=False)
    owner = Column(String(255), nullable=False)
    expiry_date = Column(DateTime, nullable=True)


class SecurityQuestionnaireUpload(BaseModel):
    """Uploaded customer vendor security questionnaire."""
    __tablename__ = "copilot_questionnaire_uploads"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), default="XLSX", nullable=False)  # XLSX, CSV
    total_questions = Column(Integer, default=0, nullable=False)
    answered_questions = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="PROCESSING", nullable=False)


class SecurityQuestionnaireItem(BaseModel):
    """Parsed question item within a security questionnaire."""
    __tablename__ = "copilot_questionnaire_items"

    questionnaire_id = Column(String(36), ForeignKey("copilot_questionnaire_uploads.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    category = Column(String(100), default="GENERAL", nullable=False)
    answer_text = Column(Text, nullable=True)
    status = Column(Enum(QuestionnaireItemStatus), default=QuestionnaireItemStatus.UNANSWERED, nullable=False, index=True)
    confidence = Column(Enum(CopilotConfidence), default=CopilotConfidence.SUPPORTED, nullable=False)
    approved_by = Column(String(36), nullable=True)
