"""Pydantic schemas for conversation endpoints."""

from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


class ConversationCreate(BaseModel):
    """Schema for creating a conversation."""

    title: str
    mode: Optional[str] = "chat"  # chat, analysis


class ConversationResponse(BaseModel):
    """Schema for conversation response."""

    id: int
    title: str
    mode: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2: enable ORM mode


class ConversationListResponse(BaseModel):
    """Schema for list of conversations."""

    conversations: List[ConversationResponse]
    total: int