# 疑问记录

本文档记录开发过程中产生的疑问及其解答，作为学习资料沉淀。

---

## 项目结构相关

### Q1: FastAPI 项目的文件夹组织形式有什么依据？

**日期**: 2026-04-09

**解答**:

主要遵循两个来源：

1. **FastAPI 官方教程推荐的最小结构**
   ```
   app/
   ├── main.py
   └── routers/
   ```

2. **Full Stack FastAPI Template 的简化版**
   [full-stack-fastapi-template](https://github.com/tiangolo/full-stack-fastapi-template) 是业界广泛参考的模板：
   ```
   app/
   ├── main.py
   ├── core/       # config, security, dependencies
   ├── routers/    # API routes
   ├── schemas/    # Pydantic models
   ├── models/     # SQLAlchemy models
   ├── crud/       # CRUD operations
   ├── services/   # Business logic
   ├── repositories/ # Data access
   ```

当前项目精简了这个模板，只保留 Day 1 需要的：
- `core/` — 配置、安全等基础设施
- `routes/` — API 路由
- `schemas/` — Pydantic 请求/响应模型
- `models/` — SQLAlchemy 数据模型

省略的部分（Day 1 不需要）：`crud/`, `services/`, `repositories/`

**原则**: MVP first，不要过度工程，易于扩展。

---

### Q2: schemas/ 文件夹的作用是什么？

**日期**: 2026-04-09

**解答**:

`schemas/` 存放 **Pydantic 模型**，用于定义 API 的输入输出数据结构。

**与 models/ 的区别**:

| 目录 | 技术 | 作用 | 数据流位置 |
|------|------|------|------------|
| `schemas/` | Pydantic | API 请求/响应的数据结构 | 外部边界 |
| `models/` | SQLAlchemy | 数据库表结构 | 内部存储 |

```
客户端请求 → Pydantic Schema (验证/序列化) → 业务逻辑 → SQLAlchemy Model → 数据库
```

**为什么需要分开**:
1. 输入输出 ≠ 数据库存储（请求只需部分字段，响应可能包含计算字段）
2. Pydantic 自动提供：类型验证、响应序列化、OpenAPI 文档生成

**当前项目的 schemas**:
- `ConversationCreate` — POST 请求体验证
- `ConversationResponse` — GET 响应格式

---

### Q3: repositories/ 的作用是什么？为什么当前项目没有？

**日期**: 2026-04-09

**解答**:

`repositories/` 是 **数据访问层**，封装所有数据库 CRUD 操作。

**分层架构位置**:
```
routes/ → services/ → repositories/ → models/
API端点     业务逻辑      数据访问       数据库模型
```

**repository 的好处**:
- 解耦：业务逻辑不写 SQL
- 复用：同一个 CRUD 操作可在多个 service 中使用
- 测试：可以 mock repository，不依赖真实数据库
- 统一查询逻辑：过滤、排序、分页集中管理

**为什么当前项目没有**:
- Day 1 用 mock 数据，无真实数据库
- 业务逻辑简单，查询直接写在 route 里足够
- 符合 MVP first 原则，避免过度抽象

**什么时候应该加**:
1. 接入真实数据库
2. 多个 service 共享查询逻辑
3. 复杂查询（分页、过滤、聚合）
4. 需要单元测试

---

## 技术概念相关

### Q4: BaseModel 是什么？

**日期**: 2026-04-09

**解答**:

`BaseModel` 是 **Pydantic** 库的核心类，用于定义数据模型，提供自动验证和序列化。

**基本作用**:
```python
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
    email: str | None = None  # 可选字段
```

创建实例时，Pydantic 自动：
1. **类型验证** — 确保数据类型正确
2. **类型转换** — 尝试将输入转换为指定类型
3. **错误提示** — 类型不匹配时抛出 ValidationError

**在 FastAPI 中的使用**:

| 场景 | 作用 |
|------|------|
| 请求体 | 自动验证客户端提交的 JSON |
| 响应体 | 自动序列化为 JSON 返回 |
| OpenAPI 文档 | 自动生成 Swagger 字段定义 |

**BaseModel 核心能力**:
- `__init__` — 接收数据并验证
- `.model_dump()` — 转为 Python dict
- `.model_dump_json()` — 转为 JSON 字符串
- `Field()` — 字段级别约束（最小值、正则等）
- `@field_validator` — 自定义验证逻辑

**为什么用 BaseModel 而不是普通类**:
- 普通类：无验证，任何数据都能传入
- BaseModel：自动验证，类型不匹配立即报错

---

### Q5: 后端代码的执行流程是怎样的？

**日期**: 2026-04-09

**解答**:

**1. 应用启动流程**:

```
uvicorn app.main:app --reload
    ↓
加载 main.py
    ↓
读取 config.py settings
    ↓
创建 FastAPI 实例
    ↓
注册 health.router→ GET /healthz
注册 conversations.router → /conversations 路由组
    ↓
应用就绪，监听端口
```

**启动命令**:
```bash
uvicorn app.main:app --reload
```

**执行顺序**:
1. uvicorn 加载 `app.main:app`（main.py 中的 app 变量）
2. 执行 main.py 顶层代码：导入 settings、创建 FastAPI 实例、注册 routers
3. 应用就绪，监听请求

**2. 请求处理流程**（以 POST /conversations 为例）:

```
客户端 POST /conversations {"title": "test"}
    ↓
FastAPI 路由匹配 → conversations.router
    ↓
调用 create_conversation 函数
    ↓
Pydantic 验证请求体 (ConversationCreate)
    ↓验证失败 → 422 ValidationError
验证通过 → 执行函数逻辑
    ↓
生成 mock 数据，构建 ConversationResponse
    ↓
Pydantic 序列化为 JSON
    ↓
返回 200 + JSON 响应
```

**各层职责**:

| 层 | 文件位置 | 职责 |
|---|----------|------|
| 路由层 | routes/ | 接收请求，调用处理函数 |
| 验证层 | schemas/ | 验证输入，序列化输出 |
| 业务逻辑 | routes/ | 当前直接在 route 中处理 |
| 数据层 | models/ | 当前未使用（mock 数据） |

**3. 当前 vs 未来数据流**:

当前 (Day 1):
```
routes/ → schemas/ → mock 数据 (内存)
```

未来 (接入数据库):
```
routes/ → schemas/ → services/ → repositories/ → models/ → SQLite
```

---

## 待补充

后续疑问将持续追加到本文档。