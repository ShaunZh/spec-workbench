# AI Agent 开发学习日志

本文档按开发阶段记录每个阶段完成的功能及其在 AI agent 开发学习中的意义。

---

## 文档结构说明

每个阶段包含以下字段：

| 字段 | 说明 |
|------|------|
| **阶段名称** | 简短描述（如 "Phase 1: LLM Chat Stream"） |
| **日期** | 开发时间范围 |
| **完成功能** | 产品层面交付了什么 |
| **学习意义** | 对应 PRD 的哪个学习目标，学到了什么 |
| **关键技术点** | 涉及的技术能力和概念 |
| **涉及文件** | 主要改动的文件列表 |
| **设计决策** | 关键架构取舍及其原因（可选） |
| **经验教训** | 踩坑记录、值得复盘的点（可选） |

---

---

---

<!-- 以下为各阶段记录，按时间倒序排列，最新阶段在最上方 -->

---

### Phase 3: LLM 聊天流式与 Markdown 渲染

| 字段 | 内容 |
|------|------|
| **日期** | 2026-04-14 |
| **完成功能** | - DeepSeek API 接入，LLM 服务封装（`llm.py`）<br>- `POST /chat/stream` SSE 流式聊天接口<br>- 对话消息持久化（Message 表）<br>- 前端 SSE 流式展示（实时逐 chunk 渲染）<br>- react-markdown 集成，AI 回复支持 Markdown 格式<br>- 自定义 Markdown 渲染组件（暗色主题适配） |
| **学习意义** | **对应 PRD 学习目标 1 & 2**：完成了 LLM API 接入和流式输出处理。学会了：SSE 协议的完整实现流程（后端 stream → 前端 ReadableStream → 逐 chunk 渲染）、LLM 调用的基本模式（system/user 角色、message history）、Markdown 渲染在 AI 应用中的重要性。这是从"聊天工具"到"AI 应用"的关键一步。 |
| **关键技术点** | - Server-Sent Events (SSE) 协议与实现<br>- OpenAI SDK 的 `stream=True` 用法<br>- Python async generator 处理流式响应<br>- 前端 `ReadableStream` + `TextDecoder` 处理 SSE<br>- react-markdown 组件集成与自定义样式<br>- LLM 消息历史构建（多轮对话上下文） |
| **涉及文件** | - `api/app/services/llm.py` — DeepSeek LLM 服务<br>- `api/app/routes/chat.py` — SSE 流式聊天接口<br>- `api/app/schemas/chat.py` — 聊天请求/响应 schema<br>- `web/src/lib/api.ts` — `sendChatMessage()` SSE 调用<br>- `web/src/components/ChatArea.tsx` — 聊天区 + SSE 渲染<br>- `web/src/components/MarkdownRenderer.tsx` — Markdown 渲染组件 |
| **设计决策** | - 选择 hand-rolled SSE 而非框架级方案（理解底层机制，学习价值更高）<br>- 暂不引入 LangChain 等框架（先理解基础，后续再引入高级抽象） |
| **经验教训** | - SSE 流中的数据库 session 管理需要特别注意：streaming 期间保持 session open，结束后正确关闭<br>- LLM 回复的 Markdown 格式需要前端配合渲染，否则原始 markdown 文本可读性差 |

---

### Phase 2: 数据库集成与前后端对接

| 字段 | 内容 |
|------|------|
| **日期** | 2026-04-11 ~ 2026-04-12 |
| **完成功能** | - SQLAlchemy ORM 模型创建（Conversation / Message / Artifact）<br>- `database.py` 引擎与 session 配置<br>- Conversation CRUD 接口连通真实数据库<br>- `GET /conversations/{id}/messages` 消息列表接口<br>- 前端连接真实 API（ConversationList 调用接口获取数据）<br>- 会话创建、列表、详情、消息加载全链路打通 |
| **学习意义** | **对应 PRD 学习目标 1**：完成了 LLM API 接入前的全部基础设施。学会了：如何把 PRD 中的数据结构定义转化为 ORM 模型、如何用 Pydantic 做 API 层数据验证、前后端 API 对接的完整流程、如何将 placeholder 替换为真实数据源。 |
| **关键技术点** | - SQLAlchemy 2.0 同步 ORM 用法<br>- FastAPI + Pydantic 的请求/响应模型<br>- RESTful API 设计（CRUD 接口模式）<br>- 前端 `fetch` 调用 + 状态管理<br>- 前后端联调流程 |
| **涉及文件** | - `api/app/models/conversation.py` — Conversation 模型<br>- `api/app/models/message.py` — Message 模型<br>- `api/app/models/artifact.py` — Artifact 模型<br>- `api/app/core/database.py` — engine + session<br>- `api/app/routes/conversations.py` — Conversation CRUD<br>- `web/src/lib/api.ts` — API 客户端封装<br>- `web/src/components/ConversationList.tsx` — 会话列表组件 |
| **设计决策** | - 使用同步 SQLAlchemy 而非异步（MVP 阶段简单够用，后续需要时再切换）<br>- Artifact 表预留了 JSON 字段（为后续结构化分析结果做准备） |

---

### Phase 1: 项目骨架与基础框架

| 字段 | 内容 |
|------|------|
| **日期** | 2026-04-09 |
| **完成功能** | - 前后端项目目录结构搭建<br>- 前端三栏布局（会话列表 / 聊天区 / 分析面板）<br>- FastAPI 服务启动 + `GET /healthz`<br>- Conversation CRUD 接口骨架（placeholder）<br>- 数据库模型定义（Conversation / Message / Artifact）<br>- Pydantic schemas 定义<br>- 环境变量配置（`.env` + `config.py`） |
| **学习意义** | **对应 PRD 学习目标 1 & 3**：LLM API 接入前的准备工作，以及 AI 协作开发流程的第一次实践。学会了：如何用 AI 搭建项目骨架、如何把 PRD 转化为目录结构和接口定义、如何在 AI 生成代码后做 review 并保持架构一致性。 |
| **关键技术点** | - FastAPI 项目结构（`app/main.py`、`routes/`、`models/`、`schemas/`、`core/`）<br>- Next.js + TypeScript 项目初始化<br>- SQLAlchemy ORM 模型定义<br>- Pydantic 数据验证与 settings 管理<br>- CORS 配置<br>- 前后端分离的基础路由设计 |
| **涉及文件** | - `api/app/main.py` — FastAPI 入口<br>- `api/app/core/config.py` — 环境变量配置<br>- `api/app/core/database.py` — SQLAlchemy engine + session<br>- `api/app/models/` — 数据模型定义<br>- `api/app/schemas/` — Pydantic 验证 schema<br>- `api/app/routes/health.py` — 健康检查<br>- `web/src/app/page.tsx` — 三栏布局首页<br>- `web/src/app/layout.tsx` — 根布局 |
| **设计决策** | - 选择 `app/` 而非 `src/` 作为后端代码根目录（FastAPI 惯例）<br>- 不使用 service/repository 模式（MVP first，避免过早抽象）<br>- SQLite 而非 PostgreSQL（降低 Day 1 开发复杂度） |
| **经验教训** | - 如果 shell 配置了 `pip` alias（指向全局 Python），需用 `.venv/bin/pip` 或 `python -m pip` 确保安装到正确的虚拟环境 |

