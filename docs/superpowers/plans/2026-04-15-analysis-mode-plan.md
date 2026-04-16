# Analysis Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Analysis Mode — users create analysis-mode conversations, send requirements, and get structured analysis results (summary, todos, risks, acceptance criteria, open questions) displayed in the right panel.

**Architecture:** Expand existing `/chat/stream` endpoint. When `conversation.mode == "analysis"`, inject a system prompt forcing JSON structured output, parse the response, save as Artifact, and push `analysis_result` SSE event to frontend.

**Tech Stack:** FastAPI, SQLAlchemy (sync), OpenAI SDK (DeepSeek), Next.js 16, TypeScript, SSE

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| **Modify** | `api/app/services/llm.py` | Add `stream_chat_with_mode()` method |
| **Modify** | `api/app/routes/chat.py` | Add analysis logic, JSON parsing, new SSE events |
| **New** | `api/app/schemas/artifact.py` | Artifact request schema (simpler than existing analysis.py) |
| **New** | `api/app/routes/artifacts.py` | Artifacts CRUD routes |
| **Modify** | `api/app/main.py` | Register artifacts router |
| **Modify** | `web/src/lib/api.ts` | New SSE event types, `getArtifacts()` API function, `sendChatMessage` return analysis result |
| **Modify** | `web/src/components/ConversationList.tsx` | Mode selection on new chat |
| **Modify** | `web/src/components/ChatArea.tsx` | Handle `analysis_result` / `analysis_error` / `done` SSE events, callback to parent |
| **Modify** | `web/src/components/AnalysisPanel.tsx` | Bind real data from analysis results |
| **Modify** | `web/src/app/page.tsx` | Manage `analysisResult` state, pass to AnalysisPanel |

---

## Important Context for the Engineer

### Existing Code Patterns
- **LLM service** (`llm.py`): Sync `stream_chat()` method returns `Generator[str, None, None]`. Uses OpenAI SDK pointing to DeepSeek.
- **SSE format** (current `chat.py`): `data: {raw_chunk}\n\n` for content, `data: [DONE]\n\n` for completion, `data: [ERROR] {msg}\n\n` for errors.
- **Artifact model** (`artifact.py`): Already exists with `summary`, `todos_json`, `risks_json`, `acceptance_json`, `questions_json`, `score_json` columns (all Text/nullable).
- **Conversation model**: Already has `mode` column (`"chat"` or `"analysis"`, default `"chat"`).
- **Existing analysis schema** (`analysis.py`): Has `ArtifactResponse` (ORM response) and `AnalysisResult` (parsed content). Reuse these.
- **Frontend SSE** (`api.ts`): `sendChatMessage(conversationId, content, onChunk)` — only handles `chunk` events currently.
- **Next.js version**: Next.js 16 with breaking changes. Check `node_modules/next/dist/docs/` if unsure about conventions.

### Critical Design Decisions
- The spec says `stream_chat_with_mode()` returns `tuple[AsyncGenerator, str | None]` — but the actual `stream_chat()` is **sync** (Generator, not AsyncGenerator). Follow the actual code pattern.
- JSON parsing needs 3-step fallback: pure JSON → markdown code block extraction → first `{...}` block.
- SSE format will change from raw chunks to typed events for analysis mode. Chat mode stays compatible with existing format.

---

### Task 1: Artifact Schema & Routes (Backend)

**Files:**
- Create: `api/app/schemas/artifact.py`
- Create: `api/app/routes/artifacts.py`
- Modify: `api/app/main.py`

- [ ] **Step 1: Create artifact request schema**

Create `api/app/schemas/artifact.py`:

```python
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
```

Note: The response schema already exists in `analysis.py` as `ArtifactResponse`. We reuse it.

- [ ] **Step 2: Create artifacts route**

Create `api/app/routes/artifacts.py`:

```python
"""Artifact CRUD routes."""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.artifact import Artifact
from app.schemas.artifact import ArtifactCreate
from app.schemas.analysis import ArtifactResponse

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.post("", response_model=ArtifactResponse)
def create_artifact(body: ArtifactCreate, db: Session = Depends(get_db)):
    """Create a new analysis result (artifact)."""
    artifact = Artifact(
        conversation_id=body.conversation_id,
        source_message_id=body.source_message_id,
        summary=body.summary,
        todos_json=json.dumps(body.todos),
        risks_json=json.dumps(body.risks),
        acceptance_json=json.dumps(body.acceptance_criteria),
        questions_json=json.dumps(body.open_questions),
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return artifact


@router.get("/conversations/{conversation_id}", response_model=List[ArtifactResponse])
def get_conversation_artifacts(conversation_id: int, db: Session = Depends(get_db)):
    """Get all analysis results for a conversation, ordered by creation time (newest first)."""
    artifacts = (
        db.query(Artifact)
        .filter(Artifact.conversation_id == conversation_id)
        .order_by(Artifact.created_at.desc())
        .all()
    )
    return artifacts
```

- [ ] **Step 3: Register artifacts router in main.py**

Modify `api/app/main.py` — add `artifacts` to imports and include the router:

```python
# Change this line:
from app.routes import health, conversations, chat
# To:
from app.routes import health, conversations, chat, artifacts

# Add after existing routers:
app.include_router(artifacts.router)
```

- [ ] **Step 4: Verify routes are accessible**

Run the backend and check:
```bash
cd api
source .venv/bin/activate
.venv/bin/uvicorn app.main:app --reload
```

Then:
```bash
curl http://localhost:8000/docs
```

Verify `/artifacts` routes appear in the Swagger UI.

- [ ] **Step 5: Commit**

```bash
git add api/app/schemas/artifact.py api/app/routes/artifacts.py api/app/main.py
git commit -m "feat(api): add artifact CRUD routes"
```

---

### Task 2: Mode-Aware LLM Service

**Files:**
- Modify: `api/app/services/llm.py`

- [ ] **Step 1: Write test for `stream_chat_with_mode`**

Create `api/tests/test_llm.py` (create the `tests/` directory if it doesn't exist):

```python
"""Tests for LLM service mode-aware behavior."""

import json
from app.services.llm import ANALYSIS_SYSTEM_PROMPT


def test_analysis_system_prompt_is_valid():
    """Verify the analysis system prompt contains required JSON schema fields."""
    assert "summary" in ANALYSIS_SYSTEM_PROMPT
    assert "todos" in ANALYSIS_SYSTEM_PROMPT
    assert "risks" in ANALYSIS_SYSTEM_PROMPT
    assert "acceptance_criteria" in ANALYSIS_SYSTEM_PROMPT
    assert "open_questions" in ANALYSIS_SYSTEM_PROMPT
    # Verify it asks for JSON output
    assert "json" in ANALYSIS_SYSTEM_PROMPT.lower()


def test_analysis_prompt_injects_system_message():
    """Verify that analysis mode prepends a system message."""
    from app.services.llm import get_llm_service

    messages = [{"role": "user", "content": "I need a login feature"}]
    llm = get_llm_service()
    # Call the mode-aware method
    gen, mode = llm.stream_chat_with_mode(messages, "analysis")

    # Verify system message was prepended
    assert messages[0]["role"] == "system"
    assert "需求分析专家" in messages[0]["content"]
    # Original message is now at index 1
    assert messages[1]["role"] == "user"
    # The method returns same generator (delegated to stream_chat)
    assert mode == "analysis"


def test_chat_mode_does_not_modify_messages():
    """Verify that chat mode does NOT inject system prompt."""
    from app.services.llm import get_llm_service

    messages = [{"role": "user", "content": "Hello"}]
    original_messages = list(messages)  # shallow copy
    llm = get_llm_service()
    gen, mode = llm.stream_chat_with_mode(messages, "chat")

    # Messages should be unchanged
    assert messages == original_messages
    assert mode == "chat"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd api
source .venv/bin/activate
python -m pytest tests/test_llm.py -v
```

Expected: FAIL — `stream_chat_with_mode` and `ANALYSIS_SYSTEM_PROMPT` don't exist yet.

- [ ] **Step 3: Implement `stream_chat_with_mode`**

Add to `api/app/services/llm.py`. Add the system prompt constant and new method:

```python
"""LLM service for DeepSeek API (OpenAI-compatible)."""

import json
from typing import Generator, List, Tuple
from openai import OpenAI

from app.core.config import settings

# System prompt for analysis mode — forces structured JSON output
ANALYSIS_SYSTEM_PROMPT = """\
你是一个专业的需求分析专家。请根据用户输入的需求描述，生成结构化分析结果。
必须以以下 JSON 格式返回（不要包含其他内容，不要使用 markdown 代码块标记）：

{
  "summary": "一段话总结需求核心内容",
  "todos": ["待办事项1", "待办事项2"],
  "risks": [{"title": "风险标题", "description": "风险描述"}],
  "acceptance_criteria": ["验收标准1", "验收标准2"],
  "open_questions": ["待确认问题1", "待确认问题2"]
}

分析时注意：
- 识别需求中的模糊或缺失部分
- 考虑技术可行性和业务风险
- 验收标准应具体可测量
- 如果用户输入不是需求描述（如简单问候），仍按格式返回合理内容
"""


class LLMService:
    """Service for interacting with DeepSeek LLM API."""

    def __init__(self):
        """Initialize OpenAI client pointing to DeepSeek."""
        if not settings.deepseek_api_key:
            raise ValueError("DEEPSEEK_API_KEY is not configured")

        self.client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
        self.model = settings.deepseek_model

    def stream_chat(self, messages: List[dict]) -> Generator[str, None, None]:
        """
        Stream chat completion from DeepSeek API.

        Args:
            messages: List of message dicts with 'role' and 'content'

        Yields:
            str: Each content chunk from the streaming response
        """
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def stream_chat_with_mode(
        self, messages: List[dict], conversation_mode: str
    ) -> Tuple[Generator[str, None, None], str]:
        """
        Stream chat with optional analysis system prompt injection.

        Args:
            messages: List of message dicts (will be mutated if mode=="analysis")
            conversation_mode: "chat" or "analysis"

        Returns:
            Tuple of (stream generator, mode label)
        """
        if conversation_mode == "analysis":
            messages.insert(0, {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT})

        return self.stream_chat(messages), conversation_mode
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd api
source .venv/bin/activate
python -m pytest tests/test_llm.py -v
```

Expected: PASS — all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add api/app/services/llm.py api/tests/test_llm.py
git commit -m "feat(api): add mode-aware LLM method with analysis system prompt"
```

---

### Task 3: JSON Parser Utility

**Files:**
- Create: `api/app/services/analysis.py`
- Create: `api/tests/test_analysis.py`

- [ ] **Step 1: Write tests for JSON parser**

Create `api/tests/test_analysis.py`:

```python
"""Tests for analysis JSON parser."""

from app.services.analysis import parse_analysis_json


def test_parse_pure_json():
    """Parse a pure JSON string."""
    raw = '{"summary": "test", "todos": ["a"], "risks": [], "acceptance_criteria": ["x"], "open_questions": []}'
    result = parse_analysis_json(raw)
    assert result["summary"] == "test"
    assert result["todos"] == ["a"]


def test_parse_markdown_code_block():
    """Parse JSON wrapped in markdown code block."""
    raw = '''Some text before
```json
{"summary": "test", "todos": ["a"], "risks": [], "acceptance_criteria": ["x"], "open_questions": []}
```
Some text after'''
    result = parse_analysis_json(raw)
    assert result["summary"] == "test"


def test_parse_json_with_prefix():
    """Parse JSON with prefix text."""
    raw = '''Here is the analysis:
{"summary": "test", "todos": ["a"], "risks": [], "acceptance_criteria": ["x"], "open_questions": []}'''
    result = parse_analysis_json(raw)
    assert result["summary"] == "test"


def test_parse_returns_none_on_failure():
    """Return None when no valid JSON found."""
    raw = "This is just plain text with no JSON"
    result = parse_analysis_json(raw)
    assert result is None


def test_parse_handles_nested_json():
    """Parse JSON with nested objects in risks."""
    raw = '{"summary": "ok", "todos": [], "risks": [{"title": "risk1", "description": "desc1"}], "acceptance_criteria": [], "open_questions": []}'
    result = parse_analysis_json(raw)
    assert result["risks"] == [{"title": "risk1", "description": "desc1"}]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd api
source .venv/bin/activate
python -m pytest tests/test_analysis.py -v
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement JSON parser**

Create `api/app/services/analysis.py`:

```python
"""Analysis JSON parsing utilities."""

import json
import re
from typing import Optional


def parse_analysis_json(raw: str) -> Optional[dict]:
    """
    Parse structured analysis JSON from LLM response.

    Tries in order:
    1. Pure JSON via json.loads
    2. Markdown code block (```json ... ```)
    3. First balanced JSON object ({ ... })

    Returns parsed dict or None if no valid JSON found.
    """
    # Try 1: pure JSON
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        pass

    # Try 2: markdown code block
    match = re.search(r"```json\s*\n(.*?)\n```", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except (json.JSONDecodeError, ValueError):
            pass

    # Try 3: first balanced JSON object
    # Find first { and last }, attempt parse
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw[start : end + 1])
        except (json.JSONDecodeError, ValueError):
            pass

    return None
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd api
source .venv/bin/activate
python -m pytest tests/test_analysis.py -v
```

Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add api/app/services/analysis.py api/tests/test_analysis.py
git commit -m "feat(api): add analysis JSON parser with fallback strategies"
```

---

### Task 4: Chat Endpoint Analysis Logic

**Files:**
- Modify: `api/app/routes/chat.py`

- [ ] **Step 1: Modify chat.py to support analysis mode**

Replace the current `chat.py` with the enhanced version. Key changes:
- Get `conversation.mode` before streaming
- Use `stream_chat_with_mode` instead of `stream_chat`
- After stream ends, parse JSON (analysis mode) and save artifact
- Send typed SSE events: `data: {"type":"chunk","content":"..."}` for analysis, `data: {"type":"analysis_result","data":{...}}`, `data: {"type":"analysis_error","message":"..."}`, `data: {"type":"done"}`

Full replacement of `api/app/routes/chat.py`:

```python
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
    # Validate conversation exists
    conversation = db.query(Conversation).filter(
        Conversation.id == body.conversation_id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Determine mode from conversation
    mode = conversation.mode

    # Save user message
    user_message = Message(
        conversation_id=body.conversation_id,
        role="user",
        content=body.content,
        message_type="text",
    )
    db.add(user_message)
    db.commit()

    # Build messages list from history
    history = db.query(Message).filter(
        Message.conversation_id == body.conversation_id
    ).order_by(Message.created_at).all()

    messages = [{"role": msg.role, "content": msg.content} for msg in history]
    conversation_id = body.conversation_id
    user_message_id = user_message.id

    # Get LLM service
    llm = get_llm_service()

    # Use mode-aware method
    stream_gen, resolved_mode = llm.stream_chat_with_mode(messages, mode)

    def generate():
        gen_db = SessionLocal()
        full_content = ""
        try:
            for chunk in stream_gen:
                full_content += chunk
                # Send typed event for analysis mode, raw chunk for chat mode
                if resolved_mode == "analysis":
                    event = json.dumps({"type": "chunk", "content": chunk})
                    yield f"data: {event}\n\n"
                else:
                    yield f"data: {chunk}\n\n"

            # Analysis mode: parse and save artifact
            if resolved_mode == "analysis":
                parsed = parse_analysis_json(full_content)
                if parsed:
                    try:
                        artifact = {
                            "summary": parsed.get("summary", ""),
                            "todos": parsed.get("todos", []),
                            "risks": parsed.get("risks", []),
                            "acceptance_criteria": parsed.get("acceptance_criteria", []),
                            "open_questions": parsed.get("open_questions", []),
                        }
                        artifact_obj = Message(
                            conversation_id=conversation_id,
                            role="assistant",
                            content=full_content,
                            message_type="structured",
                        )
                        gen_db.add(artifact_obj)
                        gen_db.commit()
                        gen_db.refresh(artifact_obj)
                        msg_id = artifact_obj.id

                        # Save to Artifact table
                        from app.models.artifact import Artifact
                        art = Artifact(
                            conversation_id=conversation_id,
                            source_message_id=msg_id,
                            summary=artifact["summary"],
                            todos_json=json.dumps(artifact["todos"]),
                            risks_json=json.dumps(artifact["risks"]),
                            acceptance_json=json.dumps(artifact["acceptance_criteria"]),
                            questions_json=json.dumps(artifact["open_questions"]),
                        )
                        gen_db.add(art)
                        gen_db.commit()

                        # Send analysis_result event
                        event = json.dumps({"type": "analysis_result", "data": artifact})
                        yield f"data: {event}\n\n"
                    except Exception as e:
                        event = json.dumps({"type": "analysis_error", "message": str(e)})
                        yield f"data: {event}\n\n"
                else:
                    event = json.dumps({"type": "analysis_error", "message": "Failed to parse analysis result"})
                    yield f"data: {event}\n\n"

            else:
                # Chat mode: save assistant message (existing behavior)
                assistant_message = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_content,
                    message_type="text",
                )
                gen_db.add(assistant_message)
                gen_db.commit()

            # Send done event
            event = json.dumps({"type": "done"})
            yield f"data: {event}\n\n"

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
```

Note: The chat mode now also sends `data: [DONE]\n\n` replaced with `data: {"type":"done"}\n\n`. The frontend needs to handle both formats for backwards compatibility.

Wait — let me reconsider. The spec says to keep chat mode compatible. Let me adjust:

For **chat mode**: keep existing raw chunk format (`data: {chunk}\n\n`) and `data: [DONE]\n\n` for backwards compatibility.
For **analysis mode**: use typed events (`data: {"type":"chunk","content":"..."}`, etc.).

Revised relevant section of the generator:

```python
            for chunk in stream_gen:
                full_content += chunk
                if resolved_mode == "analysis":
                    event = json.dumps({"type": "chunk", "content": chunk})
                    yield f"data: {event}\n\n"
                else:
                    yield f"data: {chunk}\n\n"

            # ... (rest same)

            # Send done event — typed for analysis, [DONE] for chat
            if resolved_mode == "analysis":
                event = json.dumps({"type": "done"})
                yield f"data: {event}\n\n"
            else:
                yield "data: [DONE]\n\n"
```

- [ ] **Step 2: Manual test — chat mode still works**

```bash
cd api
source .venv/bin/activate
.venv/bin/uvicorn app.main:app --reload
```

In another terminal, create a chat-mode conversation and send a message:
```bash
# Create conversation
curl -X POST http://localhost:8000/conversations \
  -H "Content-Type: application/json" \
  -d '{"title": "test chat", "mode": "chat"}'

# Send message (replace CONV_ID)
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"conversation_id": CONV_ID, "content": "Hello"}' \
  -N
```

Expected: Raw chunks streaming as before, `data: [DONE]\n\n` at end.

- [ ] **Step 3: Commit**

```bash
git add api/app/routes/chat.py
git commit -m "feat(api): add analysis mode logic to chat stream endpoint"
```

---

### Task 5: Frontend SSE Event Handling

**Files:**
- Modify: `web/src/lib/api.ts`

- [ ] **Step 1: Update API types and SSE handler**

Modify `web/src/lib/api.ts` — add types and update `sendChatMessage` to handle both old and new SSE formats:

```typescript
// Add new types at the top, after existing interfaces:

export interface AnalysisResult {
  summary: string;
  todos: string[];
  risks: { title: string; description: string }[];
  acceptance_criteria: string[];
  open_questions: string[];
}

export type SSEEvent =
  | { type: "chunk"; content: string }
  | { type: "analysis_result"; data: AnalysisResult }
  | { type: "analysis_error"; message: string }
  | { type: "done" };

// Update sendChatMessage signature and implementation:

export async function sendChatMessage(
  conversationId: number,
  content: string,
  onChunk: (chunk: string) => void,
  onAnalysisResult?: (result: AnalysisResult) => void,
  onError?: (message: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, content }),
  });

  if (!res.ok) {
    throw new Error("Failed to send message");
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          return;
        }
        if (data.startsWith("[ERROR]")) {
          throw new Error(data.slice(8));
        }

        // Try parsing as typed event (analysis mode)
        try {
          const parsed: SSEEvent = JSON.parse(data);
          if (parsed.type === "chunk") {
            onChunk(parsed.content);
          } else if (parsed.type === "analysis_result" && onAnalysisResult) {
            onAnalysisResult(parsed.data);
          } else if (parsed.type === "analysis_error" && onError) {
            onError(parsed.message);
          } else if (parsed.type === "done") {
            return;
          }
        } catch {
          // Not JSON — treat as raw chunk (chat mode)
          onChunk(data);
        }
      }
    }
  }
}

// Add new API function:
export async function getArtifacts(conversationId: number): Promise<ArtifactResponse[]> {
  const res = await fetch(`${API_BASE}/artifacts/conversations/${conversationId}`);
  if (!res.ok) return [];
  return res.json();
}

export interface ArtifactResponse {
  id: number;
  conversation_id: number;
  summary: string | null;
  todos_json: string | null;
  risks_json: string | null;
  acceptance_json: string | null;
  questions_json: string | null;
  score_json: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
cd web
git add src/lib/api.ts
git commit -m "feat(web): add typed SSE event handling and artifacts API"
```

---

### Task 6: Conversation Mode Selection UI

**Files:**
- Modify: `web/src/components/ConversationList.tsx`

- [ ] **Step 1: Add mode selection to new chat flow**

Modify `web/src/components/ConversationList.tsx` — add a simple inline mode picker. Replace `handleNewChat`:

```typescript
import { useState, useEffect } from "react";
import {
  getConversations,
  createConversation,
  Conversation,
} from "@/lib/api";

interface ConversationListProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNewConversation?: (conv: Conversation) => void;  // new prop
}

export function ConversationList({
  selectedId,
  onSelect,
  onNewConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModePicker, setShowModePicker] = useState(false);  // new state

  // ... (fetchConversations unchanged)

  const handleNewChatClick = () => {
    setShowModePicker(true);  // Show mode picker instead of creating immediately
  };

  const handleCreateConversation = async (mode: string) => {
    setShowModePicker(false);
    try {
      const newConv = await createConversation("New Chat", mode);
      setConversations([newConv, ...conversations]);
      onSelect(newConv.id);
      onNewConversation?.(newConv);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  // ... (formatTime unchanged)

  return (
    <div className="w-[260px] bg-[#14141f] border-r border-[#2a2a3e] flex flex-col">
      <div className="m-3">
        {!showModePicker ? (
          <div
            className="p-2 bg-[#2a2a3e] border border-dashed border-[#3a3a5e] rounded-md text-[#aaa] text-sm text-center cursor-pointer hover:bg-[#3a3a5e]"
            onClick={handleNewChatClick}
          >
            + New Chat
          </div>
        ) : (
          <div className="p-2 bg-[#2a2a3e] border border-dashed border-[#3a3a5e] rounded-md text-[#aaa] text-xs">
            <div className="mb-2 font-medium">Choose mode:</div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-1.5 bg-[#7c6ff7] text-white rounded cursor-pointer hover:bg-[#6c5ee7]"
                onClick={() => handleCreateConversation("chat")}
              >
                Chat
              </button>
              <button
                className="flex-1 py-1.5 bg-[#2a2a3e] border border-[#7c6ff7] text-[#aaa] rounded cursor-pointer hover:bg-[#3a3a5e]"
                onClick={() => handleCreateConversation("analysis")}
              >
                Analysis
              </button>
            </div>
            <button
              className="w-full mt-2 py-1 text-[#666] cursor-pointer hover:text-[#888]"
              onClick={() => setShowModePicker(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {/* ... rest unchanged */}
    </div>
  );
}
```

- [ ] **Step 2: Update page.tsx to pass new prop**

In `web/src/app/page.tsx`, update the `ConversationList` usage:

```tsx
<ConversationList
  selectedId={selectedId}
  onSelect={setSelectedId}
  onNewConversation={(conv) => {
    // Clear analysis state when new conversation is created
    setAnalysisResult(null);
  }}
/>
```

- [ ] **Step 3: Commit**

```bash
cd web
git add src/components/ConversationList.tsx src/app/page.tsx
git commit -m "feat(web): add mode selection when creating new conversation"
```

---

### Task 7: ChatArea SSE Event Handling

**Files:**
- Modify: `web/src/components/ChatArea.tsx`

- [ ] **Step 1: Update ChatArea to handle analysis events**

Modify `web/src/components/ChatArea.tsx`:

1. Update the interface:
```typescript
interface ChatAreaProps {
  conversation: Conversation | null;
  onMessageSent?: () => void;
  onAnalysisResult?: (result: AnalysisResult) => void;  // new
  onAnalysisError?: (message: string) => void;           // new
}
```

2. Update imports:
```typescript
import { Conversation, Message, sendChatMessage, getConversationMessages, AnalysisResult } from "@/lib/api";
```

3. Update `handleSend` to pass callbacks:
```typescript
      await sendChatMessage(
        conversation.id,
        content,
        (chunk) => {
          fullContentRef.current += chunk;
          setStreamingContent(fullContentRef.current);
        },
        (result) => {
          onAnalysisResult?.(result);
        },
        (errorMsg) => {
          onAnalysisError?.(errorMsg);
        }
      );
```

- [ ] **Step 2: Commit**

```bash
cd web
git add src/components/ChatArea.tsx
git commit -m "feat(web): handle analysis_result and analysis_error SSE events"
```

---

### Task 8: AnalysisPanel Data Binding

**Files:**
- Modify: `web/src/components/AnalysisPanel.tsx`

- [ ] **Step 1: Bind AnalysisPanel to real data**

Replace `web/src/components/AnalysisPanel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { AnalysisResult, getArtifacts, ArtifactResponse } from "@/lib/api";

interface AnalysisPanelProps {
  conversationId: number | null;
  liveResult: AnalysisResult | null;
}

export function AnalysisPanel({ conversationId, liveResult }: AnalysisPanelProps) {
  const [latestArtifact, setLatestArtifact] = useState<ArtifactResponse | null>(null);

  // Load artifact when conversation changes or live result is set
  useEffect(() => {
    if (liveResult) {
      // Live result from current session takes priority
      return;
    }

    if (!conversationId) {
      setLatestArtifact(null);
      return;
    }

    const loadArtifacts = async () => {
      try {
        const artifacts = await getArtifacts(conversationId);
        setLatestArtifact(artifacts.length > 0 ? artifacts[0] : null);
      } catch {
        setLatestArtifact(null);
      }
    };

    loadArtifacts();
  }, [conversationId, liveResult]);

  // Determine source of analysis data
  const hasLiveResult = liveResult !== null;
  const isEmpty = !hasLiveResult && !latestArtifact;

  if (!conversationId) {
    return (
      <div className="w-[320px] bg-[#14141f] border-l border-[#2a2a3e] overflow-y-auto">
        <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
          Analysis Results
        </div>
        <div className="flex items-center justify-center h-64 text-[#555] text-sm">
          Select a conversation
        </div>
      </div>
    );
  }

  return (
    <div className="w-[320px] bg-[#14141f] border-l border-[#2a2a3e] overflow-y-auto">
      <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
        Analysis Results
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-64 text-[#555] text-sm text-center px-4">
          <div className="mb-2">No analysis yet</div>
          <div className="text-xs text-[#444]">
            Send a message in analysis mode to generate results
          </div>
        </div>
      )}

      {hasLiveResult && liveResult && (
        <LiveAnalysisCards result={liveResult} />
      )}

      {!hasLiveResult && latestArtifact && (
        <ArtifactAnalysisCards artifact={latestArtifact} />
      )}

      {/* Placeholders for future features */}
      <div className="m-3 p-5 bg-[#1a1a2e] border border-dashed border-[#2a2a3e] rounded-lg text-center">
        <div className="text-xs text-[#666] mb-1">Completeness Score</div>
        <div className="text-2xl font-bold text-[#333]">--</div>
      </div>
      <div className="m-3 p-2 bg-transparent border border-[#2a2a3e] rounded-md text-[#555] text-xs text-center cursor-pointer">
        Export Markdown
      </div>
    </div>
  );
}

// Sub-components for rendering cards

function LiveAnalysisCards({ result }: { result: AnalysisResult }) {
  return (
    <>
      <AnalysisCard title="Summary">
        <p className="text-xs text-[#ccc]">{result.summary}</p>
      </AnalysisCard>

      <AnalysisCard title="Todos">
        <ul className="text-xs text-[#ccc] space-y-1">
          {result.todos.map((todo, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#7c6ff7]">{i + 1}.</span>
              <span>{todo}</span>
            </li>
          ))}
          {result.todos.length === 0 && <li className="text-[#555] italic">No todos</li>}
        </ul>
      </AnalysisCard>

      <AnalysisCard title="Risks">
        <div className="space-y-2">
          {result.risks.map((risk, i) => (
            <div key={i} className="p-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded">
              <div className="text-xs font-medium text-[#e0e0e0]">{risk.title}</div>
              <div className="text-xs text-[#888] mt-1">{risk.description}</div>
            </div>
          ))}
          {result.risks.length === 0 && <div className="text-xs text-[#555] italic">No risks identified</div>}
        </div>
      </AnalysisCard>

      <AnalysisCard title="Acceptance Criteria">
        <ul className="text-xs text-[#ccc] space-y-1">
          {result.acceptance_criteria.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#7c6ff7]">☐</span>
              <span>{c}</span>
            </li>
          ))}
          {result.acceptance_criteria.length === 0 && <li className="text-[#555] italic">No criteria</li>}
        </ul>
      </AnalysisCard>

      <AnalysisCard title="Open Questions">
        <ul className="text-xs text-[#ccc] space-y-1">
          {result.open_questions.map((q, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#f59e0b]">?</span>
              <span>{q}</span>
            </li>
          ))}
          {result.open_questions.length === 0 && <li className="text-[#555] italic">No questions</li>}
        </ul>
      </AnalysisCard>
    </>
  );
}

function ArtifactAnalysisCards({ artifact }: { artifact: ArtifactResponse }) {
  const todos = artifact.todos_json ? JSON.parse(artifact.todos_json) : [];
  const risks = artifact.risks_json ? JSON.parse(artifact.risks_json) : [];
  const acceptance = artifact.acceptance_json ? JSON.parse(artifact.acceptance_json) : [];
  const questions = artifact.questions_json ? JSON.parse(artifact.questions_json) : [];

  return (
    <>
      {artifact.summary && (
        <AnalysisCard title="Summary">
          <p className="text-xs text-[#ccc]">{artifact.summary}</p>
        </AnalysisCard>
      )}
      <AnalysisCard title="Todos">
        <ul className="text-xs text-[#ccc] space-y-1">
          {todos.map((todo: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#7c6ff7]">{i + 1}.</span>
              <span>{todo}</span>
            </li>
          ))}
          {todos.length === 0 && <li className="text-[#555] italic">No todos</li>}
        </ul>
      </AnalysisCard>
      <AnalysisCard title="Risks">
        <div className="space-y-2">
          {risks.map((risk: { title: string; description: string }, i: number) => (
            <div key={i} className="p-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded">
              <div className="text-xs font-medium text-[#e0e0e0]">{risk.title}</div>
              <div className="text-xs text-[#888] mt-1">{risk.description}</div>
            </div>
          ))}
          {risks.length === 0 && <div className="text-xs text-[#555] italic">No risks identified</div>}
        </div>
      </AnalysisCard>
      <AnalysisCard title="Acceptance Criteria">
        <ul className="text-xs text-[#ccc] space-y-1">
          {acceptance.map((c: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#7c6ff7]">☐</span>
              <span>{c}</span>
            </li>
          ))}
          {acceptance.length === 0 && <li className="text-[#555] italic">No criteria</li>}
        </ul>
      </AnalysisCard>
      <AnalysisCard title="Open Questions">
        <ul className="text-xs text-[#ccc] space-y-1">
          {questions.map((q: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#f59e0b]">?</span>
              <span>{q}</span>
            </li>
          ))}
          {questions.length === 0 && <li className="text-[#555] italic">No questions</li>}
        </ul>
      </AnalysisCard>
    </>
  );
}

function AnalysisCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="m-3 p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
      <div className="text-xs font-semibold text-[#7c6ff7] uppercase tracking-wide mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd web
git add src/components/AnalysisPanel.tsx
git commit -m "feat(web): bind AnalysisPanel to real analysis data"
```

---

### Task 9: Wire Everything in Page Component

**Files:**
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Update page.tsx to manage analysis state**

Replace `web/src/app/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { ConversationList } from "@/components/ConversationList";
import { ChatArea } from "@/components/ChatArea";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { getConversation, Conversation, AnalysisResult } from "@/lib/api";

export default function Home() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Fetch conversation details when selectedId changes
  useEffect(() => {
    if (selectedId === null) {
      setSelectedConversation(null);
      setAnalysisResult(null);
      setAnalysisError(null);
      return;
    }

    const fetchConversation = async () => {
      try {
        const data = await getConversation(selectedId);
        setSelectedConversation(data);
        setAnalysisResult(null);   // Clear live result on conversation switch
        setAnalysisError(null);
      } catch (error) {
        console.error("Failed to fetch conversation:", error);
        setSelectedConversation(null);
      }
    };

    fetchConversation();
  }, [selectedId]);

  // Refresh conversation after message sent
  const handleMessageSent = async () => {
    if (selectedId) {
      try {
        const data = await getConversation(selectedId);
        setSelectedConversation(data);
      } catch (error) {
        console.error("Failed to refresh conversation:", error);
      }
    }
  };

  return (
    <main className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-12 bg-[#1a1a2e] border-b border-[#2a2a3e] flex items-center px-4">
        <span className="font-bold text-[#7c6ff7]">ReqPilot</span>
        <div className="ml-auto flex gap-2">
          {selectedConversation?.mode === "analysis" && (
            <span className="text-xs text-[#7c6ff7] px-2 py-1 bg-[#2a2a4e] rounded">
              Analysis Mode
            </span>
          )}
        </div>
      </div>
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ConversationList
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNewConversation={() => {
            setAnalysisResult(null);
            setAnalysisError(null);
          }}
        />
        <ChatArea
          conversation={selectedConversation}
          onMessageSent={handleMessageSent}
          onAnalysisResult={(result) => {
            setAnalysisResult(result);
            setAnalysisError(null);
          }}
          onAnalysisError={(msg) => {
            setAnalysisError(msg);
          }}
        />
        <AnalysisPanel
          conversationId={selectedId}
          liveResult={analysisResult}
        />
      </div>
      {/* Analysis error toast */}
      {analysisError && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-[#5a2727] border border-[#8a3a3a] rounded-lg text-xs text-[#e0e0e0]">
          Analysis failed: {analysisError}
          <button
            className="ml-2 text-[#f59e0b] underline"
            onClick={() => setAnalysisError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd web
git add src/app/page.tsx
git commit -m "feat(web): wire analysis state management in page component"
```

---

### Task 10: Integration Test & Smoke Test

**Files:** No changes — manual verification only.

- [ ] **Step 1: Start backend**

```bash
cd api
source .venv/bin/activate
.venv/bin/uvicorn app.main:app --reload
```

- [ ] **Step 2: Start frontend**

```bash
cd web
npm run dev
```

- [ ] **Step 3: Smoke test — chat mode**

1. Open http://localhost:3000
2. Click "New Chat" → choose "Chat" mode
3. Send a message: "What is 2+2?"
4. Verify: Response streams normally, no analysis panel shows

- [ ] **Step 4: Smoke test — analysis mode**

1. Click "New Chat" → choose "Analysis" mode
2. Send a requirement: "I need a user login feature with email and password, supporting password reset and account lockout after 5 failed attempts"
3. Verify:
   - Chat area shows streaming response
   - After stream ends, AnalysisPanel populates with Summary, Todos, Risks, etc.
   - Top bar shows "Analysis Mode" badge

- [ ] **Step 5: Smoke test — artifact persistence**

1. Refresh the page
2. Re-select the same conversation
3. Verify: AnalysisPanel loads the previous analysis result from database

- [ ] **Step 6: Smoke test — error handling**

1. Stop the backend server
2. Send a message in analysis mode
3. Verify: Error toast appears, dismissible

---

### Task 11: Final Commit & Documentation

- [ ] **Step 1: Run all tests**

```bash
cd api
source .venv/bin/activate
python -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat: complete Analysis Mode — structured output, artifact persistence, analysis panel"
```
