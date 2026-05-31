---
name: ralph
description: "将 PRD Markdown 转换为当前项目 prd.json 格式，供 Ralph 自动化流水线执行。触发词：convert this prd, turn into ralph format, create prd.json from this, 转换 prd, 生成 prd.json。"
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Ralph PRD 转换器

将已有的 PRD Markdown 文件转换为当前项目的 `prd.json` 格式，供 `ralph.sh` 自动化流水线执行。

---

## 核心职责

接收 PRD（Markdown 文件或文本）并将其转换为项目根目录的 `prd.json`。

---

## 输出格式（必须严格遵守）

```json
{
  "branchName": "feature/[feature-name-kebab-case]",
  "stories": [
    {
      "id": "PREFIX-XXX",
      "title": "[Story 标题]",
      "description": "作为 [角色], 我想要 [功能], 以便 [价值]",
      "acceptanceCriteria": [
        "具体可验证的标准 1",
        "具体可验证的标准 2",
        "TypeScript 编译通过"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

### 格式要点

1. **顶层字段**：`branchName` + `stories`（注意：是 `stories`，不是 `userStories`）
2. **branchName**：使用 `feature/xxx` 格式（不加 `ralph/` 前缀），kebab-case
3. **stories 数组**：每个元素包含 `id`、`title`、`description`、`acceptanceCriteria`、`priority`、`passes`、`notes`
4. **所有 Story** 初始 `passes: false`，`notes` 为空字符串
5. **priority**：按依赖顺序编号，1 最高优先

---

## Story 大小：第一准则

**每个 Story 必须能在一次 Ralph 迭代（一个 context window）内完成。**

Ralph 每次迭代启动一个全新的 AI 实例，没有前次记忆。Story 太大会导致 AI 耗尽 context 后产出劣质代码。

### 合适大小的 Story：
- 新增一个数据库字段和迁移
- 在现有页面添加一个 UI 组件
- 更新一个 Service 方法的新逻辑
- 给列表页添加一个筛选下拉框

### 太大的 Story（必须拆分）：
- "构建整个仪表盘" → 拆为：schema、查询、UI 组件、筛选器
- "添加认证系统" → 拆为：schema、中间件、登录 UI、会话管理
- "重构 API" → 拆为：每个端点或模式一个 Story

**经验法则：** 如果无法在 2-3 句话内描述变更内容，则太大。

---

## Story 排序：依赖优先

Story 按 priority 顺序执行。前面的 Story 不能依赖后面的。

**正确顺序：**
1. Schema/数据库变更（迁移）
2. 后端逻辑（Service/Controller）
3. 使用后端的前端 UI 组件
4. 聚合/汇总视图

**错误顺序：**
1. UI 组件（依赖尚不存在的 schema）
2. Schema 变更

---

## 验收标准：必须可验证

每个标准必须是 Ralph 可以**检查**的东西，而不是模糊描述。

### 好的标准（可验证）：
- "给 tasks 表新增 status 列，默认值 'pending'"
- "筛选下拉框包含选项：全部 | 进行中 | 已完成"
- "点击删除按钮弹出确认对话框"
- "TypeScript 编译通过"
- "单元测试通过"

### 坏标准（模糊）：
- "工作正常"
- "用户可以轻松操作"
- "好的用户体验"
- "处理了边界情况"

### 每个 Story 必须包含的最终标准：
```
"TypeScript 编译通过"
```

### 有可测试逻辑的 Story 还需包含：
```
"单元测试通过"
```

### 有 UI 变更的 Story 还需包含：
```
"使用 Chrome DevTools MCP 验证渲染"
```

---

## 转换规则

1. **每个用户故事** → 一个 JSON 条目
2. **ID 格式**：保持 PRD 中的 ID 不变（如 `ONLINE-030`、`XIANGQI-005`）
3. **Priority**：按依赖顺序编号，然后按文档顺序
4. **所有 Story**：`passes: false`，`notes: ""`
5. **branchName**：从功能名派生，`feature/` 前缀，kebab-case
6. **每个 Story** 必须包含 `"TypeScript 编译通过"` 作为验收标准

---

## 拆分大型 PRD

如果 PRD 中的功能过大，主动拆分：

**原始：**
> "添加用户通知系统"

**拆分为：**
1. PREFIX-001: 新增 notifications 数据库表
2. PREFIX-002: 创建通知发送 Service
3. PREFIX-003: 添加通知铃铛图标到 Header
4. PREFIX-004: 创建通知下拉面板
5. PREFIX-005: 添加标记已读功能
6. PREFIX-006: 添加通知偏好设置页面

每个都是独立的、可完成和验证的聚焦变更。

---

## 归档机制（写入前必须检查）

写入新的 `prd.json` 前，必须处理已有的归档：

1. **读取当前 `prd.json`**（如果存在）
2. **检查 `branchName`** 是否与新功能的分支名不同
3. **如果不同且 `prd_archive.json` 存在内容**：
   - 当前项目使用 `prd_archive.json` 文件式归档（不是目录式）
   - `archive.js` 脚本会在每次 Ralph 迭代开始时自动归档已完成的 Story
   - 此处只需确保不覆盖 `prd_archive.json` 中的已有数据
4. **重置 `progress.txt`**：如果新功能的 branchName 与上次不同，在 `progress.txt` 头部追加新的 "Started" 行

---

## 输入来源

此 Skill 支持两种输入：

### 1. 从文件转换
用户提供 PRD 文件路径：
```
/ralph tasks/prd-spectator.md
```

### 2. 从 planner 输出转换
用户提供 planner subagent 的 PRD 内容块：
```
/ralph （自动提取最近的 <!-- PRD-START -->...<!-- PRD-END --> 内容）
```

---

## 保存前检查清单

- [ ] 顶层字段使用 `stories`（不是 `userStories`）
- [ ] `branchName` 使用 `feature/xxx` 格式（无 `ralph/` 前缀）
- [ ] 每个 Story 足够小，可在一次迭代内完成
- [ ] Story 按依赖排序（schema → 后端 → UI）
- [ ] 每个 Story 包含 `"TypeScript 编译通过"` 作为验收标准
- [ ] UI Story 包含 `"使用 Chrome DevTools MCP 验证渲染"` 作为验收标准
- [ ] 验收标准全部可验证（无模糊表述）
- [ ] 没有 Story 依赖于排在它后面的 Story
- [ ] JSON 格式合法（无中文引号、无尾逗号）
- [ ] 如已有 `prd.json` 且分支不同，已处理归档
