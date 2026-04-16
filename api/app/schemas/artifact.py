"""Pydantic schemas for artifact endpoints."""

from pydantic import BaseModel
from typing import List, Optional


class ArtifactCreate(BaseModel):
    """Schema for creating an analysis result."""

    conversation_id: int
    source_message_id: Optional[int] = None
    summary: str
    todos: List[str]
    risks: List[dict]
    acceptance_criteria: List[str]
    open_questions: List[str]
