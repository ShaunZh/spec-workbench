# Design: LLM API 接入 + 聊天流式交互

日期：2026-04-12
状态：已批准
范围：MVP Day 2

---

## 1. 概述

实现聊天模式的流式交互，用户发送消息 → DeepSeek API 流式回复 → 实时展示并保存到数据库。

**技术栈**：
- 后端：FastAPI + OpenAI SDK（兼容 DeepSeek） + SQLAlchemy
- 前端：Next.js + fetch SSE
- 配置：pydantic-settings + .env

---

## 2. 配置安全

### 2.1 环境变量

| 文件 | 提交状态 | 内容 |
|------|---------|------|
| `api/.env` | ❌ 不提交 | 真实 API key |
| `api/.env.example` | ✅ 提交 | 配置示例（无真实值） |

**.env.example 内容**：
```env
DEEPSEEK_API_KEY=your-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

### 2.2 Config 字段

**文件**: `api/app/core/config.py`

添加字段：
- `deepseek_api_key: Optional[str] = None`
- `deepseek_base_url: str = "https://api.deepseek.com"`
- `deepseek_model: str = "deepseek-chat"`

---

## 3. 后端架构

### 3.1 LLM Service

**新文件**: `api/app/services/llm.py`

职责：
- 初始化 OpenAI SDK 客户端（指向 DeepSeek）
- 提供 `stream_chat(messages)` 方法
- 返回生成器，yield 每个 chunk

关键代码：
```python
class LLMService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )

    def stream_chat(self, messages: list):
        stream = self.client.chat.completions.create(
            model=settings.deepseek_model,
            messages=messages,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
```

### 3.2 Chat Route

**新文件**: `api/app/routes/chat.py`

接口：`POST /chat/stream`

流程：
1. 验证会话存在
2. 保存用户消息到 Message 表
3. 查询历史消息，构建 messages list
4. 调用 `llm_service.stream_chat()`
5. 边流式输出边拼接内容
6. 完成后保存 assistant 消息
7. 返回 SSE 格式

返回格式：
```
data: chunk1\n\n
data: chunk2\n\n
data: [DONE]\n\n
```

---

## 4. 前端实现

### 4.1 API 客户端

**更新**: `web/src/lib/api.ts`

添加 `sendChatMessage(conversationId, content, onChunk)` 函数：
- 使用 fetch + ReadableStream 处理 SSE
- 每个 chunk 调用 `onChunk(chunk)`
- 遇到 `[DONE]` 结束

### 4.2 ChatArea 组件

**更新**: `web/src/components/ChatArea.tsx`

功能：
- 显示消息列表（用户 + assistant）
- 输入框提交逻辑
- 流式内容实时追加显示
- Enter 键发送（Shift+Enter 换行）

状态：
- `messages`: 已完成的消息列表
- `streamingContent`: 正在流式输出的内容
- `isLoading`: 等待状态

---

## 5. 数据流

```
用户输入 "Hello"
    ↓
POST /chat/stream { conversation_id: 1, content: "Hello" }
    ↓
保存 Message (role=user, content="Hello")
    ↓
查询历史消息
    ↓
DeepSeek API stream=True
    ↓
SSE: data: "Hi"\n\n → data: " there"\n\n → data: [DONE]\n\n
    ↓
前端实时渲染: "Hi there!"
    ↓
保存 Message (role=assistant, content="Hi there!")
```

---

## 6. 文件清单

| 文件 | 操作 |
|------|------|
| `api/.env` | 新建（不提交） |
| `api/.env.example` | 新建（提交） |
| `api/requirements.txt` | 添加 openai 依赖 |
| `api/app/core/config.py` | 添加 DeepSeek 配置字段 |
| `api/app/services/__init__.py` | 新建 |
| `api/app/services/llm.py` | 新建 |
| `api/app/routes/chat.py` | 新建 |
| `api/app/main.py` | 注册 chat router |
| `web/src/lib/api.ts` | 添加 sendChatMessage |
| `web/src/components/ChatArea.tsx` | 更新消息显示和输入逻辑 |

---

## 7. 验证标准

1. 后端启动成功，`POST /chat/stream` 接口可用
2. 发送消息后 SSE 流式返回
3. 消息保存到数据库 Message 表
4. 前端实时展示流式内容
5. 流式完成后内容完整显示