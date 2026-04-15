# Claude Code 本地包：AI Agent 教程创作助手

这是一个可直接放到本地项目中的 Claude Code 配置包，用于把 AI agent 学习与开发过程整理为教程材料。

## 包含内容

- `CLAUDE.md`
  - 项目的长期规则与写作原则
- `.claude/commands/tutorial-outline.md`
  - 生成教程大纲
- `.claude/commands/tutorial-section.md`
  - 生成单节教程正文
- `.claude/commands/tutorial-kb-update.md`
  - 更新系列教程知识库

## 使用方法

### 方式一：放进你的项目目录
把整个目录复制到你的项目根目录中，使结构类似：

```text
your-project/
├── CLAUDE.md
└── .claude/
    └── commands/
        ├── tutorial-outline.md
        ├── tutorial-section.md
        └── tutorial-kb-update.md
```

然后在 Claude Code 中打开该项目即可使用这些命令。

### 方式二：只拷贝你需要的文件
如果你已经有自己的 `CLAUDE.md`，可以把其中和教程创作有关的规则合并进去，再把命令文件单独放入 `.claude/commands/`。

## 典型用法

### 1. 做完一个阶段后生成教程大纲
把本阶段的开发笔记、代码片段、对话总结或 Markdown 草稿贴给 Claude，然后运行：

```text
/tutorial-outline
```

### 2. 把某个实现过程写成单节教程
把某一段实现材料贴给 Claude，然后运行：

```text
/tutorial-section
```

### 3. 把本轮经验沉淀进系列知识库
整理本轮结论后运行：

```text
/tutorial-kb-update
```

## 适合的输入

- 开发笔记
- 关键代码片段
- bug 现象与排查记录
- 你对某一阶段做了什么的文字说明
- 已有 Markdown 草稿

## 最佳实践

1. 每完成一个阶段再汇总一次，不要试图一步写完整个系列。
2. 尽量提供：目标、实现、问题、结果。
3. 如果有失败过程，不要删掉，它往往正是教程最有价值的部分。
4. 用 `tutorial-kb-update` 沉淀长期有效的结论，再反向更新大纲。
