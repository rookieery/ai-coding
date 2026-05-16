# Agent 组件与状态映射

> 描述前端组件层级关系、数据流动路径、状态管理边界。帮助快速定位"改这个功能要动哪些文件"。

---

## 组件层级树

```
App.vue
├── router-view (keep-alive)
│   ├── AgentView.vue ★ 主页面
│   │   ├── AgentChatMessages.vue
│   │   │   ├── ThinkingProcess.vue
│   │   │   ├── AnswerContent.vue
│   │   │   └── MessageActions.vue
│   │   ├── AgentChatInput.vue
│   │   ├── AgentWelcomeScreen.vue
│   │   ├── AgentGomokuPanel.vue ★ (条件渲染)
│   │   ├── AgentChessPanel.vue ★ (条件渲染)
│   │   ├── AgentVisionPanel.vue ★ (条件渲染)
│   │   └── AgentChessVisionPanel.vue ★ (条件渲染)
│   │
│   ├── LoginView.vue
│   │   └── ChessParticleBackground.vue
│   │
│   ├── AdminView.vue
│   │
│   ├── GameView.vue (独立五子棋)
│   │   ├── Board.vue (gomoku)
│   │   ├── GameControls.vue (gomoku)
│   │   ├── HistoryPanel.vue (gomoku)
│   │   ├── SaveGameModal.vue
│   │   ├── GameRecordsModal.vue
│   │   ├── DeleteConfirmModal.vue
│   │   ├── NotificationToast.vue
│   │   └── VisionConfirmationPanel.vue
│   │
│   └── ChineseChessView.vue (独立象棋)
│       ├── Board.vue (chinese-chess)
│       ├── GameControls.vue (chinese-chess)
│       ├── HistoryPanel.vue (chinese-chess)
│       ├── SaveGameModal.vue
│       ├── GameRecordsModal.vue
│       ├── DeleteConfirmModal.vue
│       └── NotificationToast.vue
```

---

## 数据流：AI 聊天

```
用户输入
  │
  ▼
AgentChatInput.vue ──── useAgentChat.sendMessage()
  │                           │
  │                           ├── chatApi.streamChat()  [POST /api/chat/stream]
  │                           │        │
  │                           │        ▼ SSE 流
  │                           ├── useTypewriterQueue 缓冲文本
  │                           │        │
  │                           │        ▼ 逐字渲染
  │                           └── 更新 messages[]
  │                                    │
  ▼                                    ▼
AgentChatMessages.vue ◄─────── 响应式渲染消息列表
  ├── ThinkingProcess.vue  (reasoningContent)
  ├── AnswerContent.vue    (text → markdown-it)
  └── MessageActions.vue   (copy/regenerate/speak)
```

---

## 数据流：五子棋 AI 对弈（Agent 模式）

```
AgentView.vue 检测到落子意图
  │
  ├── 解析坐标 (如 "H8")
  │
  ▼
AgentGomokuPanel.vue
  │  自管理棋盘状态 (board[][], currentPlayer, history[])
  │
  ├── 用户落子 → 更新棋盘 → 检查胜负
  │
  ├── 调用 AI 走子:
  │   ├── 前端 AI: ai.ts / minimaxAI.ts / expertAI.ts / neuralAI.ts
  │   └── 后端 AI: gomokuAiApi.move() → POST /api/games/gomoku/llm/move
  │                      │
  │                      ▼ 后端流水线
  │              threatDetector → candidateGenerator → DeepSeek LLM
  │
  └── AI 落子 → 更新棋盘 → 检查胜负 → 渲染
```

---

## 数据流：棋盘视觉识别

```
用户上传图片 (AgentChatInput 或 GameView)
  │
  ▼
visionApi.recognizeStream()  [POST /api/vision/recognize/stream]
  │
  ▼ 后端
UnifiedVisionService → 自动判断棋盘类型
  │
  ├── Gomoku → VisionService → 豆包多模态 API
  └── Chess  → ChessVisionService → 豆包多模态 API
  │
  ▼ 返回 3 个候选棋盘矩阵
useVisionBridge (跨组件状态桥)
  │
  ├── AgentVisionPanel.vue (五子棋) ── 编辑/选择/确认
  └── AgentChessVisionPanel.vue (象棋) ── 编辑/选择/确认
  │
  ▼ 用户确认
AgentGomokuPanel.vue / AgentChessPanel.vue ← 加载棋盘状态
```

---

## 数据流：棋局保存与加载

```
保存:
  Board.vue/GameControls.vue
    → gameApi.createGame() [POST /api/games/frontend]
    → 后端 game-converter.ts 格式转换
    → Prisma 写入 Game 表

加载:
  GameRecordsModal.vue
    → gameApi.getGames() [GET /api/games/frontend]
    → 后端 game-converter.ts 反向转换
    → Board.vue 还原棋盘
```

---

## 状态管理边界

### 全局状态 (跨页面持久化)

| 状态 | 管理 Composable | 存储方式 | 影响范围 |
|------|----------------|---------|---------|
| 认证 (user, token) | `useGlobalAuth()` | localStorage | 所有页面 |
| 游戏模式 | `useGlobalAgentPlay()` | 内存 | AgentView |
| 五子棋主题 | `useGlobalSettings()` | localStorage `gomoku_theme` | 五子棋相关 |
| 象棋主题 | `useGlobalSettings()` | localStorage `chess_theme` | 象棋相关 |
| 全局主题 (light/dark) | `i18n.ts` currentTheme | localStorage `gomoku_theme` key | 全局 |
| 语言 | `i18n.ts` currentLocale | localStorage `gomoku_locale` | 全局 |

### 组件局部状态 (不跨页面)

| 状态 | 所在组件 | 说明 |
|------|---------|------|
| 棋盘矩阵 board[][] | `AgentGomokuPanel`, `AgentChessPanel`, `GameView`, `ChineseChessView` | 游戏核心状态 |
| 走子历史 | 同上 | Move[] 数组 |
| AI 思考中 | 同上 | loading 状态 |
| 聊天消息 messages[] | `useAgentChat` | 最多 50 条 |
| 候选棋盘 | `useVisionBridge` | 视觉识别结果 |
| 分屏比例 | `useSplitDrag` | 25%-50% |

---

## 关键 Composable 依赖关系

```
AgentView.vue (协调者)
  ├── useAgentGomoku     (五子棋对弈: 落子/AI回应/走子拦截)
  │     └── gomoku-ai-api.ts
  ├── useAgentChess      (象棋对弈: 走子/AI回应/将军检测)
  │     └── chessLlmApi.ts
  ├── useAgentVision     (视觉识别: 确认回放/分析/挂起请求)
  │     └── useVisionBridge (共享状态桥)
  ├── useAgentChat       (AI 聊天: SSE 流式/打字机效果)
  │     └── useTypewriterQueue
  └── useSplitDrag       (分屏面板拖拽)

useAuth
  ├── auth-api.ts         (认证 API)
  └── localStorage        (token/user 持久化)

useVisionBridge
  └── (纯响应式状态桥，无 API 调用)

useBackgroundMusic
  └── HTMLAudioElement    (Web Audio API)

useSpeech
  └── SpeechSynthesis     (Web Speech API)
```

---

## 主题与样式修改指南

### 改全局主题色
- 文件：`gomoku-web/src/index.css`（`.dark` class 下的颜色映射）

### 改棋盘主题
- 文件：`gomoku-web/src/common/theme.ts`（4 种主题各 14 个颜色变量）
- 变量：boardBackground, lineColor, piecePrimary, pieceSecondary 等

### 改翻译文本
- 文件：`gomoku-web/src/locales/zh-CN.json` 和 `en-US.json`
- 新增 key 后无需额外配置（`MessageKey` 类型自动推导）

### 改 Markdown 渲染样式
- 文件：`gomoku-web/src/index.css`（`.markdown-body` 下的样式）
