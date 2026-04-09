# Day 1 Implementation Design

**Date:** 2026-04-09
**Scope:** Project skeleton + minimal scaffolding
**Approach:** Minimal scaffold (Option A)

---

## Goal

Create a clean foundation for the ReqPilot project. Day 1 focuses on:
1. Setting up frontend/backend structure
2. Basic three-column layout (visual only)
3. FastAPI health check endpoint
4. Placeholder routes for conversations

**No LLM integration, no database operations, no streaming.**

---

## Learning Focus (Day 1)

Day 1 is intentionally minimal — the real AI agent learning happens later. However, we should:
- Establish clean boundaries between frontend and backend (future API contract practice)
- Set up a structure that makes adding AI features straightforward
- Keep everything reviewable and understandable

---

## Backend Structure

```
api/
├── app/
│   ├── main.py          # FastAPI entry point
│   ├── routes/
│   │   ├── health.py    # GET /healthz
│   │   └── conversations.py  # Placeholder CRUD routes
│   └── schemas/
│   │   └── conversation.py   # Minimal Pydantic models (placeholder)
│   └── models/
│   │   └── conversation.py   # SQLAlchemy model skeleton (not used Day 1)
│   └── core/
│   │   └── config.py    # Settings placeholder
├── requirements.txt     # fastapi, uvicorn[standard]
└── .venv/               # Virtual environment
```

**Day 1 routes:**
| Route | Status | Response |
|-------|--------|----------|
| `GET /healthz` | Implemented | `{ "status": "ok" }` |
| `GET /conversations` | Placeholder | Mock list |
| `POST /conversations` | Placeholder | Mock created object |
| `GET /conversations/{id}` | Placeholder | Mock single object |

---

## Frontend Structure

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Homepage with three-column layout
│   ├── components/
│   │   ├── ConversationList.tsx   # Left panel
│   │   ├── ChatArea.tsx           # Center panel
│   │   ├── AnalysisPanel.tsx      # Right panel
│   ├── lib/
│   │   └── placeholder.ts         # Empty placeholder
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

**Layout:** Three-column flex layout. All content is static placeholder text. No API calls.

---

## Key Decisions

### Next.js App Router
Using App Router (Next.js 14+ default). File-based routing under `src/app/`. This is modern and matches current conventions.

### FastAPI with APIRouter
Routes split into separate files under `app/routes/`. Clean separation, easy to extend.

### No Database Yet
SQLite + SQLAlchemy setup deferred to Day 2. Day 1 routes return hardcoded mock data.

### Minimal Dependencies
- Backend: `fastapi`, `uvicorn[standard]` only
- Frontend: `next`, `react`, `react-dom`, `tailwindcss` only

---

## What's NOT Included

Per CLAUDE.md scope:
- `.env` file (Day 2)
- Database setup (Day 2)
- LLM integration (Day 3+)
- Streaming (Day 3+)
- Tool calling (Day 3+)
- Prompt design (Day 3+)

---

## Verification

Day 1 success criteria:
1. `cd api && uvicorn app.main:app` starts successfully
2. `GET http://localhost:8000/healthz` returns `{ "status": "ok" }`
3. `cd web && npm run dev` starts successfully
4. Homepage shows three-column layout with placeholder content

---

## Future Extensions (Day 2+)

The structure prepares for:
- Adding `app/routes/chat.py` for streaming
- Adding `app/routes/analysis.py` for structured output
- Adding `app/services/llm.py` for LLM client
- Adding `app/tools/spec_score.py` for tool calling
- Adding `app/schemas/artifact.py` for structured outputs

Each addition follows the same pattern: route → schema → service → model.

---

## Notes

This design intentionally avoids over-engineering. The goal is a clean, reviewable foundation. All AI-related complexity comes later, built incrementally on top of this scaffold.