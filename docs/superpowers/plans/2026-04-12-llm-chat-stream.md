# LLM Chat Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement streaming chat interaction - user sends message → DeepSeek API streams response → real-time display and save to database.

**Architecture:** Backend uses OpenAI SDK (compatible with DeepSeek) to stream LLM responses via SSE. Frontend uses fetch + ReadableStream to handle SSE and display chunks in real-time.

**Tech Stack:** FastAPI + OpenAI SDK + SQLAlchemy (backend); Next.js + fetch SSE (frontend)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `api/.env.example` | Create | Reference config without secrets |
| `api/requirements.txt` | Modify | Add openai dependency |
| `api/app/core/config.py` | Modify | Add DeepSeek config fields |
| `api/app/services/__init__.py` | Create | Services package init |
| `api/app/services/llm.py` | Create | LLM streaming service |
| `api/app/routes/chat.py` | Create | SSE chat endpoint |
| `api/app/main.py` | Modify | Register chat router |
| `web/src/lib/api.ts` | Modify | Add sendChatMessage SSE client |
| `web/src/components/ChatArea.tsx` | Modify | Streaming display + input handling |

---

### Task 1: Backend Configuration Setup

**Files:**
- Create: `api/.env.example`
- Modify: `api/app/core/config.py:21-23`
- Modify: `api/requirements.txt`

- [ ] **Step 1: Create .env.example file**

Create `api/.env.example`:
```env
DEEPSEEK_API_KEY=your-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

- [ ] **Step 2: Update config.py with DeepSeek fields**

Replace lines 21-23 in `api/app/core/config.py`:

```python
    # Database
    database_url: str = "sqlite:///./reqpilot.db"

    # DeepSeek LLM (OpenAI-compatible)
    deepseek_api_key: Optional[str] = None
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
```

- [ ] **Step 3: Add openai dependency to requirements.txt**

Modify `api/requirements.txt`:
```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic-settings>=2.6.0
sqlalchemy>=2.0.0
openai>=1.0.0
```

- [ ] **Step 4: Install the new dependency**

Run: `cd api && .venv/bin/pip install openai>=1.0.0`

Expected: Successfully installed openai package

- [ ] **Step 5: Verify config loads correctly**

Run: `cd api && .venv/bin/python -c "from app.core.config import settings; print(settings.deepseek_base_url)"`

Expected: `https://api.deepseek.com`

---

### Task 2: Create LLM Service

**Files:**
- Create: `api/app/services/__init__.py`
- Create: `api/app/services/llm.py`

- [ ] **Step 1: Create services package init**

Create `api/app/services/__init__.py`:
```python
"""Services package."""
```

- [ ] **Step 2: Create LLM service file**

Create `api/app/services/llm.py`:
```python
"""LLM service for DeepSeek API (OpenAI-compatible)."""

from typing import Generator, List
from openai import OpenAI

from app.core.config import settings


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


# Singleton instance
llm_service: LLMService = None


def get_llm_service() -> LLMService:
    """Get or create LLM service instance."""
    global llm_service
    if llm_service is None:
        llm_service = LLMService()
    return llm_service
```

- [ ] **Step 3: Verify LLM service can be imported**

Run: `cd api && .venv/bin/python -c "from app.services.llm import LLMService; print('LLMService imported successfully')"`

Expected: `LLMService imported successfully`

---

### Task 3: Create Chat Streaming Route

**Files:**
- Create: `api/app/routes/chat.py`
- Modify: `api/app/main.py:8,29`

- [ ] **Step 1: Create chat route file**

Create `api/app/routes/chat.py`:
```python
"""Chat streaming endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
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
    # Validate conversation exists
    conversation = db.query(Conversation).filter(
        Conversation.id == body.conversation_id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    user_message = Message(
        conversation_id=body.conversation_id,
        role="user",
        content=body.content,
        message_type="text",
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # Build messages list from history
    history = db.query(Message).filter(
        Message.conversation_id == body.conversation_id
    ).order_by(Message.created_at).all()

    messages = [{"role": msg.role, "content": msg.content} for msg in history]

    # Get LLM service
    llm = get_llm_service()

    # Generator for SSE streaming
    def generate():
        full_content = ""
        try:
            for chunk in llm.stream_chat(messages):
                full_content += chunk
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

            # Save assistant message after streaming completes
            assistant_message = Message(
                conversation_id=body.conversation_id,
                role="assistant",
                content=full_content,
                message_type="text",
            )
            db.add(assistant_message)
            db.commit()
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
```

- [ ] **Step 2: Register chat router in main.py**

Modify `api/app/main.py`:

Line 8 - add chat import:
```python
from app.routes import health, conversations, chat
```

After line 29 - add chat router:
```python
app.include_router(chat.router)
```

Full modified `api/app/main.py`:
```python
"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.models import Conversation, Message, Artifact
from app.routes import health, conversations, chat

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
Base.metadata.create_all(bind=engine)

# Mount routers
app.include_router(health.router)
app.include_router(conversations.router)
app.include_router(chat.router)
```

- [ ] **Step 3: Verify server starts with new route**

Run: `cd api && .venv/bin/uvicorn app.main:app --reload &`

Expected: Server starts successfully, no import errors

- [ ] **Step 4: Verify route is registered**

Run: `curl http://localhost:8000/docs`

Expected: OpenAPI docs show `/chat/stream` POST endpoint

---

### Task 4: Frontend SSE Client

**Files:**
- Modify: `web/src/lib/api.ts:1-34`

- [ ] **Step 1: Add Message type and sendChatMessage function**

Modify `web/src/lib/api.ts`:

Add Message interface after Conversation interface:
```typescript
export interface Message {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  message_type: string;
  created_at: string;
}
```

Add sendChatMessage function after getConversation:
```typescript
export async function sendChatMessage(
  conversationId: number,
  content: string,
  onChunk: (chunk: string) => void
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
        onChunk(data);
      }
    }
  }
}
```

Full modified file:
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Conversation {
  id: number;
  title: string;
  mode: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: string;
  message_type: string;
  content: string;
  created_at: string;
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function createConversation(
  title: string,
  mode: string = "chat"
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, mode }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function getConversation(id: number): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}

export async function sendChatMessage(
  conversationId: number,
  content: string,
  onChunk: (chunk: string) => void
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
        onChunk(data);
      }
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd web && npm run build`

Expected: No TypeScript errors

---

### Task 5: ChatArea Component with Streaming

**Files:**
- Modify: `web/src/components/ChatArea.tsx`

- [ ] **Step 1: Update ChatArea with streaming state and logic**

Replace `web/src/components/ChatArea.tsx`:
```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { Conversation, Message, sendChatMessage } from "@/lib/api";

interface ChatAreaProps {
  conversation: Conversation | null;
  onMessageSent?: () => void;
}

export function ChatArea({ conversation, onMessageSent }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages or streaming content changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!conversation || !inputValue.trim() || isLoading) return;

    const content = inputValue.trim();
    setInputValue("");
    setIsLoading(true);
    setStreamingContent("");

    // Add user message immediately to display
    const tempUserMsg: Message = {
      id: -1,
      conversation_id: conversation.id,
      role: "user",
      content: content,
      message_type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      await sendChatMessage(conversation.id, content, (chunk) => {
        setStreamingContent((prev) => prev + chunk);
      });

      // After streaming completes, add the assistant message
      const tempAssistantMsg: Message = {
        id: -2,
        conversation_id: conversation.id,
        role: "assistant",
        content: streamingContent,
        message_type: "text",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAssistantMsg]);
      setStreamingContent("");

      onMessageSent?.();
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove the temporary user message on error
      setMessages((prev) => prev.filter((m) => m.id !== -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col bg-[#0f0f0f]">
        <div className="flex-1 flex items-center justify-center text-[#555] text-sm">
          Select a conversation to start chatting
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f0f]">
      <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
        {conversation.title}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingContent && (
          <div className="flex items-center justify-center text-[#555] text-sm h-full">
            No messages yet. Start a conversation.
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-[#7c6ff7] text-white"
                  : "bg-[#1a1a2e] text-[#e0e0e0] border border-[#2a2a3e]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming content */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg text-sm bg-[#1a1a2e] text-[#e0e0e0] border border-[#2a2a3e]">
              {streamingContent}
              <span className="inline-block w-2 h-4 bg-[#7c6ff7] animate-pulse ml-1" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-[#2a2a3e]">
        <textarea
          ref={textareaRef}
          className="w-full p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-[#e0e0e0] text-sm resize-none min-h-[48px] focus:outline-none focus:border-[#7c6ff7]"
          placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <div className="flex justify-end mt-2">
          <button
            className="px-4 py-2 bg-[#7c6ff7] text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update page.tsx to pass onMessageSent callback**

Modify `web/src/app/page.tsx` - add refresh logic:

After line 6, update imports:
```typescript
import { getConversation, Conversation, Message } from "@/lib/api";
```

Add function to refresh conversation after message sent (around line 32):
```typescript
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
```

Update ChatArea usage (line 51):
```typescript
        <ChatArea conversation={selectedConversation} onMessageSent={handleMessageSent} />
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd web && npm run build`

Expected: Build succeeds with no errors

---

### Task 6: End-to-End Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Ensure .env file exists with real API key**

User action: Create `api/.env` with:
```env
DEEPSEEK_API_KEY=<your-real-api-key>
```

- [ ] **Step 2: Start backend server**

Run: `cd api && .venv/bin/uvicorn app.main:app --reload`

Expected: Server starts at http://localhost:8000

- [ ] **Step 3: Start frontend dev server**

Run: `cd web && npm run dev`

Expected: Frontend starts at http://localhost:3000

- [ ] **Step 4: Test full flow**

Manual test:
1. Open http://localhost:3000
2. Click "+ New Chat" to create a conversation
3. Type a message and press Enter
4. Verify streaming response appears character by character
5. Verify message persists after completion

Expected: Streaming chat works end-to-end

- [ ] **Step 5: Verify database persistence**

Run: `cd api && .venv/bin/python -c "from app.core.database import SessionLocal; from app.models.message import Message; db = SessionLocal(); print(db.query(Message).all())"`

Expected: Messages are saved to database

---

## Self-Review Checklist

1. **Spec coverage**: All items in design doc covered
   - ✓ Configuration security (.env.example, config fields)
   - ✓ LLM Service (services/llm.py)
   - ✓ Chat Route (routes/chat.py with SSE)
   - ✓ Frontend SSE client (api.ts sendChatMessage)
   - ✓ ChatArea streaming display
   - ✓ Database save for user and assistant messages

2. **Placeholder scan**: No TBD/TODO found - all steps have complete code

3. **Type consistency**: Verified Message interface matches between frontend and backend schema