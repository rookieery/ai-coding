# 项目文档中心

本目录包含五子棋/中国象棋全栈项目的完整文档，分为两类。

---

## 给人看的文档

面向开发者和产品人员，描述业务功能和技术实现细节。

| 文件 | 内容 |
|------|------|
| [business-overview.md](business-overview.md) | 业务功能全景 —— 产品有哪些功能模块、用户能做什么 |
| [frontend-technical.md](frontend-technical.md) | 前端技术细节 —— Vue 3 架构、组件体系、状态管理、主题、i18n |
| [backend-technical.md](backend-technical.md) | 后端技术细节 —— Express 架构、分层设计、认证、数据库 |
| [ai-system.md](ai-system.md) | AI 系统详解 —— LLM 对弈、棋盘视觉识别、聊天推理 |

## 给 AI Agent 用的速查文件

面向后续迭代开发，帮助 Agent 快速定位代码文件和接口。每个文件都以 **"改 X 找哪里"** 为组织原则。

| 文件 | 用途 |
|------|------|
| [agent-file-map.md](agent-file-map.md) | 文件定位地图 —— 按功能域索引所有关键文件路径 |
| [agent-api-reference.md](agent-api-reference.md) | API 接口速查 —— 全部端点、参数、返回值一览表 |
| [agent-data-models.md](agent-data-models.md) | 数据模型速查 —— 数据库表、TypeScript 类型、前后端格式转换 |
| [agent-component-map.md](agent-component-map.md) | 组件与状态映射 —— 谁负责什么、数据怎么流动 |
