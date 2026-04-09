"""Pydantic schemas for conversation endpoints."""

from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class ConversationBase(BaseModel):
    """Base schema for conversation."""

    title: str


class ConversationCreate(ConversationBase):
    """Schema for creating a conversation."""

    mode: Optional[str] = "chat"


class ConversationResponse(BaseModel):
    """Schema for conversation response."""

    id: int
    title: str
    mode: str
    created_at: datetime
    updated_at: datetime