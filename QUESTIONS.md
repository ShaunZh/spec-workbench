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

##待补充

后续疑问将持续追加到本文档。