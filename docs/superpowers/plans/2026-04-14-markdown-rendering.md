# Markdown Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable markdown rendering for LLM responses in the chat UI

**Architecture:** Create a reusable MarkdownRenderer component that wraps react-markdown with custom Tailwind styling, then integrate it into ChatArea for both historical messages and streaming content.

**Tech Stack:** React, react-markdown, Tailwind CSS, Next.js 16

---

## File Structure

```
web/src/
├── components/
│   ├── ChatArea.tsx        # Modify: import and use MarkdownRenderer
│   └── MarkdownRenderer.tsx # Create: new component for markdown rendering
├── package.json            # Modify: add react-markdown dependency
```

---

### Task 1: Install react-markdown dependency

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install react-markdown package**

Run in `web/` directory:
```bash
cd web && npm install react-markdown
```

Expected output: package added successfully, `package.json` updated

- [ ] **Step 2: Verify installation**

Run:
```bash
cd web && npm list react-markdown
```

Expected output: `react-markdown@x.x.x`

- [ ] **Step 3: Commit dependency change**

```bash
git add web/package.json web/package-lock.json
git commit -m "feat(web): add react-markdown dependency for markdown rendering

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Create MarkdownRenderer component

**Files:**
- Create: `web/src/components/MarkdownRenderer.tsx`

- [ ] **Step 1: Create MarkdownRenderer.tsx**

Create file `web/src/components/MarkdownRenderer.tsx` with:

```tsx
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

- [ ] **Step 2: Verify component compiles**

Run:
```bash
cd web && npm run build
```

Expected: Build succeeds without errors

- [ ] **Step 3: Commit MarkdownRenderer component**

```bash
git add web/src/components/MarkdownRenderer.tsx
git commit -m "feat(web): add MarkdownRenderer component with dark theme styling

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Integrate MarkdownRenderer into ChatArea

**Files:**
- Modify: `web/src/components/ChatArea.tsx`

- [ ] **Step 1: Add import for MarkdownRenderer**

Modify `web/src/components/ChatArea.tsx` line 4, add import after existing imports:

```tsx
// Line 4 - add import
import { Conversation, Message, sendChatMessage, getConversationMessages } from "@/lib/api";
import { MarkdownRenderer } from "./MarkdownRenderer";  // Add this line
```

- [ ] **Step 2: Replace historical message rendering with MarkdownRenderer**

Modify lines 144-152, replace `{msg.content}` with `<MarkdownRenderer>`:

```tsx
// Lines 144-152 - Replace the inner content rendering
<div
  className={`max-w-[80%] p-3 rounded-lg text-sm ${
    msg.role === "user"
      ? "bg-[#7c6ff7] text-white"
      : "bg-[#1a1a2e] text-[#e0e0e0] border border-[#2a2a3e]"
  }`}
>
  {msg.role === "user" ? (
    msg.content
  ) : (
    <MarkdownRenderer content={msg.content} />
  )}
</div>
```

- [ ] **Step 3: Replace streaming content rendering with MarkdownRenderer**

Modify lines 157-163, replace `{streamingContent}` with `<MarkdownRenderer>`:

```tsx
// Lines 157-163 - Replace streaming content rendering
{streamingContent && (
  <div className="flex justify-start">
    <div className="max-w-[80%] p-3 rounded-lg text-sm bg-[#1a1a2e] text-[#e0e0e0] border border-[#2a2a3e]">
      <MarkdownRenderer content={streamingContent} />
      <span className="inline-block w-2 h-4 bg-[#7c6ff7] animate-pulse ml-1" />
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify changes compile**

Run:
```bash
cd web && npm run build
```

Expected: Build succeeds without errors

- [ ] **Step 5: Commit ChatArea changes**

```bash
git add web/src/components/ChatArea.tsx
git commit -m "feat(web): integrate MarkdownRenderer for LLM response display

- Render assistant messages with markdown formatting
- Support streaming markdown during response generation
- User messages remain as plain text

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Manual verification

**Files:**
- None (manual testing)

- [ ] **Step 1: Start dev server**

Run:
```bash
cd web && npm run dev
```

Expected: Server starts on http://localhost:3000

- [ ] **Step 2: Verify markdown rendering works**

Test scenarios in browser:

1. **Headings**: Send "用标题格式回答" - expect `# 标题` rendered as large bold text
2. **Bold**: LLM response with `**粗体**` - expect bold text
3. **Inline code**: Response with `` `代码` `` - expect purple background highlight
4. **Code block**: Response with fenced code - expect dark background block
5. **List**: Response with `- 列表项` - expect bullet points
6. **Link**: Response with `[链接](url)` - expect purple underline

- [ ] **Step 3: Verify streaming markdown works**

Send a message and watch the streaming response - markdown should render progressively (accepting brief flicker for incomplete syntax).

---

## Self-Review

**Spec coverage:**
- ✅ Task 1: Install react-markdown dependency
- ✅ Task 2: Create MarkdownRenderer with all styling (headings, bold, italic, links, lists, code blocks, blockquote)
- ✅ Task 3: Integrate into ChatArea for historical and streaming messages
- ✅ Task 4: Manual verification of all test scenarios

**Placeholder scan:**
- ✅ All code blocks contain complete implementation
- ✅ No "TBD" or "TODO" placeholders
- ✅ All commands are exact with expected outputs

**Type consistency:**
- ✅ MarkdownRenderer Props interface defined consistently
- ✅ Import name `MarkdownRenderer` used consistently throughout