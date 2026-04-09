"""Conversation endpoints (placeholder with mock data)."""

from datetime import datetime
from fastapi import APIRouter
from app.schemas.conversation import ConversationCreate, ConversationResponse

router = APIRouter(prefix="/conversations", tags=["conversations"])

# Mock data for Day 1
MOCK_CONVERSATIONS = [
    ConversationResponse(
        id=1,
        title="User authentication flow",
        mode="analysis",
        created_at=datetime(2026, 4, 9, 10, 30),
        updated_at=datetime(2026, 4, 9, 10, 35),
    ),
    ConversationResponse(
        id=2,
        title="Bug: checkout timeout",
        mode="chat",
        created_at=datetime(2026, 4, 8, 14, 0),
        updated_at=datetime(2026, 4, 8, 14, 30),
    ),
    ConversationResponse(
        id=3,
        title="Dashboard redesign notes",
        mode="chat",
        created_at=datetime(2026, 4, 7, 9, 0),
        updated_at=datetime(2026, 4, 7, 9, 15),
    ),
]


@router.get("/")
async def list_conversations():
    """Return mock conversation list."""
    return MOCK_CONVERSATIONS


@router.post("/")
async def create_conversation(body: ConversationCreate):
    """Create a mock conversation (placeholder)."""
    new_id = len(MOCK_CONVERSATIONS) + 1
    now = datetime.utcnow()
    return ConversationResponse(
        id=new_id,
        title=body.title,
        mode=body.mode or "chat",
        created_at=now,
        updated_at=now,
    )


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: int):
    """Return a mock conversation by ID."""
    for conv in MOCK_CONVERSATIONS:
        if conv.id == conversation_id:
            return conv
    return {"error": "Conversation not found"}