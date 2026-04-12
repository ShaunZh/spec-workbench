"""Pydantic schemas for analysis result endpoints."""

from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


class AnalysisResult(BaseModel):
    """Schema for analysis result content (parsed from artifact)."""

    summary: Optional[str] = None
    todos: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    acceptance_criteria: Optional[List[str]] = None
    open_questions: Optional[List[str]] = None
    spec_score: Optional[float] = None  # 0-100 completeness score


class ArtifactResponse(BaseModel):
    """Schema for artifact (analysis result) response."""

    id: int
    conversation_id: int
    source_message_id: Optional[int] = None
    summary: Optional[str] = None
    todos_json: Optional[str] = None  # JSON string, parse on frontend
    risks_json: Optional[str] = None
    acceptance_json: Optional[str] = None
    questions_json: Optional[str] = None
    score_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisRequest(BaseModel):
    """Schema for requesting analysis."""

    conversation_id: int
    content: str  # raw requirement text to analyze


class AnalysisResponse(BaseModel):
    """Schema for analysis response."""

    artifact: ArtifactResponse
    result: Optional[AnalysisResult] = None  # parsed result (optional)