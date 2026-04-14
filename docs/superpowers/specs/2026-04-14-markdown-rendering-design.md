# Markdown 渲染设计

**日期**: 2026-04-14
**状态**: 已批准

---

## 背景

前端聊天页面中，LLM 返回的文本是 markdown 格式，当前 ChatArea 组件直接渲染纯文本，导致标题、代码块、列表等格式无法正确显示。

---

## 需求

- 支持基础 markdown 特性：标题、粗体、斜体、链接、列表、代码块
- 流式渲染时实时显示，接受不完整语法的短暂闪烁
- 样式与现有深色主题一致

---

## 技术方案

### 依赖选择

**react-markdown**

| 优点 | 缺点 |
|------|------|
| 轻量（~150KB gzip） | 无内置语法高亮 |
| React 原生组件 | 需手动配置样式 |
| 默认禁止 HTML（安全） | |
| 支持 SSR | |

### 文件结构

```
web/src/
├── components/
│   ├── ChatArea.tsx        # 修改：使用 MarkdownRenderer
│   └── MarkdownRenderer.tsx # 新增：封装 react-markdown
```

### MarkdownRenderer 组件

```tsx
// web/src/components/MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown'

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return <code className={className}>{children}</code>
          }
          return <code className="bg-[#2a2a3e] px-1 py-0.5 rounded text-[#7c6ff7]">{children}</code>
        },
        pre: ({ children }) => (
          <pre className="bg-[#2a2a3e] p-3 rounded-lg overflow-x-auto my-2 text-sm">{children}</pre>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-[#7c6ff7] underline hover:opacity-80" target="_blank" rel="noopener noreferrer">{children}</a>
        ),
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#7c6ff7] pl-3 my-2 text-[#888]">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

### ChatArea 改动

**位置**: [ChatArea.tsx:151](web/src/components/ChatArea.tsx#L151) 和 [ChatArea.tsx:160](web/src/components/ChatArea.tsx#L160)

```tsx
// 导入
import { MarkdownRenderer } from './MarkdownRenderer'

// 历史消息渲染（第151行）
<MarkdownRenderer content={msg.content} />

// 流式消息渲染（第160行）
<MarkdownRenderer content={streamingContent} />
```

---

## 数据流

```
LLM 返回 markdown 文本
       ↓
ChatArea 接收完整/流式内容
       ↓
MarkdownRenderer 解析并渲染
       ↓
应用 Tailwind 样式（通过 components 配置）
```

---

## 安全考虑

`react-markdown` 默认不渲染原始 HTML，无需额外 XSS 处理。如后续需要限制特定元素，可配置 `disallowedElements`。

---

## 实现步骤

1. 安装依赖：`npm install react-markdown`
2. 创建 `MarkdownRenderer.tsx` 组件
3. 修改 `ChatArea.tsx`，替换纯文本渲染为 MarkdownRenderer
4. 验证样式与深色主题一致

---

## 测试场景

| 输入 | 预期效果 |
|------|----------|
| `# 标题` | 大号粗体文字 |
| `**粗体**` | 粗体文字 |
| `` `代码` `` | 紫色背景内联代码 |
| ````代码块```` | 深色背景块 |
| `[链接](url)` | 紫色下划线链接 |
| `- 列表` | 圆点列表 |

---

## 后续优化（暂不实现）

- 代码块语法高亮（需额外依赖如 rehype-highlight）
- LaTeX 数学公式（需 remark-math）
- Mermaid 图表渲染