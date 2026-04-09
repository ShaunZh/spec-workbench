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

Current stage: **MVP / Day 1**

At this stage, the project focuses on:

- frontend and backend project scaffolding
- homepage layout
- FastAPI backend skeleton
- basic route placeholders
- project documentation

Not implemented yet:

- real LLM integration
- streaming
- tool calling
- structured analysis logic
- Markdown export
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

### Planned frontend structure

```text
web/
└── src/
    ├── app/
    ├── components/
    ├── lib/
    └── stores/       # only when needed
```

### Planned backend structure

```text
api/
└── app/
    ├── main.py
    ├── routes/
    ├── schemas/
    ├── models/
    ├── core/
    └── services/     # only when needed
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

### Implement on Day 1
- `GET /healthz`

### Placeholder routes
- `GET /conversations`
- `POST /conversations`
- `GET /conversations/{id}`

### Planned later
- `POST /chat/stream`
- `POST /analysis`
- `POST /export/markdown`

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
Planned commands:

```bash
cd web
npm install
npm run dev
```

### Backend
Planned commands:

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## Documentation

- `PRD.md` — product and learning requirements
- `CLAUDE.md` — AI collaboration rules
- `README.md` — project overview and setup

---

## Next Steps

1. generate the Day 1 project skeleton
2. implement the homepage layout
3. implement FastAPI app entrypoint
4. expose `/healthz`
5. prepare placeholder routes and types
6. review all generated code before continuing

---

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

---

## Notes

This repository is intentionally kept small and simple in the beginning.
The goal is not to build a complete production system immediately, but to create a clean and understandable foundation for both:

- building an AI product
- learning AI agent development through practice
