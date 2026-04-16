# ReqPilot

**ReqPilot** is an **AI Requirement Analysis Workbench**.  
It helps turn raw requirement text, bug descriptions, and product notes into structured analysis results.

This project is also a **learning project for AI agent development**.  
It is intentionally built through **developer-led, AI-assisted collaboration**, with a focus on learning:

- LLM application development
- structured outputs
- tool calling
- basic workflow design
- AI-assisted coding workflow

---

## Project Status

Current stage: **MVP / Phase 4 Complete**

Completed:

- frontend and backend project scaffolding
- three-column homepage layout (conversation list / chat area / analysis panel)
- FastAPI backend with SQLite database
- Conversation CRUD with SQLAlchemy ORM
- DeepSeek API integration via OpenAI SDK
- SSE streaming chat responses with real-time frontend rendering
- Markdown rendering for AI responses (react-markdown)
- **Analysis Mode** — structured LLM output (summary, todos, risks, acceptance criteria, open questions)
- **Conversation-level mode switching** (Chat / Analysis at creation time)
- **Artifact persistence** — analysis results saved and retrievable
- **Typed SSE events** for analysis mode, backward-compatible raw chunks for chat mode

Not implemented yet:

- tool calling (`spec_score`)
- Markdown export for analysis results
- authentication
- RAG
- multi-agent workflow

---

## Goals

### Product Goal
Build a web-based AI workbench that supports:

- chat-based interaction
- requirement analysis mode
- structured outputs
- visible tool calling
- conversation history
- Markdown export

### Learning Goal
Use this project to practice and understand:

- how to integrate LLMs into fullstack apps
- how to design structured output schemas
- how to build tool-based workflows
- how to collaborate with AI during development
- how to review and refine AI-generated code

---

## Planned Core Features

- **Chat Mode**  
  Free-form conversation with AI.

- **Analysis Mode**  
  Convert raw requirement text into structured fields:
  - `summary`
  - `todos`
  - `risks`
  - `acceptance_criteria`
  - `open_questions`

- **Tool Calling**
  A minimal tool such as `spec_score` to evaluate requirement completeness.

- **Conversation History**
  Save and revisit previous sessions.

- **Markdown Export**
  Export analysis results into reusable Markdown text.

---

## Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite

---

## Project Structure

```text
.
├── web/              # Frontend app
├── api/              # Backend app
├── PRD.md            # Product requirements document
├── CLAUDE.md         # AI collaboration rules
└── README.md         # Project overview
```

### Current frontend structure

```text
web/
└── src/
    ├── app/
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── ConversationList.tsx    # sidebar + mode picker
    │   ├── ChatArea.tsx            # messages + streaming + markdown
    │   ├── AnalysisPanel.tsx       # structured analysis cards
    │   └── MarkdownRenderer.tsx    # dark theme markdown rendering
    ├── lib/
    │   └── api.ts                  # API client + SSE handler
    └── stores/                     # only when actually needed
```

### Current backend structure

```text
api/
└── app/
    ├── main.py                     # FastAPI entrypoint
    ├── routes/
    │   ├── health.py               # GET /healthz
    │   ├── conversations.py        # Conversation CRUD
    │   ├── chat.py                 # POST /chat/stream (SSE, mode-aware)
    │   └── artifacts.py            # Artifact CRUD
    ├── schemas/
    │   ├── chat.py                 # Chat request/response
    │   └── artifact.py             # ArtifactCreate
    ├── models/
    │   ├── conversation.py         # Conversation model (mode field)
    │   ├── message.py              # Message model
    │   └── artifact.py             # Artifact model
    ├── core/
    │   ├── config.py               # env settings
    │   └── database.py             # SQLAlchemy engine + session
    └── services/
        ├── llm.py                  # DeepSeek LLM service + analysis prompt
        └── analysis.py             # JSON parser with 3-tier fallback
```

---

## Day 1 Scope

Day 1 only includes:

- create `web/` and `api/`
- build the static three-column homepage layout
- start FastAPI successfully
- implement `GET /healthz`
- prepare placeholder conversation routes
- prepare minimal config files
- prepare minimal models / schemas / types
- write project documentation

### Out of scope for Day 1

- real AI integration
- streaming response
- prompt engineering
- tool calling implementation
- export feature
- persistence-complete CRUD
- production infrastructure

---

## UI Layout

The homepage is planned as a three-column layout:

### Left
Conversation list
- title
- new chat button
- placeholder conversation items

### Center
Chat workspace
- page title
- message area
- input area
- mode switch placeholder

### Right
Analysis result panel
- summary card
- todos card
- risks card
- future score / metadata section

---

## API Plan

### Implemented
- `GET /healthz` — health check
- `GET /conversations` — list all conversations
- `POST /conversations` — create conversation (with mode: chat/analysis)
- `GET /conversations/{id}` — get conversation details
- `POST /chat/stream` — SSE chat endpoint (mode-aware: raw chunks for chat, typed events for analysis)
- `GET /conversations/{id}/messages` — get conversation message history
- `POST /artifacts` — create artifact from analysis result
- `GET /artifacts/conversations/{conversation_id}` — get artifacts for conversation

### Planned later
- `POST /export/markdown` — export analysis results to Markdown

---

## Development Principles

- **MVP first**
- **Do not over-engineer**
- **Prefer readable code**
- **Prefer explicit structure**
- **Build incrementally**
- **Keep the developer in control of core decisions**

---

## AI Collaboration Approach

This project uses **developer-led, AI-assisted development**.

### AI can help with
- project scaffolding
- boilerplate code
- basic routes
- simple schemas and models
- config files
- documentation drafts

### Developer should own
- project scope
- data model tradeoffs
- output schema design
- prompt design
- tool design
- workflow logic
- UI/UX details
- review of generated code

See `CLAUDE.md` for the detailed collaboration rules.

---

## Local Development

### Frontend

```bash
cd web
npm install
npm run dev
```

### Backend

#### 首次设置（创建虚拟环境并安装依赖）

```bash
cd api
rm -rf .venv                      # 清理旧环境（如有问题）
python3 -m venv .venv             # 创建虚拟环境
source .venv/bin/activate         # 激活环境
python -m pip install -r requirements.txt  # 安装依赖（绕过 alias）
```

> **注意**：如果 shell 配置了 `pip` alias（指向全局 Python），请用 `python -m pip` 或 `.venv/bin/pip` 安装，确保依赖安装到虚拟环境。

#### 验证安装位置

```bash
.venv/bin/pip show fastapi | grep Location
# 应显示: api/.venv/lib/python3.x/site-packages
```

#### 日常启动

每次打开新终端：

```bash
cd api
source .venv/bin/activate
.venv/bin/uvicorn app.main:app --reload
```

或者无需激活，直接调用：

```bash
cd api
.venv/bin/uvicorn app.main:app --reload
```

#### 为什么需要虚拟环境

| 问题 | 说明 |
|------|------|
| 版本冲突 | 多个项目可能需要不同版本的包 |
| 难以复现 | 其他机器无法复现相同环境 |
| 依赖追踪 | 无法明确项目依赖 |

---

## Documentation

- `PRD.md` — product and learning requirements
- `CLAUDE.md` — AI collaboration rules
- `README.md` — project overview and setup

---

## Next Steps

1. ~~generate the Day 1 project skeleton~~ ✅
2. ~~implement the homepage layout~~ ✅
3. ~~implement FastAPI app entrypoint~~ ✅
4. ~~expose `/healthz`~~ ✅
5. ~~prepare placeholder routes and types~~ ✅
6. ~~review all generated code before continuing~~ ✅
7. ~~implement database integration and CRUD~~ ✅
8. ~~implement LLM streaming chat~~ ✅
9. ~~implement Markdown rendering~~ ✅
10. ~~implement Analysis Mode with structured output~~ ✅
11. implement Tool Calling (`spec_score`)
12. implement Markdown Export

---

## Notes

This repository is intentionally kept small and simple in the beginning.
The goal is not to build a complete production system immediately, but to create a clean and understandable foundation for both:

- building an AI product
- learning AI agent development through practice
