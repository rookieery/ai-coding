# 前端技术细节

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue 3 (Composition API + `<script setup>`) | 3.5 |
| 构建工具 | Vite | 6.2 |
| 语言 | TypeScript | 5.8 |
| CSS | Tailwind CSS | 4.1 |
| 路由 | Vue Router | 4.6 |
| AI/ML | TensorFlow.js | 4.22 |
| Markdown | markdown-it | 14.1 |
| 图标 | Lucide Vue Next | 0.577 |
| 截图 | html2canvas-pro | 2.0 |
| 测试 | Vitest | 2.0 |

**不使用** Vuex/Pinia。状态管理完全基于 Vue Composition API 的 composables + 全局单例模式。

---

## 项目结构

```
gomoku-web/src/
├── main.ts                  # 入口：挂载 App，初始化 auth
├── App.vue                  # 根组件：路由视图 + keep-alive
├── config.ts                # 应用配置
├── i18n.ts                  # 国际化 + 主题管理
├── index.css                # 全局样式 + Tailwind
├── router/index.ts          # 路由定义 + 导航守卫
├── api/                     # API 服务层（7 个模块）
├── common/                  # 共享组件 + 主题定义
├── components/              # 应用级组件（Agent 相关）
├── composables/             # 可组合函数（17 个）
├── games/                   # 游戏模块
│   ├── gomoku/              # 五子棋（组件 + AI 引擎 + API）
│   └── chinese-chess/       # 中国象棋（组件 + AI 引擎 + API）
├── locales/                 # 翻译文件（zh-CN, en-US）
├── music/                   # 背景音乐 MP3
├── types/                   # TypeScript 类型定义
├── utils/                   # 工具函数
└── views/                   # 页面级组件（4 个视图）
```

---

## 路由

| 路径 | 视图 | 认证 | 说明 |
|------|------|------|------|
| `/` | `AgentView.vue` | 需要 | AI Agent 主页面 |
| `/game` | `GameView.vue` | 需要 | 独立五子棋页面 |
| `/login` | `LoginView.vue` | 仅游客 | 登录/注册 |
| `/admin` | `AdminView.vue` | ADMIN | 管理后台 |
| `/chinese-chess` | `ChineseChessView.vue` | 需要 | 独立象棋页面 |
| `/online` | `OnlineLobbyView.vue` | 不需要 | 在线对弈大厅（游客可浏览） |
| `/online/room/:id` | `OnlineGameView.vue` | 不需要 | 在线对弈房间（游客可观战） |

路由守卫：未登录重定向到 `/login`，已登录访问 `/login` 重定向到 `/`。`AgentView`、`GameView`、`AdminView`、`ChineseChessView`、`OnlineLobbyView`、`OnlineGameView` 使用 `<keep-alive>` 缓存。

---

## 状态管理架构

没有使用 Vuex/Pinia，全部通过 **composable + 全局单例** 实现：

### 全局单例 Composables
| Composable | 状态 | 存储位置 |
|-----------|------|---------|
| `useGlobalAuth()` | 用户信息、Token、登录状态 | localStorage |
| `useGlobalAgentPlay()` | 当前游戏模式、面板状态 | 内存 |
| `useGlobalSettings()` | 棋盘主题设置 | localStorage |

### 功能 Composables
| Composable | 职责 |
|-----------|------|
| `useAgentChat` | AI 聊天：SSE 流式消息、打字机效果、历史管理 |
| `useAgentGomoku` | 五子棋对弈：用户落子→AI回应、AI先手、走子拦截 |
| `useAgentChess` | 象棋对弈：用户走子→AI回应、AI先手、将军检测、走子拦截 |
| `useAgentVision` | 视觉识别：五子棋/象棋确认回放、确认分析、挂起分析处理 |
| `useAutoResize` | 聊天输入框自动调整高度 |
| `useBackgroundMusic` | 背景音乐播放器（默认关闭，用户手动开启） |
| `useClipboard` | 剪贴板操作 |
| `useMarkdown` | Markdown 渲染 |
| `useSpeech` | 文本转语音 |
| `useSplitDrag` | 分屏面板拖拽 |
| `useTypewriterQueue` | 打字机动画引擎 |
| `useVisionBridge` | 视觉识别跨组件通信桥 |
| `useOnlineGame` | 在线对弈：棋盘状态、轮次逻辑、Socket game 事件 |
| `useRoom` | 房间管理：房间列表、加入/离开/观战、Socket room 事件 |
| `useChat` | 实时聊天：频道隔离（players/spectators）、Socket chat 事件 |
| `useMatchmaking` | 匹配队列：排队/取消/匹配成功自动跳转、Socket match 事件 |

### 跨组件通信
`useVisionBridge()` 是一个响应式状态桥，用于在 GameView、AgentView 和视觉确认面板之间传递识别候选、分析请求和复盘标志。

---

## 主题系统

### 全局主题
- `currentTheme`: `'light' | 'dark'`
- 通过在根元素切换 `.dark` class 实现
- 持久化到 localStorage 的 `gomoku_theme` key

### 棋盘主题
- 4 种风格：`default`（经典木纹）、`zen`（水墨）、`cyber`（赛博朋克）、`minimal`（极简）
- 每种主题定义 14 个语义化颜色变量（棋盘背景、线条、棋子颜色等）
- 五子棋和中国象棋各有独立主题设置
- 所有颜色值都是 Tailwind class 字符串，包含 dark: 变体

### CSS 规范
- 使用 `@import "tailwindcss"` 引入 Tailwind
- 自定义 `.markdown-body` 样式用于 AI 回复渲染
- 严禁硬编码 HEX 颜色，使用语义化 Tailwind class

---

## 国际化 (i18n)

自研轻量方案，无第三方依赖：
- 翻译文件：`locales/zh-CN.json` 和 `locales/en-US.json`
- `t(key, ...args)` 函数，支持位置参数插值（`{0}`, `{1}`）
- `MessageKey` 类型确保所有翻译 key 编译时校验
- 约 370+ 翻译词条（含 52 个 online 前缀在线对弈词条）
- 语言偏好持久化到 localStorage 的 `gomoku_locale` key

---

## API 层

所有 API 调用使用原生 `fetch()`，Bearer Token 从 localStorage 读取。基础 URL 通过环境变量 `VITE_API_BASE_URL` 配置。

| 服务文件 | 端点前缀 | 职责 |
|---------|---------|------|
| `auth-api.ts` | `/auth` | 注册、登录、用户信息、改密 |
| `chat-api.ts` | `/chat` | AI 聊天（普通 + SSE 流式） |
| `game-api.ts` | `/games` | 棋局 CRUD（五子棋 + 象棋通用） |
| `gomoku-ai-api.ts` | `/games/gomoku/llm` | 五子棋 AI 走子 |
| `admin-api.ts` | `/admin` | 用户管理 |
| `vision-api.ts` | `/vision` | 棋盘图片识别 |
| `chess-vision-api.ts` | (工具模块) | 象棋棋子编码转换 |

---

## 五子棋 AI 引擎

前端内置完整的五子棋 AI 引擎，纯 TypeScript 实现：

### 启发式评估
- 四方向扫描棋盘，识别棋型（五连、活四、冲四、活三、眠三、活二、眠二）
- 带权重的攻防综合评分

### Minimax 搜索
- Alpha-Beta 剪枝
- PVS（主要变例搜索）
- Zobrist 哈希 + 置换表
- 杀手启发 + 历史启发
- 迭代加深
- VCF（连续冲四取胜）搜索

### 神经网络
- TensorFlow.js 加载预训练模型
- `GomokuNN` 类封装推理逻辑
- 支持从文件加载或随机初始化

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:3003/api` |
| `VITE_SOCKET_URL` | Socket.io 服务器地址 | 自动从 `VITE_API_BASE_URL` 推导 |

---

## 构建与部署

```bash
# 开发
npm run dev          # Vite dev server

# 构建
npm run build        # TypeScript 检查 + Vite 构建

# 测试
npm run test         # Vitest
```
