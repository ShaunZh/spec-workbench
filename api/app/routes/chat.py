"""Chat streaming endpoint."""

import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ChatRequest
from app.services.llm import get_llm_service
from app.services.analysis import parse_analysis_json

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def stream_chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Stream chat response from DeepSeek API.

    In analysis mode:
    - Injects analysis system prompt
    - Parses JSON from response after stream ends
    - Saves artifact to DB
    - Sends analysis_result SSE event
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == body.conversation_id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    mode = conversation.mode

    user_message = Message(
        conversation_id=body.conversation_id,
        role="user",
        content=body.content,
        message_type="text",
    )
    db.add(user_message)
    db.commit()

    history = db.query(Message).filter(
        Message.conversation_id == body.conversation_id
    ).order_by(Message.created_at).all()

    messages = [{"role": msg.role, "content": msg.content} for msg in history]
    conversation_id = body.conversation_id

    llm = get_llm_service()
    stream_gen, resolved_mode = llm.stream_chat_with_mode(messages, mode)

    def generate():
        gen_db = SessionLocal()
        full_content = ""
        try:
            for chunk in stream_gen:
                full_content += chunk
                if resolved_mode == "analysis":
                    event = json.dumps({"type": "chunk", "content": chunk})
                    yield f"data: {event}\n\n"
                else:
                    yield f"data: {chunk}\n\n"

            if resolved_mode == "analysis":
                parsed = parse_analysis_json(full_content)
                if parsed:
                    try:
                        from app.models.artifact import Artifact

                        artifact_data = {
                            "summary": parsed.get("summary", ""),
                            "todos": parsed.get("todos", []),
                            "risks": parsed.get("risks", []),
                            "acceptance_criteria": parsed.get("acceptance_criteria", []),
                            "open_questions": parsed.get("open_questions", []),
                        }

                        assistant_message = Message(
                            conversation_id=conversation_id,
                            role="assistant",
                            content=full_content,
                            message_type="structured",
                        )
                        gen_db.add(assistant_message)
                        gen_db.commit()
                        gen_db.refresh(assistant_message)
                        msg_id = assistant_message.id

                        art = Artifact(
                            conversation_id=conversation_id,
                            source_message_id=msg_id,
                            summary=artifact_data["summary"],
                            todos_json=json.dumps(artifact_data["todos"]),
                            risks_json=json.dumps(artifact_data["risks"]),
                            acceptance_json=json.dumps(artifact_data["acceptance_criteria"]),
                            questions_json=json.dumps(artifact_data["open_questions"]),
                        )
                        gen_db.add(art)
                        gen_db.commit()

                        event = json.dumps({"type": "analysis_result", "data": artifact_data})
                        yield f"data: {event}\n\n"
                    except Exception as e:
                        event = json.dumps({"type": "analysis_error", "message": str(e)})
                        yield f"data: {event}\n\n"
                else:
                    event = json.dumps({"type": "analysis_error", "message": "Failed to parse analysis result"})
                    yield f"data: {event}\n\n"

            else:
                assistant_message = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_content,
                    message_type="text",
                )
                gen_db.add(assistant_message)
                gen_db.commit()

            if resolved_mode == "analysis":
                event = json.dumps({"type": "done"})
                yield f"data: {event}\n\n"
            else:
                yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
        finally:
            gen_db.close()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
