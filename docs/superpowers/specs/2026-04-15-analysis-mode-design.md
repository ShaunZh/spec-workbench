# Analysis Mode 设计文档

日期：2026-04-15
状态：Draft
作者：Developer + AI（brainstorming session）

---

## 1. 概述

Analysis Mode 将 ReqPilot 从「聊天工具」升级为「需求分析工作台」。用户在创建对话时选择分析模式，发送需求文本后，系统自动生成结构化分析结果（summary、todos、risks、acceptance_criteria、open_questions），并在右侧面板展示。

### 1.1 产品目标

- 支持在创建对话时选择「分析模式」或「聊天模式」
- 分析模式下，用户发送消息后自动触发 LLM 结构化分析
- 分析结果在右侧 AnalysisPanel 中实时展示
- 分析结果持久化到数据库，切换对话后可重新加载

### 1.2 学习目标

- **Structured Output**：如何通过 system prompt + JSON schema 控制 LLM 输出格式
- **Workflow 基础**：用户消息 → LLM 调用 → 解析 → 持久化 → 前端展示，最简 agent workflow
- **Prompt 设计**：角色定义、约束条件、输出格式要求的协同
- **错误处理**：LLM 不按格式返回时的 fallback 策略

### 1.3 范围

本阶段 **不包含**：
- Tool Calling（spec_score）—— 下一阶段
- Markdown 导出 —— 下一阶段
- 多轮分析对话（本阶段每条消息独立分析）

---

## 2. 架构设计

### 2.1 整体架构

采用「扩展现有 `/chat/stream` 端点」方案（方案 A），根据 `conversation.mode` 自动切换行为。

```
用户发送消息 → POST /chat/stream
    │
    ├── 查询 conversation.mode
    │       │
    │       ├── mode == "chat"    → 现有行为不变（流式回复）
    │       │
    │       └── mode == "analysis" → 注入 analysis system prompt
    │                                       │
    │                                       ▼
    │                               调用 LLM（stream）
    │                                       │
    │                               流结束后解析 JSON
    │                                       │
    │                               保存 Artifact 到 DB
    │                                       │
    │                               发送 analysis_result SSE 事件
    │                                       │
    │                                       ▼
    │                               前端 AnalysisPanel 更新
```

### 2.2 选择理由

- 最少新代码，复用现有 SSE 管道
- 前端改动最小，只需新增事件类型处理
- 符合 CLAUDE.md 的 MVP first 原则
- 后续如果发现耦合问题再拆分为独立 endpoint

---

## 3. 后端设计

### 3.1 System Prompt

分析模式下，在 LLM 调用时注入以下 system prompt：

```
你是一个专业的需求分析专家。请根据用户输入的需求描述，生成结构化分析结果。
必须以以下 JSON 格式返回（不要包含 markdown 代码块标记，直接返回 JSON）：

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
```

### 3.2 LLM 服务变更

**文件**：`api/app/services/llm.py`

新增方法 `stream_chat_with_mode()`：

```python
def stream_chat_with_mode(
    messages: list[dict],
    conversation_mode: str,
) -> tuple[AsyncGenerator, str | None]:
    """
    根据 conversation.mode 决定是否注入 analysis system prompt。

    Returns:
        - async generator yielding content chunks
        - system prompt injected (for logging)
    """
```

实际实现逻辑：
- 如果 `conversation_mode == "analysis"`，在 messages 列表头部插入 system message（包含上述 prompt）
- 调用现有 `stream_chat()` 方法
- 返回流式生成器

### 3.3 聊天端点变更

**文件**：`api/app/routes/chat.py`

`POST /chat/stream` 端点修改：

1. 获取 `conversation.mode`
2. 调用 `llm.stream_chat_with_mode()` 注入 system prompt（如果是 analysis 模式）
3. 流式返回 SSE 事件：
   - `{"type": "chunk", "content": "..."}` — 逐块推送（现有）
   - 流结束后（analysis 模式）：
     - 尝试从完整回复中解析 JSON
     - 解析成功 → 保存 Artifact → 推送 `{"type": "analysis_result", "data": {...}}`
     - 解析失败 → 推送 `{"type": "analysis_error", "message": "..."}`
   - `{"type": "done"}` — 流结束标记（新增）

### 3.4 Artifact 持久化

**文件**：`api/app/models/artifact.py`（已有，无需修改）
**新文件**：`api/app/routes/artifacts.py`

新增路由：

```python
# POST /artifacts
# 创建分析结果记录
# Request: { conversation_id, source_message_id, summary, todos, risks, acceptance_criteria, open_questions }

# GET /conversations/{conversation_id}/artifacts
# 获取某对话的所有分析结果（按时间倒序）
# Response: List[Artifact]
```

**新文件**：`api/app/schemas/artifact.py`

```python
class ArtifactCreate(BaseModel):
    conversation_id: int
    source_message_id: int
    summary: str
    todos: list[str]
    risks: list[dict]
    acceptance_criteria: list[str]
    open_questions: list[str]

class ArtifactResponse(BaseModel):
    id: int
    conversation_id: int
    summary: str
    todos: list[str]
    risks: list[dict]
    acceptance_criteria: list[str]
    open_questions: list[str]
    created_at: str
```

### 3.5 JSON 解析策略

LLM 可能返回以下格式之一：

1. 纯 JSON：`{"summary": "...", ...}`
2. Markdown 包裹：````json\n{...}\n````
3. 带前缀文字：`好的，这是分析结果：\n{...}`

解析顺序：
1. 尝试 `json.loads(full_response)` — 纯 JSON
2. 正则提取 ````json ... ```` 包裹的内容
3. 正则提取第一个 `{ ... }` 块（假设嵌套完整）
4. 全部失败 → 返回 `analysis_error`

### 3.6 main.py 注册新路由

**文件**：`api/app/main.py`

注册 `artifacts` router。

---

## 4. 前端设计

### 4.1 ConversationList 增强

**文件**：`web/src/components/ConversationList.tsx`

- 「新建对话」按钮点击后，弹出一个简单的模式选择对话框
- 使用 inline 的 radio 按钮组（分析模式 / 聊天模式），默认聊天模式
- 选择后调用 `createConversation(title, mode)`

### 4.2 SSE 事件处理扩展

**文件**：`web/src/lib/api.ts`

`sendChatMessage()` 的 SSE 解析器新增事件类型：

```typescript
// 现有
{ type: "chunk", content: "..." }

// 新增
{ type: "analysis_result", data: AnalysisResult }
{ type: "analysis_error", message: string }
{ type: "done" }
```

### 4.3 ChatArea 变更

**文件**：`web/src/components/ChatArea.tsx`

- 收到 `analysis_result` 事件时，通过回调通知父组件
- 收到 `analysis_error` 事件时，在聊天区显示错误提示
- 收到 `done` 事件时，结束 loading 状态

### 4.4 AnalysisPanel 数据绑定

**文件**：`web/src/components/AnalysisPanel.tsx`

当前是 placeholder 卡片，改为：

1. 接收 `analysis_result` 数据，填充各卡片：
   - Summary：纯文本展示
   - Todos：列表展示
   - Risks：标题 + 描述卡片
   - Acceptance Criteria：checkbox 列表
   - Open Questions：列表展示

2. 组件挂载或会话切换时，调用 `GET /conversations/{id}/artifacts` 加载最新分析结果

3. Completeness Score 和 Export Markdown 按钮保持 placeholder（下一阶段实现）

### 4.5 页面级状态管理

**文件**：`web/src/app/page.tsx`

在顶层组件中管理分析结果状态：

- `analysisResult` state 从 ChatArea 的回调接收
- 切换会话时清空 `analysisResult` 并从 API 加载历史
- 传递给 AnalysisPanel

---

## 5. 错误处理

| 场景 | 处理方式 |
|------|----------|
| LLM 返回非 JSON | 捕获解析错误，发送 `analysis_error` SSE 事件 |
| 数据库写入失败 | 记录日志，不影响前端聊天展示 |
| 无 API Key | 启动时检查，返回友好错误 |
| 前端加载 artifact 失败 | 静默处理，面板显示空白 |
| 网络中断 | 前端 SSE onerror 处理，显示重试提示 |

---

## 6. 接口清单

### 修改

| 方法 | 路径 | 变更 |
|------|------|------|
| POST | `/chat/stream` | 新增 analysis mode 逻辑、analysis_result SSE 事件 |

### 新增

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/artifacts` | 创建分析结果 |
| GET | `/conversations/{id}/artifacts` | 获取对话的分析历史 |

---

## 7. 数据流

```
[Frontend]  用户发送消息
     │
     ▼
[API]     POST /chat/stream
     │
     ├── GET conversation → check mode == "analysis"
     │
     ├── 构建 messages + analysis system prompt
     │
     ├── LLM stream_chat (DeepSeek)
     │     │
     │     ├── SSE: chunk → Frontend (ChatArea 流式显示)
     │     └── 流结束 → 解析 JSON
     │              │
     │              ├── 成功 → POST /artifacts (保存到 DB)
     │              │         SSE: analysis_result → Frontend (AnalysisPanel 更新)
     │              │
     │              └── 失败 → SSE: analysis_error → Frontend (提示)
     │
     └── SSE: done
```

---

## 8. 文件清单

### 修改

- `api/app/main.py` — 注册 artifacts router
- `api/app/services/llm.py` — 新增 mode-aware chat 方法
- `api/app/routes/chat.py` — 新增 analysis 逻辑和 SSE 事件
- `web/src/app/page.tsx` — 管理分析结果状态
- `web/src/components/ConversationList.tsx` — 新增模式选择
- `web/src/components/ChatArea.tsx` — 处理新 SSE 事件
- `web/src/components/AnalysisPanel.tsx` — 数据绑定
- `web/src/lib/api.ts` — 新增 SSE 事件类型、artifacts API

### 新增

- `api/app/routes/artifacts.py` — Artifacts CRUD 路由
- `api/app/schemas/artifact.py` — Artifact 请求/响应 schema
