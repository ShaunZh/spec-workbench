"""Pydantic schemas for chat/message endpoints."""

from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


class MessageCreate(BaseModel):
    """Schema for creating a message (user input)."""

    content: str
    role: str = "user"


class MessageResponse(BaseModel):
    """Schema for message response."""

    id: int
    conversation_id: int
    role: str  # user, assistant, system
    content: str
    message_type: str  # text, tool_call, tool_result
    created_at: datetime

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """Schema for list of messages in a conversation."""

    messages: List[MessageResponse]
    total: int


class ChatRequest(BaseModel):
    """Schema for chat request (send message to AI)."""

    conversation_id: int
    content: str
    mode: Optional[str] = "chat"  # chat, analysis


class ChatResponse(BaseModel):
    """Schema for chat response (AI reply)."""

    message: MessageResponse
    artifact_id: Optional[int] = None  # analysis result if mode=analysis