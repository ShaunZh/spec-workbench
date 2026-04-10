"""SQLAlchemy model for artifact (analysis result)."""

from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Artifact(Base):
    """Artifact model for storing analysis results."""

    __tablename__ = "artifacts"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    source_message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    summary = Column(Text, nullable=True)
    todos_json = Column(Text, nullable=True)  # JSON string
    risks_json = Column(Text, nullable=True)  # JSON string
    acceptance_json = Column(Text, nullable=True)  # JSON string
    questions_json = Column(Text, nullable=True)  # JSON string
    score_json = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation = relationship("Conversation", back_populates="artifacts")
    source_message = relationship("Message", back_populates="artifacts")