---
name: todo
description: 管理 .docs/todo.md 中的任务追踪，支持添加、查看、完成、讨论等操作。
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
---

# Todo 管理技能

## 上下文
- Todo 文件：`@.docs/todo.md`
- 辅助脚本：`.claude/hooks/add-todo.sh`

## 调用方式

用户通过 `/todo` 触发，后可带子命令参数。根据参数判断执行对应操作。

## 子命令与执行步骤

### 1. `/todo` 或 `/todo list` — 查看所有待办

1. 读取 `.docs/todo.md` 文件。
2. 分类展示当前状态：
   - **Open Issues**：列出所有未关闭的 issue。
   - **Pending Tasks**：列出所有 `[ ]` 未勾选的 task。
   - **Suggestions**：列出所有建议项。
3. 汇总统计：`X 个未解决问题 | Y 个待办任务 | Z 条改进建议`。
4. 如果某分类为空，显示"*(无)*"。

### 2. `/todo add <type> <description>` — 添加条目

`type` 为以下之一：`issue`、`task`、`suggest`。

1. 若用户未提供 description，使用 `AskUserQuestion` 询问具体内容。
2. 读取 `.docs/todo.md`，在对应分类区域的占位行 `*(No ...)*` 前插入新条目。
3. 条目格式：
   - issue：`### [ISSUE-XXX] 描述 (YYYY-MM-DD HH:MM)` + `> Context: 上下文`
   - task：`- [ ] 描述 — @上下文 (YYYY-MM-DD HH:MM)`
   - suggest：`- 💡 描述 — @上下文 (YYYY-MM-DD HH:MM)`
4. 输出确认：`已记录 [type]: 描述`。

### 3. `/todo done <关键词>` — 标记完成

1. 读取 `.docs/todo.md`。
2. 用关键词搜索匹配的条目（支持模糊匹配，匹配标题或描述中包含关键词的条目）。
3. 若匹配到多条，列出候选项让用户选择。
4. 将匹配条目：
   - issue：将 `Status: **Open**` 改为 `Status: **Closed**`，并将整条移到 Completed 区域。
   - task：将 `- [ ]` 改为 `- [x]`，移到 Completed 区域。
5. 在 Completed 区域添加：`- [x] 描述 — completed on YYYY-MM-DD`。
6. 输出确认。

### 4. `/todo check <关键词>` — 检查条目状态

1. 读取 `.docs/todo.md`。
2. 搜索包含关键词的所有条目。
3. 展示每个匹配条目的：
   - 当前状态（Open/Closed、Pending/Done、Suggestion）
   - 创建时间
   - 上下文标签
4. 给出结论：该条目是否已完成。

### 5. `/todo pick [关键词]` — 取出一个待办进行讨论

1. 读取 `.docs/todo.md`。
2. 列出所有未完成的 task 和未关闭的 issue。
3. 若提供了关键词，优先匹配；否则列出全部让用户选择。
4. 选定后：
   - 展示该条目的完整信息。
   - 使用 `AskUserQuestion` 询问用户意图：
     - **立即实现**：进入该任务的实现流程。
     - **仅讨论方案**：分析可行性和实现路径，不写代码。
     - **补充上下文**：为该条目追加备注信息。
     - **取消**：不做操作。
5. 根据用户选择执行对应操作。

### 6. `/todo clean` — 清理已完成的条目

1. 读取 `.docs/todo.md`。
2. 统计 Completed 区域的条目数量，向用户确认是否清理。
3. 确认后，将 Completed 区域重置为 `*(No completed items)*`。
4. 同时清理 Open Issues 中 Status 为 Closed 的条目。
5. 输出清理统计：`已清理 X 条已完成记录`。

## 未识别子命令

若用户输入的子命令不在上述范围内，使用 `AskUserQuestion` 询问用户想执行哪个操作（list / add / done / check / pick / clean）。

## 注意事项
- 所有时间使用本地当前时间，格式 `YYYY-MM-DD HH:MM`。
- issue 编号自增，格式 `ISSUE-001`、`ISSUE-002`...
- 文件读写必须基于 Read 工具先读取再编辑，不要覆盖未读内容。
- 保持 todo.md 的 Markdown 格式整洁，每个区域之间有空行分隔。
