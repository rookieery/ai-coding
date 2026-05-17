# Agent 文件定位地图

> 本文件帮助 AI Agent 在迭代需求时快速定位代码文件。按功能域组织。

---

## 前端 (gomoku-web)

### 入口与配置
| 要改什么 | 文件路径 |
|---------|---------|
| 应用入口、全局初始化 | `gomoku-web/src/main.ts` |
| 根组件、路由视图、keep-alive | `gomoku-web/src/App.vue` |
| 路由定义、导航守卫 | `gomoku-web/src/router/index.ts` |
| 全局样式、Tailwind 配置 | `gomoku-web/src/index.css` |
| i18n + 主题切换逻辑 | `gomoku-web/src/i18n.ts` |
| 应用配置常量 | `gomoku-web/src/config.ts` |
| Vite 构建配置 | `gomoku-web/vite.config.ts` |
| 环境变量 | `gomoku-web/.env` / `.env.development` / `.env.production` |

### 页面视图
| 要改什么 | 文件路径 |
|---------|---------|
| AI Agent 主页（分屏布局） | `gomoku-web/src/views/AgentView.vue` |
| 登录/注册页 | `gomoku-web/src/views/LoginView.vue` |
| 管理后台页 | `gomoku-web/src/views/AdminView.vue` |
| 独立五子棋页 | `gomoku-web/src/views/GameView.vue` |
| 独立象棋页 | `gomoku-web/src/views/ChineseChessView.vue` |
| 在线大厅页 | `gomoku-web/src/games/gomoku/views/OnlineLobbyView.vue` |
| 在线对弈页 | `gomoku-web/src/games/gomoku/views/OnlineGameView.vue` |

### Agent 组件
| 要改什么 | 文件路径 |
|---------|---------|
| 聊天消息列表（流式渲染、Markdown、操作按钮） | `gomoku-web/src/components/agent/AgentChatMessages.vue` |
| 聊天输入框（自动高度、图片上传、停止生成） | `gomoku-web/src/components/agent/AgentChatInput.vue` |
| Agent 内嵌五子棋面板 | `gomoku-web/src/components/AgentGomokuPanel.vue` |
| Agent 内嵌象棋面板 | `gomoku-web/src/components/agent/AgentChessPanel.vue` |
| 五子棋视觉确认面板 | `gomoku-web/src/components/agent/AgentVisionPanel.vue` |
| 象棋视觉确认面板 | `gomoku-web/src/components/agent/AgentChessVisionPanel.vue` |
| 欢迎屏幕 | `gomoku-web/src/components/agent/AgentWelcomeScreen.vue` |
| 棋子粒子动画背景 | `gomoku-web/src/components/ChessParticleBackground.vue` |

### 五子棋组件
| 要改什么 | 文件路径 |
|---------|---------|
| 15x15 棋盘渲染 | `gomoku-web/src/games/gomoku/components/Board.vue` |
| 游戏控制栏（模式、难度、主题等） | `gomoku-web/src/games/gomoku/components/GameControls.vue` |
| 走子历史面板 | `gomoku-web/src/games/gomoku/components/HistoryPanel.vue` |
| 保存棋局弹窗 | `gomoku-web/src/games/gomoku/components/SaveGameModal.vue` |
| 棋局记录列表弹窗 | `gomoku-web/src/games/gomoku/components/GameRecordsModal.vue` |
| 删除确认弹窗 | `gomoku-web/src/games/gomoku/components/DeleteConfirmModal.vue` |
| 在线房间列表 | `gomoku-web/src/games/gomoku/components/online/RoomList.vue` |
| 在线房间卡片 | `gomoku-web/src/games/gomoku/components/online/RoomCard.vue` |
| 创建房间弹窗 | `gomoku-web/src/games/gomoku/components/online/CreateRoomModal.vue` |
| 在线对弈棋盘 | `gomoku-web/src/games/gomoku/components/online/OnlineBoard.vue` |
| 聊天面板 | `gomoku-web/src/games/gomoku/components/online/ChatPanel.vue` |
| 玩家信息栏 | `gomoku-web/src/games/gomoku/components/online/PlayerInfo.vue` |
| 观战者列表 | `gomoku-web/src/games/gomoku/components/online/SpectatorList.vue` |
| Toast 通知 | `gomoku-web/src/games/gomoku/components/NotificationToast.vue` |
| 全屏视觉确认面板 | `gomoku-web/src/games/gomoku/components/VisionConfirmationPanel.vue` |

### 五子棋 AI 引擎（核心逻辑模块）
| 要改什么 | 文件路径 |
|---------|---------|
| 公共 API 门面（re-export + findBestMove） | `gomoku-web/src/games/gomoku/gameLogic.ts` |
| 常量、类型、胜负判定、禁手检测 | `gomoku-web/src/games/gomoku/gameConstants.ts` |
| 棋型评分、单点/全局评估、强迫着检测 | `gomoku-web/src/games/gomoku/gameEvaluation.ts` |
| 候选着法生成（含禁手过滤） | `gomoku-web/src/games/gomoku/gameMoves.ts` |
| Zobrist 哈希、置换表、PVS 搜索、VCF 算杀 | `gomoku-web/src/games/gomoku/gameSearch.ts` |

### 五子棋 AI 引擎（辅助工具模块）
| 要改什么 | 文件路径 |
|---------|---------|
| 入门/中级 AI（启发式） | `gomoku-web/src/games/gomoku/utils/ai.ts` |
| 高级 AI（Minimax depth 8） | `gomoku-web/src/games/gomoku/utils/minimaxAI.ts` |
| 专家 AI（PVS + VCF depth 12-14） | `gomoku-web/src/games/gomoku/utils/expertAI.ts` |
| 神经网络 AI（TensorFlow.js） | `gomoku-web/src/games/gomoku/utils/neuralAI.ts` |
| 棋型评估工具 | `gomoku-web/src/games/gomoku/utils/evaluator.ts` |
| 走子合法性、胜负判断 | `gomoku-web/src/games/gomoku/utils/boardUtils.ts` |
| 禁手规则（连珠模式） | `gomoku-web/src/games/gomoku/utils/forbiddenMove.ts` |
| 开局库 | `gomoku-web/src/games/gomoku/utils/openingBook.ts` |

### 象棋组件与引擎
| 要改什么 | 文件路径 |
|---------|---------|
| 9x10 棋盘渲染 | `gomoku-web/src/games/chinese-chess/components/Board.vue` |
| 游戏控制栏 | `gomoku-web/src/games/chinese-chess/components/GameControls.vue` |
| 走子历史 | `gomoku-web/src/games/chinese-chess/components/HistoryPanel.vue` |
| 保存/记录/删除弹窗 | `gomoku-web/src/games/chinese-chess/components/` |
| 走法规则、将军检测 | `gomoku-web/src/games/chinese-chess/utils/chessRules.ts` |
| AI Worker（Minimax） | `gomoku-web/src/games/chinese-chess/utils/chessWorker.ts` |

### 前端 API 层
| 要改什么 | 文件路径 |
|---------|---------|
| 认证 API | `gomoku-web/src/api/auth-api.ts` |
| 聊天 API（普通 + 流式） | `gomoku-web/src/api/chat-api.ts` |
| 棋局 CRUD API | `gomoku-web/src/api/game-api.ts` |
| 五子棋 LLM AI API | `gomoku-web/src/api/gomoku-ai-api.ts` |
| 管理员 API | `gomoku-web/src/api/admin-api.ts` |
| 视觉识别 API | `gomoku-web/src/api/vision-api.ts` |
| 象棋编码转换 | `gomoku-web/src/api/chess-vision-api.ts` |
| 房间 REST API | `gomoku-web/src/api/room-api.ts` |
| 五子棋 LLM API（游戏模块内） | `gomoku-web/src/games/gomoku/api/llmApi.ts` |
| 象棋 LLM API（游戏模块内） | `gomoku-web/src/games/chinese-chess/api/chessLlmApi.ts` |

### Composables
| 要改什么 | 文件路径 |
|---------|---------|
| AI 聊天（SSE、打字机） | `gomoku-web/src/composables/useAgentChat.ts` |
| Agent 游戏模式管理 | `gomoku-web/src/composables/useAgentPlay.ts` |
| Agent 五子棋对弈逻辑（落子/AI回应/走子拦截） | `gomoku-web/src/composables/useAgentGomoku.ts` |
| Agent 象棋对弈逻辑（走子/AI回应/将军检测） | `gomoku-web/src/composables/useAgentChess.ts` |
| Agent 视觉识别（确认回放/分析/挂起请求） | `gomoku-web/src/composables/useAgentVision.ts` |
| 认证状态（登录/注册/Token） | `gomoku-web/src/composables/useAuth.ts` |
| 背景音乐 | `gomoku-web/src/composables/useBackgroundMusic.ts` |
| 剪贴板 | `gomoku-web/src/composables/useClipboard.ts` |
| Markdown 渲染 | `gomoku-web/src/composables/useMarkdown.ts` |
| 主题/语言设置 | `gomoku-web/src/composables/useSettings.ts` |
| 文本转语音 | `gomoku-web/src/composables/useSpeech.ts` |
| 分屏拖拽 | `gomoku-web/src/composables/useSplitDrag.ts` |
| 打字机动画引擎 | `gomoku-web/src/composables/useTypewriterQueue.ts` |
| 输入框自动高度 | `gomoku-web/src/composables/useAutoResize.ts` |
| 视觉识别跨组件通信 | `gomoku-web/src/composables/useVisionBridge.ts` |
| 在线对弈核心状态 | `gomoku-web/src/composables/useOnlineGame.ts` |
| 房间列表/加入/离开 | `gomoku-web/src/composables/useRoom.ts` |
| 实时聊天 | `gomoku-web/src/composables/useChat.ts` |
| 匹配队列（规划中） | `gomoku-web/src/composables/useMatchmaking.ts` |

### 共享组件
| 要改什么 | 文件路径 |
|---------|---------|
| 修改密码弹窗 | `gomoku-web/src/common/components/ui/SettingsModal.vue` |
| AI 回复内容渲染 | `gomoku-web/src/common/components/ui/AnswerContent.vue` |
| 消息操作按钮（复制/重新生成/朗读） | `gomoku-web/src/common/components/ui/MessageActions.vue` |
| 思考过程折叠展示 | `gomoku-web/src/common/components/ui/ThinkingProcess.vue` |
| 主题选择器 | `gomoku-web/src/common/components/ThemeSelector.vue` |
| 棋盘主题定义 | `gomoku-web/src/common/theme.ts` |

### 翻译与工具
| 要改什么 | 文件路径 |
|---------|---------|
| 中文翻译 | `gomoku-web/src/locales/zh-CN.json` |
| 英文翻译 | `gomoku-web/src/locales/en-US.json` |
| 密码校验 | `gomoku-web/src/utils/password.ts` |
| Socket.io 客户端单例 | `gomoku-web/src/services/socket.service.ts` |

---

## 后端 (gomoku-server)

### 入口与配置
| 要改什么 | 文件路径 |
|---------|---------|
| Express 应用入口、中间件挂载 | `gomoku-server/src/app.ts` |
| 环境变量配置 | `gomoku-server/.env` |
| 配置校验 | `gomoku-server/src/config/index.ts` |
| Prisma Schema | `gomoku-server/prisma/schema.prisma` |
| Docker 配置 | `gomoku-server/Dockerfile` / `docker-compose.yml` |

### 中间件
| 要改什么 | 文件路径 |
|---------|---------|
| JWT 认证（authenticate/optionalAuthenticate/requireAdmin） | `gomoku-server/src/middleware/auth.ts` |
| Zod 请求校验 | `gomoku-server/src/middleware/validation.ts` |

### 控制器
| 要改什么 | 文件路径 |
|---------|---------|
| 认证（注册/登录/用户信息） | `gomoku-server/src/controllers/auth.controller.ts` |
| 用户（积分查询/排行榜） | `gomoku-server/src/controllers/user.controller.ts` |
| 管理员（用户列表/删除） | `gomoku-server/src/controllers/admin.controller.ts` |
| 棋局 CRUD | `gomoku-server/src/controllers/game.controller.ts` |
| 五子棋棋局 | `gomoku-server/src/controllers/gomoku.controller.ts` |
| 象棋棋局 | `gomoku-server/src/controllers/chinese-chess.controller.ts` |
| 房间 REST 控制器（房间列表/详情） | `gomoku-server/src/controllers/room.controller.ts` |
| AI 聊天 | `gomoku-server/src/controllers/chat.controller.ts` |
| 五子棋 LLM AI | `gomoku-server/src/controllers/llm-ai.controller.ts` |
| 象棋 LLM AI | `gomoku-server/src/controllers/chess-llm.controller.ts` |

### 服务
| 要改什么 | 文件路径 |
|---------|---------|
| 认证业务逻辑 | `gomoku-server/src/services/auth.service.ts` |
| 棋局 CRUD 业务逻辑 | `gomoku-server/src/services/game.service.ts` |
| 五子棋棋局（GameService 包装） | `gomoku-server/src/services/gomoku.service.ts` |
| 象棋棋局（GameService 包装） | `gomoku-server/src/services/chinese-chess.service.ts` |
| AI 聊天（DeepSeek reasoner） | `gomoku-server/src/services/chat.service.ts` |
| 五子棋 AI 走子 | `gomoku-server/src/services/llm-ai.service.ts` |
| 象棋 AI 走子 | `gomoku-server/src/services/chess-llm.service.ts` |
| 五子棋盘识别 | `gomoku-server/src/services/vision.service.ts` |
| 象棋盘识别 | `gomoku-server/src/services/chess-vision.service.ts` |
| 统一视觉识别（自动判断棋盘类型） | `gomoku-server/src/services/unified-vision.service.ts` |
| 房间业务逻辑 | `gomoku-server/src/services/room.service.ts` |
| 在线对弈逻辑（含排位赛 ELO 集成） | `gomoku-server/src/services/online-game.service.ts` |
| 断线重连管理（60s 倒计时 + 重连取消 + 排位赛 ELO） | `gomoku-server/src/services/disconnect.service.ts` |
| ELO 积分计算（标准 ELO + K-factor 动态调整） | `gomoku-server/src/services/elo.service.ts` |
| 匹配服务（内存队列 + 动态积分阈值 + 防重复入队） | `gomoku-server/src/services/matchmaking.service.ts` |
| 匹配服务单元测试（14 个测试用例） | `gomoku-server/src/services/matchmaking.service.test.ts` |

### 路由
| 要改什么 | 文件路径 |
|---------|---------|
| 路由聚合 | `gomoku-server/src/routes/index.ts` |
| 认证路由 | `gomoku-server/src/routes/auth.routes.ts` |
| 用户路由（积分/排行榜） | `gomoku-server/src/routes/user.routes.ts` |
| 管理员路由 | `gomoku-server/src/routes/admin.routes.ts` |
| 棋局路由 | `gomoku-server/src/routes/game.routes.ts` |
| 聊天路由 | `gomoku-server/src/routes/chat.routes.ts` |
| 视觉识别路由 | `gomoku-server/src/routes/vision.routes.ts` |
| 五子棋路由 | `gomoku-server/src/routes/games/gomoku.routes.ts` |
| 象棋路由 | `gomoku-server/src/routes/games/chinese-chess.routes.ts` |
| 房间路由（房间列表/详情） | `gomoku-server/src/routes/room.routes.ts` |

### AI 工具模块
| 要改什么 | 文件路径 |
|---------|---------|
| 五子棋 LLM 提示词构建 | `gomoku-server/src/utils/boardPromptUtils.ts` |
| 五子棋威胁检测 | `gomoku-server/src/utils/threatDetector.ts` |
| 五子棋候选走法生成 | `gomoku-server/src/utils/candidateGenerator.ts` |
| 象棋 LLM 提示词构建 | `gomoku-server/src/utils/chessBoardPromptUtils.ts` |
| 象棋候选走法生成 | `gomoku-server/src/utils/chessCandidateGenerator.ts` |
| 象棋威胁检测 | `gomoku-server/src/utils/chessThreatDetector.ts` |

### Socket.io
| 要改什么 | 文件路径 |
|---------|---------|
| Socket.io 初始化入口（含断线重连 + 观战者清理） | `gomoku-server/src/socket/index.ts` |
| Socket 事件类型定义 | `gomoku-server/src/socket/types.ts` |
| Socket 认证中间件 | `gomoku-server/src/socket/middleware.ts` |
| 房间事件处理（含观战验证） | `gomoku-server/src/socket/handlers/room.handler.ts` |
| 对弈事件处理（含观战者权限拦截） | `gomoku-server/src/socket/handlers/game.handler.ts` |
| 聊天事件处理 | `gomoku-server/src/socket/handlers/chat.handler.ts` |
| 匹配事件处理 | `gomoku-server/src/socket/handlers/match.handler.ts` |

### 工具与类型
| 要改什么 | 文件路径 |
|---------|---------|
| 日志工具 | `gomoku-server/src/utils/logger.ts` |
| Zod 校验 Schema | `gomoku-server/src/utils/validator.ts` |
| 前后端棋局格式转换 | `gomoku-server/src/utils/game-converter.ts` |
| 通用类型定义 | `gomoku-server/src/types/index.ts` |
| 五子棋 AI 类型 | `gomoku-server/src/types/llm.types.ts` |
| 象棋 AI 类型 | `gomoku-server/src/types/chess-llm.types.ts` |

### 数据库
| 要改什么 | 文件路径 |
|---------|---------|
| Schema 定义 | `gomoku-server/prisma/schema.prisma` |
| 初始迁移 | `gomoku-server/prisma/migrations/20260331155201_init/` |
| phone 字段迁移 | `gomoku-server/prisma/migrations/20260405053632_add_phone_field/` |
| role 字段迁移 | `gomoku-server/prisma/migrations/20260405062110_add_user_role_field/` |
| gameType 字段迁移 | `gomoku-server/prisma/migrations/20260420140717_add_game_type/` |
