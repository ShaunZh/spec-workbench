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

### Phase 4: Analysis Mode 结构化分析与双模式聊天

| 字段 | 内容 |
|------|------|
| **日期** | 2026-04-15 ~ 2026-04-16 |
| **完成功能** | - 会话级模式切换（Chat / Analysis），创建会话时选择模式<br>- LLM 分析模式：System Prompt 强制 JSON 结构化输出<br>- `stream_chat_with_mode()` 方法，根据 `conversation.mode` 动态注入 `ANALYSIS_SYSTEM_PROMPT`<br>- 3 层 JSON 解析降级策略（纯 JSON → markdown code block → 首对 `{}` 包裹）<br>- SSE 双事件格式：Chat 模式用 raw chunk（`data: {chunk}\n\n`），Analysis 模式用 typed JSON events（`chunk`/`analysis_result`/`analysis_error`/`done`）<br>- Artifact 持久化：分析成功时双写 Message + Artifact<br>- Artifact CRUD 接口（`POST /artifacts`、`GET /artifacts/conversations/{id}`）<br>- 右侧分析面板：实时 SSE 流式展示 + 历史数据回显<br>- 新建会话内联模式选择器（Chat / Analysis 按钮）<br>- 分析结果 5 字段卡片展示（Summary / Todos / Risks / Acceptance Criteria / Open Questions） |
| **学习意义** | **对应 PRD 学习目标 2（Structured Output）**：掌握了 LLM 结构化输出的核心机制。学会了：如何通过 system prompt 强制 LLM 输出固定 JSON schema、如何处理 LLM 输出不稳定的降级策略（3 层 JSON 解析）、SSE 协议如何扩展支持多事件类型（raw vs typed）、mode-aware LLM 路由模式（同一接口根据会话模式走不同逻辑链）。这是从"聊天工具"到"结构化分析工具"的关键升级。 |
| **关键技术点** | - System Prompt 结构化输出设计（vs response_format / Tool Calling）<br>- 3-tier JSON 解析降级策略（防御 LLM 输出格式不稳定）<br>- SSE typed events 协议设计（`type` + `content`/`data`/`message`）<br>- mode-aware LLM routing（`stream_chat_with_mode` 单方法分支）<br>- Artifact 双写模式（流式结束后写 Message + Artifact）<br>- 前端 SSE 多事件类型消费（try/catch JSON.parse 区分 raw/typed）<br>- 前端实时流式展示 + DB 历史回显双路径渲染 |
| **涉及文件** | - `api/app/services/llm.py` — `ANALYSIS_SYSTEM_PROMPT` + `stream_chat_with_mode()`<br>- `api/app/services/analysis.py` — `parse_analysis_json()` 3 层降级解析<br>- `api/app/routes/chat.py` — mode-aware SSE 双格式<br>- `api/app/routes/artifacts.py` — Artifact CRUD 接口<br>- `api/app/schemas/artifact.py` — `ArtifactCreate` schema<br>- `api/tests/test_llm.py` — 模式感知 LLM 测试（3 tests）<br>- `api/tests/test_analysis.py` — JSON 解析降级测试（5 tests）<br>- `web/src/lib/api.ts` — `AnalysisResult` 类型 + typed SSE 事件<br>- `web/src/components/AnalysisPanel.tsx` — 数据绑定分析面板<br>- `web/src/components/ChatArea.tsx` — analysis_result/error 回调<br>- `web/src/components/ConversationList.tsx` — 内联模式选择器<br>- `web/src/app/page.tsx` — 全局分析状态管理 |
| **设计决策** | - 选择 System Prompt + JSON 而非 response_format / Tool Calling：兼容性最强，DeepSeek 等非 OpenAI 模型也支持<br>- 同一 `/chat/stream` 接口根据 `conversation.mode` 分支处理：减少新增代码量，复用 SSE 管道<br>- SSE 双格式：Chat 模式保持 backward-compatible raw chunk，Analysis 模式用 typed JSON events，前端 try/catch 区分<br>- 3 层 JSON 解析：纯 JSON（正常情况）→ markdown code block（LLM 加了 ```json 包裹）→ 首对 `{}`（LLM 加了前缀文本），覆盖所有常见输出格式 |
| **经验教训** | - SSE generator 中的数据库 session 需要独立创建（request-scoped session 在 StreamingResponse 返回后即关闭）<br>- code quality review 可能产生误报：JS 中 `return` 在嵌套循环中退出的是整个函数而非内层循环，这是正确的<br>- 拆分任务时，组件实现和组件接入应明确责任归属，避免 code review 阶段误判为遗漏<br>- Next.js 16 Turbopack 的 workspace root 推断问题：`npx tsc --noEmit` 会触发错误安装，应使用 `./node_modules/.bin/tsc --noEmit` |

---

### Phase 4 架构详解

#### 一、整体架构：数据流全景

```
用户输入需求文本
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    前端 (Next.js)                           │
│                                                             │
│  ConversationList ──创建会话(选择模式)──▶ ChatArea          │
│  (模式选择器)         mode=chat/analysis       │             │
│                                            发送消息         │
│                                               │             │
└────────────────────────────────────────────────▼────────────┘
                                               │ POST /chat/stream
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端 (FastAPI)                           │
│                                                             │
│  1. 查 conversation.mode ── analysis? ──注入 System Prompt  │
│  2. 调 LLM (DeepSeek) ── SSE 流式返回                        │
│  3. 解析 JSON ── 3 层降级策略                                │
│  4. 双写 ── Message + Artifact                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
       │
       ▼ (typed SSE events)
┌─────────────────────────────────────────────────────────────┐
│                    前端接收                                  │
│                                                             │
│  ChatArea ── 流式 chunk → MarkdownRenderer → 实时渲染       │
│  AnalysisPanel ── analysis_result → LiveAnalysisCards       │
│                   (实时 SSE 展示)                            │
│  Artifact ── DB 回显 → ArtifactAnalysisCards                │
│       (历史数据)                                             │
└─────────────────────────────────────────────────────────────┘
```

**一句话总结**：用户在分析模式会话中发消息 → 后端注入 system prompt 让 LLM 输出 JSON → 解析后流式推送前端 → 同时保存到数据库 → 右侧面板实时 + 历史展示 5 字段结构化结果。

#### 二、后端实现（3 个核心层）

**2.1 LLM 层 — mode-aware 路由**

```python
# api/app/services/llm.py

# 常量：分析模式的 system prompt
ANALYSIS_SYSTEM_PROMPT = """
你是一个专业的需求分析专家...
必须以以下 JSON 格式返回...
{
  "summary": "...",
  "todos": [...],
  "risks": [{"title": "...", "description": "..."}],
  "acceptance_criteria": [...],
  "open_questions": [...]
}
"""

# 方法：根据 mode 决定是否注入 prompt
def stream_chat_with_mode(self, messages, conversation_mode):
    if conversation_mode == "analysis":
        messages.insert(0, {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT})
    return self.stream_chat(messages), conversation_mode
```

**设计点**：不创建新方法，而是在原 `stream_chat` 前加一个条件层。analysis 模式多注入一个 system prompt，chat 模式原样不动。

**2.2 JSON 解析层 — 3 层降级**

```
LLM 输出可能是什么格式？
├── 正常：纯 JSON → json.loads() 成功
├── markdown：```json\n{...}\n``` → 正则提取 → json.loads()
└── 前缀文本："好的，分析如下：\n{...}" → 提取首尾 {} → json.loads()
    └── 全部失败 → 返回 None → 触发 SSE error 事件
```

**为什么需要降级**：LLM 不是确定性输出器。即使 system prompt 要求"不要包含其他内容"，仍可能输出前缀、markdown 包裹、甚至多余文本。3 层策略覆盖 99% 的场景。

**2.3 路由层 — SSE 双格式**

```
POST /chat/stream
│
├── 查询 conversation.mode
│
├── analysis 模式：
│   ├── for chunk in stream:
│   │     yield {"type": "chunk", "content": "..."}
│   ├── 解析 JSON → 成功？
│   │     ├── yield {"type": "analysis_result", "data": {...}}
│   │     └── 写 Message (message_type="structured")
│   │     └── 写 Artifact (持久化 5 字段)
│   │     └── yield {"type": "done"}
│   │     └── 失败？→ yield {"type": "analysis_error", "message": "..."}
│
└── chat 模式（向后兼容）：
    ├── for chunk in stream:
    │     yield f"data: {chunk}\n\n"
    └── yield "data: [DONE]\n\n"
```

**关键设计**：同一接口，根据 mode 分支。好处是前端只需调用一个 API，后端复用 SSE 管道。

#### 三、前端实现（3 个组件 + 1 个 API 层）

**3.1 API 层 — SSE 事件消费者**

```typescript
// web/src/lib/api.ts — 消费 SSE：try/catch 自动区分两种格式
try {
  const event = JSON.parse(data);
  // typed event (Analysis mode)
  if (event.type === "chunk") onChunk(event.content);
  if (event.type === "analysis_result") onAnalysisResult(event.data);
  if (event.type === "analysis_error") onError(event.message);
  if (event.type === "done") return;
} catch {
  // raw chunk (Chat mode)
  onChunk(data);
}
```

**巧妙之处**：Chat 模式的 raw chunk 不是合法 JSON，走 catch 分支；Analysis 模式的 typed event 是合法 JSON，走 try 分支。无需额外字段标识模式。

**3.2 ConversationList — 模式选择器**

替代了原来的"一键新建"，变成两步：

```
点击 "+ New Chat"
    ↓
显示模式选择器
┌─────────────────────┐
│  Choose mode:       │
│  [ Chat ] [Analysis]│
│  [ Cancel ]         │
└─────────────────────┘
    ↓
POST /conversations {title: "New Chat", mode: "analysis"}
```

**3.3 ChatArea — 双回调**

发送消息时传入两个新回调：
- `onAnalysisResult`: 收到 analysis_result → 触发右侧面板更新
- `onAnalysisError`: 收到 analysis_error → 显示错误 toast

聊天区同时展示用户消息（紫色气泡）、AI 流式回复（Markdown 渲染 + 光标闪烁）、流式结束后追加固定 assistant message。

**3.4 AnalysisPanel — 双路径渲染**

右侧面板数据源有两条路径：

```
实时路径（SSE 流式）：
  page.tsx analysisResult state → LiveAnalysisCards
  显示 5 个卡片：Summary / Todos / Risks / Acceptance Criteria / Open Questions

历史路径（DB 回显）：
  切换会话时 → getArtifacts(conversationId) → ArtifactAnalysisCards
  从 Artifact 表的 todos_json / risks_json 等字段反序列化展示
```

#### 四、数据存储（双写模式）

```
一次分析成功的完整数据流：

LLM 返回完整 JSON
    │
    ├── 写 Message 表
    │   role="assistant", content=完整JSON文本
    │   message_type="structured"
    │   作用：聊天历史中可见
    │
    └── 写 Artifact 表
        summary = data["summary"]
        todos_json = json.dumps(data["todos"])
        risks_json = json.dumps(data["risks"])
        acceptance_json = json.dumps(data["acceptance_criteria"])
        questions_json = json.dumps(data["open_questions"])
        作用：右侧面板独立查询展示
```

**为什么双写**：Message 表服务于聊天历史的线性展示，Artifact 表服务于结构化查询和面板展示。职责分离。

#### 五、一次完整的用户旅程

```
1. 用户点击 "+ New Chat" → 选择 "Analysis" 模式
2. 创建 conversation(mode="analysis")
3. 用户粘贴一段需求描述："用户需要登录功能，支持微信和手机号"
4. 前端 POST /chat/stream {content: "...", conversation_id: 1}
5. 后端查到 mode="analysis" → 注入 ANALYSIS_SYSTEM_PROMPT → 调 DeepSeek
6. SSE 实时推送：
   - {"type":"chunk","content":"..."}  → 前端 MarkdownRenderer 实时渲染
   - {"type":"analysis_result","data":{
       summary:"用户需要...", todos:[...], risks:[...]
     }}
   - {"type":"done"}
7. 前端：
   - ChatArea 追加 assistant message
   - AnalysisPanel 的 LiveAnalysisCards 显示 5 个卡片
   - 后端同时写了 Message + Artifact 到数据库
8. 用户切换会话再切回来 → AnalysisPanel 从 DB 加载 Artifact 回显
```

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

