"""Chat streaming endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ChatRequest
from app.services.llm import get_llm_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def stream_chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Stream chat response from DeepSeek API.

    Flow:
    1. Validate conversation exists
    2. Save user message
    3. Build messages list from history
    4. Stream LLM response via SSE
    5. Save assistant message after completion
    """
    # Validate conversation exists (use the request-scoped session)
    conversation = db.query(Conversation).filter(
        Conversation.id == body.conversation_id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message (use the request-scoped session)
    user_message = Message(
        conversation_id=body.conversation_id,
        role="user",
        content=body.content,
        message_type="text",
    )
    db.add(user_message)
    db.commit()

    # Build messages list from history (use the request-scoped session)
    history = db.query(Message).filter(
        Message.conversation_id == body.conversation_id
    ).order_by(Message.created_at).all()

    messages = [{"role": msg.role, "content": msg.content} for msg in history]

    # Get conversation_id for later use in generator
    conversation_id = body.conversation_id

    # Get LLM service
    llm = get_llm_service()

    # Generator for SSE streaming
    # NOTE: Must create new session inside generator because the request-scoped
    # session will be closed after StreamingResponse returns
    def generate():
        # Create a new session for the generator
        gen_db = SessionLocal()
        full_content = ""
        try:
            for chunk in llm.stream_chat(messages):
                full_content += chunk
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

            # Save assistant message using the generator's session
            assistant_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_content,
                message_type="text",
            )
            gen_db.add(assistant_message)
            gen_db.commit()
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
        finally:
            # Always close the generator's session
            gen_db.close()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
