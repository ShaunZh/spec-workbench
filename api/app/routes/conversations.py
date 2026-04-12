"""Conversation endpoints with real database operations."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.conversation import Conversation
from app.schemas.conversation import ConversationCreate

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("/")
async def list_conversations(db: Session = Depends(get_db)):
    """Return all conversations from database."""
    conversations = db.query(Conversation).all()
    return conversations


@router.post("/")
async def create_conversation(body: ConversationCreate, db: Session = Depends(get_db)):
    """Create a new conversation."""
    db_conv = Conversation(title=body.title, mode=body.mode or "chat")
    db.add(db_conv)
    db.commit()
    db.refresh(db_conv)
    return db_conv


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Return a conversation by ID."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation