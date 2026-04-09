# Day 1 Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create minimal project scaffold with FastAPI backend (healthz + placeholder routes) and Next.js frontend (three-column layout).

**Architecture:** Backend uses FastAPI with APIRouter for clean route separation. Frontend uses Next.js App Router with Tailwind CSS. No database, no LLM — all routes return mock data.

**Tech Stack:** Python/FastAPI, TypeScript/Next.js, Tailwind CSS

---

## File Structure

### Backend (api/)
```
api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry, mounts routers
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py        # GET /healthz
│   │   └── conversations.py # GET/POST placeholder routes
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── conversation.py  # Pydantic models
│   ├── models/
│   │   ├── __init__.py
│   │   └── conversation.py  # SQLAlchemy skeleton (unused Day 1)
│   └── core/
│   │   ├── __init__.py
│   │   └── config.py        # Settings placeholder
├── requirements.txt
└── .venv/                   # Created via python -m venv
```

### Frontend (web/)
```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with Tailwind
│   │   ├── page.tsx         # Homepage, renders 3 panels
│   ├── components/
│   │   ├── ConversationList.tsx  # Left sidebar
│   │   ├── ChatArea.tsx          # Center chat
│   │   ├── AnalysisPanel.tsx     # Right analysis cards
│   ├── lib/
│   │   └── utils.ts              # Empty placeholder
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.ts
```

---

## Task 1: Backend Directory Structure

**Files:**
- Create: `api/app/__init__.py`
- Create: `api/app/routes/__init__.py`
- Create: `api/app/schemas/__init__.py`
- Create: `api/app/models/__init__.py`
- Create: `api/app/core/__init__.py`

- [ ] **Step 1: Create backend directory tree**

Run:
```bash
mkdir -p api/app/routes api/app/schemas api/app/models api/app/core
```

- [ ] **Step 2: Create __init__.py files**

Run:
```bash
touch api/app/__init__.py api/app/routes/__init__.py api/app/schemas/__init__.py api/app/models/__init__.py api/app/core/__init__.py
```

---

## Task 2: Backend Dependencies

**Files:**
- Create: `api/requirements.txt`

- [ ] **Step 1: Write requirements.txt**

Create `api/requirements.txt`:
```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
```

- [ ] **Step 2: Create virtual environment**

Run:
```bash
cd api && python3 -m venv .venv
```

- [ ] **Step 3: Install dependencies**

Run:
```bash
cd api && source .venv/bin/activate && pip install -r requirements.txt
```

Expected: Successfully installs fastapi and uvicorn.

---

## Task 3: Core Config

**Files:**
- Create: `api/app/core/config.py`

- [ ] **Step 1: Write config.py**

Create `api/app/core/config.py`:
```python
"""Application configuration settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings for the ReqPilot API."""

    app_name: str = "ReqPilot"
    app_version: str = "0.1.0"


settings = Settings()
```

- [ ] **Step 2: Add pydantic-settings to requirements**

Update `api/requirements.txt`:
```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic-settings>=2.6.0
```

- [ ] **Step 3: Reinstall dependencies**

Run:
```bash
cd api && source .venv/bin/activate && pip install -r requirements.txt
```

---

## Task 4: Conversation Schema

**Files:**
- Create: `api/app/schemas/conversation.py`

- [ ] **Step 1: Write conversation schema**

Create `api/app/schemas/conversation.py`:
```python
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
```

---

## Task 5: Conversation Model (Skeleton)

**Files:**
- Create: `api/app/models/conversation.py`

- [ ] **Step 1: Add SQLAlchemy to requirements**

Update `api/requirements.txt`:
```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic-settings>=2.6.0
sqlalchemy>=2.0.0
```

- [ ] **Step 2: Reinstall dependencies**

Run:
```bash
cd api && source .venv/bin/activate && pip install -r requirements.txt
```

- [ ] **Step 3: Write conversation model skeleton**

Create `api/app/models/conversation.py`:
```python
"""SQLAlchemy model for conversation (skeleton, not used Day 1)."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Conversation(Base):
    """Conversation model for future database use."""

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    mode = Column(String, default="chat")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## Task 6: Health Route

**Files:**
- Create: `api/app/routes/health.py`

- [ ] **Step 1: Write health route**

Create `api/app/routes/health.py`:
```python
"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/healthz")
async def health_check():
    """Return health status."""
    return {"status": "ok"}
```

---

## Task 7: Conversations Route (Placeholder)

**Files:**
- Create: `api/app/routes/conversations.py`

- [ ] **Step 1: Write conversations route with mock data**

Create `api/app/routes/conversations.py`:
```python
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
```

---

## Task 8: FastAPI Main Entry

**Files:**
- Create: `api/app/main.py`

- [ ] **Step 1: Write main.py**

Create `api/app/main.py`:
```python
"""FastAPI application entry point."""

from fastapi import FastAPI
from app.core.config import settings
from app.routes import health, conversations

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

# Mount routers
app.include_router(health.router)
app.include_router(conversations.router)
```

- [ ] **Step 2: Update routes __init__.py for imports**

Update `api/app/routes/__init__.py`:
```python
"""Routes package."""

from app.routes.health import router as health_router
from app.routes.conversations import router as conversations_router
```

---

## Task 9: Backend Verification

- [ ] **Step 1: Start FastAPI server**

Run:
```bash
cd api && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

Expected: Server starts without errors.

- [ ] **Step 2: Test health endpoint**

Run (in another terminal or after stopping server):
```bash
curl http://localhost:8000/healthz
```

Expected: `{"status":"ok"}`

- [ ] **Step 3: Test conversations endpoint**

Run:
```bash
curl http://localhost:8000/conversations
```

Expected: JSON array with 3 mock conversations.

---

## Task 10: Frontend Directory Structure

**Files:**
- Create: `web/` directory structure

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-turbopack --import-alias "@/*"
```

When prompted:
- Would you like to customize the import alias? → No (keep default `@/*`)

Expected: Next.js project created with TypeScript, Tailwind, App Router.

---

## Task 11: ConversationList Component

**Files:**
- Create: `web/src/components/ConversationList.tsx`

- [ ] **Step 1: Write ConversationList component**

Create `web/src/components/ConversationList.tsx`:
```typescript
"use client";

interface Conversation {
  id: number;
  title: string;
  updated_at: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 1, title: "User authentication flow", updated_at: "2 min ago" },
  { id: 2, title: "Bug: checkout timeout", updated_at: "1 hour ago" },
  { id: 3, title: "Dashboard redesign notes", updated_at: "Yesterday" },
  { id: 4, title: "Customer feedback batch #3", updated_at: "2 days ago" },
];

export function ConversationList() {
  return (
    <div className="w-[260px] bg-[#14141f] border-r border-[#2a2a3e] flex flex-col">
      <div className="m-3 p-2 bg-[#2a2a3e] border border-dashed border-[#3a3a5e] rounded-md text-[#aaa] text-sm text-center cursor-pointer">
        + New Chat
      </div>
      <ul className="flex-1 overflow-y-auto">
        {MOCK_CONVERSATIONS.map((conv, idx) => (
          <li
            key={conv.id}
            className={`p-3 border-b border-[#1e1e30] cursor-pointer hover:bg-[#1e1e30] ${
              idx === 0 ? "bg-[#2a2a4e] border-l-2 border-l-[#7c6ff7]" : ""
            }`}
          >
            <div className="text-sm font-medium text-[#ddd] truncate">
              {conv.title}
            </div>
            <div className="text-xs text-[#666] mt-1">{conv.updated_at}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Task 12: ChatArea Component

**Files:**
- Create: `web/src/components/ChatArea.tsx`

- [ ] **Step 1: Write ChatArea component**

Create `web/src/components/ChatArea.tsx`:
```typescript
"use client";

export function ChatArea() {
  return (
    <div className="flex-1 flex flex-col bg-[#0f0f0f]">
      <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
        User authentication flow
      </div>
      <div className="flex-1 flex items-center justify-center text-[#555] text-sm">
        No messages yet. Start a conversation.
      </div>
      <div className="p-4 border-t border-[#2a2a3e]">
        <textarea
          className="w-full p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-[#e0e0e0] text-sm resize-none min-h-[48px]"
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
}
```

---

## Task 13: AnalysisPanel Component

**Files:**
- Create: `web/src/components/AnalysisPanel.tsx`

- [ ] **Step 1: Write AnalysisPanel component**

Create `web/src/components/AnalysisPanel.tsx`:
```typescript
"use client";

interface AnalysisCardProps {
  title: string;
  placeholder: string;
}

function AnalysisCard({ title, placeholder }: AnalysisCardProps) {
  return (
    <div className="m-3 p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
      <div className="text-xs font-semibold text-[#7c6ff7] uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="text-xs text-[#555] italic">{placeholder}</div>
    </div>
  );
}

export function AnalysisPanel() {
  return (
    <div className="w-[320px] bg-[#14141f] border-l border-[#2a2a3e] overflow-y-auto">
      <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
        Analysis Results
      </div>
      <AnalysisCard title="Summary" placeholder="No analysis yet" />
      <AnalysisCard title="Todos" placeholder="No todos yet" />
      <AnalysisCard title="Risks" placeholder="No risks identified" />
      <AnalysisCard title="Acceptance Criteria" placeholder="No criteria yet" />
      <AnalysisCard title="Open Questions" placeholder="No questions yet" />
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
```

---

## Task 14: Homepage Layout

**Files:**
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Write homepage with three-column layout**

Update `web/src/app/page.tsx`:
```typescript
import { ConversationList } from "@/components/ConversationList";
import { ChatArea } from "@/components/ChatArea";
import { AnalysisPanel } from "@/components/AnalysisPanel";

export default function Home() {
  return (
    <main className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-12 bg-[#1a1a2e] border-b border-[#2a2a3e] flex items-center px-4">
        <span className="font-bold text-[#7c6ff7]">ReqPilot</span>
        <div className="ml-auto flex gap-2">
          <button className="px-3 py-1 bg-[#7c6ff7] text-white text-xs rounded-md border-none">
            Chat
          </button>
          <button className="px-3 py-1 text-[#aaa] text-xs rounded-md border border-[#3a3a5e] bg-transparent">
            Analysis
          </button>
        </div>
      </div>
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ConversationList />
        <ChatArea />
        <AnalysisPanel />
      </div>
    </main>
  );
}
```

---

## Task 15: Global Layout

**Files:**
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Update global layout**

Update `web/src/app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReqPilot",
  description: "AI Requirement Analysis Workbench",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

---

## Task 16: Tailwind Configuration

**Files:**
- Modify: `web/tailwind.config.ts`

- [ ] **Step 1: Ensure Tailwind content paths include components**

Verify `web/tailwind.config.ts` has:
```typescript
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

---

## Task 17: Frontend Verification

- [ ] **Step 1: Start Next.js dev server**

Run:
```bash
cd web && npm run dev
```

Expected: Server starts on http://localhost:3000

- [ ] **Step 2: Open homepage in browser**

Open http://localhost:3000

Expected: Three-column layout appears with:
- Left: conversation list with mock items
- Center: chat area with input
- Right: analysis cards

---

## Task 18: Final Commit

- [ ] **Step 1: Commit backend**

Run:
```bash
cd api && git add -A && git commit -m "feat(api): add FastAPI skeleton with healthz and placeholder routes"
```

- [ ] **Step 2: Commit frontend**

Run:
```bash
cd web && git add -A && git commit -m "feat(web): add Next.js skeleton with three-column layout"
```

- [ ] **Step 3: Update README with setup instructions**

Update `README.md` (append if needed):
```markdown
## Quick Start

### Backend
```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd web
npm install
npm run dev
```
```

---

## Self-Review

**Spec coverage:**
- ✅ `GET /healthz` → Task 6, 9
- ✅ `GET /conversations` → Task 7, 9
- ✅ `POST /conversations` → Task 7
- ✅ `GET /conversations/{id}` → Task 7
- ✅ Three-column layout → Tasks 11-15, 17

**Placeholder scan:**
- No TBD/TODO found
- All code blocks contain complete implementations

**Type consistency:**
- Backend: `ConversationResponse` used consistently in routes and schema
- Frontend: Component props match expected data shapes