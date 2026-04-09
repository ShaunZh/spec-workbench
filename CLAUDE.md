# CLAUDE.md

本文档定义 AI 在此项目中的协作规则。AI 应严格遵循。

---

## Project Overview

**Name:** ReqPilot
**Type:** Product + Learning project
**Mode:** Developer-led, AI-assisted

本项目是 AI 需求分析工作台，同时作为 AI agent 开发学习载体。

**重要**: AI 是编码助手，不是项目决策者。开发者保留核心设计权。

---

## Architecture Principles

1. **MVP first** — 最小可用版本优先，避免过早抽象
2. **Do not over-engineer** — 无不必要的模式、层、框架
3. **Keep code readable** — 清晰命名，简单数据流
4. **Prefer explicit over clever** — 避免魔法抽象
5. **Build in layers** — skeleton → CRUD → AI integration → workflow → UX

---

## AI Collaboration Rules

### AI should help with
- project scaffolding
- directory structure
- boilerplate code
- basic CRUD routes
- simple schemas and models
- config files
- README drafts
- mock data
- repetitive refactors
- code cleanup suggestions

### AI should NOT make final decisions on
- product scope
- data model tradeoffs
- structured output schema design
- prompt design
- tool definition
- workflow logic
- interaction design
- edge cases
- error handling policy
- architecture tradeoffs

If AI proposes something beyond current scope, keep the simpler option.

---

## Coding Guidance

### General
- Write minimal, working, readable code
- Avoid speculative features
- Avoid introducing dependencies unless requested
- Prefer native framework capabilities

### Frontend
- Keep components simple and composable
- No complex state libraries on Day 1
- No third-party UI component libraries unless asked
- Prefer clean layout over fake complexity

### Backend
- Use FastAPI with `APIRouter`
- Keep route structure clean
- No service/repository patterns unless needed later
- Keep database setup minimal

### Database
- SQLite-compatible definitions
- Keep models minimal
- Favor simple schema over future-proofing

---

## File and Naming Conventions

### Top level
- `web/` — frontend
- `api/` — backend
- `PRD.md` — product requirements
- `CLAUDE.md` — AI collaboration rules (this file)
- `README.md` — project overview and setup
- `QUESTIONS.md` — learning questions and answers

### Backend folders
- `app/main.py`
- `app/routes/`
- `app/schemas/`
- `app/models/`
- `app/core/`
- `app/services/` — only when actually needed

### Frontend folders
- `src/app/`
- `src/components/`
- `src/lib/`
- `src/stores/` — only when actually needed

### Naming
- use clear, descriptive names
- avoid vague names like `utils2`, `manager`, `commonService`
- align with domain: conversation, message, artifact, analysis, spec_score

---

## Output Style for AI Code Generation

- output complete file contents
- clearly label file paths
- keep explanations short
- avoid discussing future phases unless asked
- prefer working code over theoretical discussion
- stay within current milestone
- if something is a placeholder, say so clearly

---

## Review Checklist for Generated Code

Before considering generated code acceptable, check:
- stays within current scope?
- minimal?
- readable?
- easy to modify later?
- avoids unnecessary dependencies?
- avoids premature abstraction?
- aligns with folder structure?
- matches PRD?

If not, simplify it.

---

## Notes for Future AI Sessions

When helping with this repository:
- read `PRD.md` first
- follow this file (`CLAUDE.md`)
- optimize for learning value, not just speed
- preserve developer control over core decisions
- do not silently expand scope

### 疑问记录流程

本项目兼作学习载体，开发过程中产生的疑问应被记录沉淀。

**触发条件**: 开发者提出疑问性问题（如"为什么..."、"这是什么..."、"xxx的作用"等），且解答具有学习价值时。

**操作流程**:
1. 解答疑问后，将内容追加到 `QUESTIONS.md`
2. 格式要求：
   - 标题：`### Q{n}: {疑问内容}`
   - 必须包含：日期、解答内容
   - 可选包含：代码示例、对比表格、参考链接
3. 按主题分组（如"项目结构相关"、"技术选型相关"等）

**不记录的情况**:
- 一次性调试问题
- 明显的语法错误咨询
- 与项目无关的通用编程问题