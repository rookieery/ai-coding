# 后端技术细节

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 语言 | TypeScript | 5.x |
| 运行时 | Node.js | 18+ |
| 框架 | Express.js | 4.18 |
| ORM | Prisma | 5.x |
| 数据库 | SQLite (开发) / PostgreSQL (Docker) / MySQL (Schema 声明) | - |
| 认证 | JWT (jsonwebtoken) + bcryptjs | 9.x |
| 校验 | Zod | 3.x |
| AI | OpenAI SDK (调用 DeepSeek / 豆包) | - |
| 安全 | helmet, cors | 7.x, 2.8 |
| 测试 | Jest + ts-jest + supertest | 29 |
| 部署 | Docker (多阶段构建) + docker-compose | - |

---

## 项目结构

```
gomoku-server/src/
├── app.ts                   # Express 应用入口 + 中间件配置
├── config.ts                # 旧配置文件
├── config/index.ts          # 新配置（含环境变量校验）
├── middleware/
│   ├── auth.ts              # JWT 认证 + 管理员权限
│   └── validation.ts        # Zod 请求校验中间件
├── controllers/             # 8 个控制器
├── services/                # 12 个服务
├── routes/                  # 路由定义
│   ├── index.ts             # 路由聚合
│   └── games/               # 游戏子路由
├── types/                   # 类型定义
│   ├── index.ts             # 通用类型
│   ├── llm.types.ts         # 五子棋 AI 类型
│   └── chess-llm.types.ts   # 象棋 AI 类型
└── utils/                   # 工具模块
    ├── logger.ts            # 日志
    ├── validator.ts          # Zod schemas
    ├── game-converter.ts    # 前后端格式转换
    ├── boardPromptUtils.ts  # 五子棋 LLM 提示词
    ├── threatDetector.ts    # 五子棋威胁检测
    ├── candidateGenerator.ts    # 五子棋候选走法
    ├── chessBoardPromptUtils.ts # 象棋 LLM 提示词
    ├── chessCandidateGenerator.ts # 象棋候选走法
    └── chessThreatDetector.ts   # 象棋威胁检测
```

---

## 分层架构

严格遵循 **Controller → Service → Repository (Prisma)** 三层架构：

### Controller 层
仅负责：HTTP 请求解析、参数校验、调用 Service、格式化响应。不包含业务逻辑。

### Service 层
核心业务逻辑所在。所有数据操作通过 Prisma ORM 执行。

### 数据访问
Prisma ORM，数据在写入时 JSON.stringify，读取时 JSON.parse。`mapToGame()` 工具函数统一转换。

---

## 认证系统

### JWT 认证流程
1. 用户注册/登录 → bcrypt 哈希密码 → 签发 JWT
2. Token 载荷：`{ id, phone, username, role }`
3. 有效期：7 天
4. 客户端存储在 localStorage，请求时放在 `Authorization: Bearer <token>` 头

### 三种认证中间件
| 中间件 | 行为 |
|--------|------|
| `authenticate` | 必须有效 JWT，否则 401 |
| `optionalAuthenticate` | 有 JWT 解析但无则放行 |
| `requireAdmin` | 在 authenticate 基础上检查 role === 'ADMIN' |

### 权限模型
- **公开接口**：无认证（健康检查、公开棋局查看）
- **可选认证**：登录和未登录都可访问，登录后关联 authorId
- **作者或管理员**：更新/删除棋局时检查 authorId 或 ADMIN 角色
- **仅管理员**：用户管理接口

---

## 数据库

### 当前配置
Schema 声明 `provider = "mysql"`，但 `.env` 使用 SQLite（`file:./dev.db`），Docker Compose 配置 PostgreSQL。三种数据库都支持。

### 表结构

#### User
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String (cuid) | PK |
| phone | String | UNIQUE, NOT NULL |
| email | String? | UNIQUE |
| username | String | UNIQUE, NOT NULL |
| password | String | NOT NULL (bcrypt) |
| avatar | String? | |
| rating | Int | DEFAULT 1200 |
| role | String | DEFAULT 'USER' |
| createdAt | DateTime | |
| updatedAt | DateTime | |

#### Game
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String (cuid) | PK |
| title | String | NOT NULL |
| description | String? | |
| boardSize | Int | DEFAULT 15 |
| moves | String | JSON 序列化的 Move[] |
| result | String? | |
| playerBlack | String? | |
| playerWhite | String? | |
| isPublic | Boolean | DEFAULT true |
| gameType | String | DEFAULT 'gomoku' |
| tags | String | JSON 序列化的 string[] |
| metadata | String? | JSON 序列化对象 |
| authorId | String? | FK → User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

#### Match（预留，当前无 API）
完整比赛记录，包含玩家信息、AI 配置、走子、吃子、时长等。

### 迁移历史
1. `init` — 创建 User, Game, Match 表
2. `add_phone_field` — User 表增加 phone 字段
3. `add_user_role_field` — User 表增加 role 字段
4. `add_game_type` — Game 表增加 gameType 字段

---

## 流式通信 (SSE)

所有实时功能使用 **Server-Sent Events**，不使用 WebSocket。

### 聊天流式响应
- 端点：`POST /api/chat/stream`
- Content-Type: `text/event-stream`
- 事件类型：`thinking`（思考过程）、`answer`（正式回答）
- 终止标记：`[DONE]`

### 视觉识别流式响应
- 端点：`POST /api/vision/recognize/stream`
- 事件类型：`thinking`、`answer`、`board_data`（解析后的棋盘矩阵）
- 终止标记：`[DONE]`

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | 数据库连接串 | `file:./dev.db` |
| `JWT_SECRET` | JWT 签名密钥 | (必须修改) |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `PORT` | 服务端口 | `3001` |
| `CORS_ORIGIN` | CORS 允许源（逗号分隔） | `http://localhost:3000` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | (AI 功能必需) |
| `DEEPSEEK_API_BASE` | DeepSeek API 地址 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 游戏AI模型 | `deepseek-chat` |
| `VOLCENGINE_API_KEY` | 豆包 API Key | (视觉识别必需) |
| `VOLCENGINE_BASE_URL` | 豆包 API 地址 | `https://ark.cn-beijing.volces.com/api/v3` |
| `DOUBAO_VISION_ENDPOINT_ID` | 豆包视觉模型端点 | (视觉识别必需) |

---

## CORS 配置
- 允许 `localhost:3000-3006` 和 `localhost:5173`（Vite）
- 开发模式下允许所有 localhost 源
- 请求体大小限制：50MB（支持 base64 图片上传）

---

## 部署

### Docker
```bash
docker build -t gomoku-server .
docker run -p 3001:3001 --env-file .env gomoku-server
```

### Docker Compose
包含 PostgreSQL 15 + pgAdmin + 应用服务三个容器。

---

## ELO 积分系统

### 算法
标准 ELO 公式，K-factor 动态调整：

| 条件 | K 值 |
|------|------|
| 对局数 < 30 | 40 |
| 积分 < 2400 | 20 |
| 积分 >= 2400 | 10 |

### 核心文件
| 文件 | 说明 |
|------|------|
| `services/elo.service.ts` | 纯函数 `calculateNewRating` + 数据库更新 `updateRatings` |
| `services/elo.service.test.ts` | 24 个单元测试覆盖所有场景 |
| `services/online-game.service.ts` | `finalizeRankedGame` — 排位赛结束时调用 ELO + 创建 Match 记录 |

### ELO 集成流程
排位赛（`isRanked=true`）在三种结束路径中自动更新积分：
1. **makeMove 胜利/平局** — `online-game.service.ts` 的 `makeMove` 方法
2. **认输** — `online-game.service.ts` 的 `resign` 方法
3. **断线超时** — `disconnect.service.ts` 的定时器回调

`finalizeRankedGame(roomId, winner, isDraw)` 公共方法统一处理：
- 获取双方旧积分 → 调用 `eloService.updateRatings` → 创建 Match 记录 → 关联 Room.matchId
- 返回 `RatingChanges`（含 black/white 各自的 oldRating, newRating, change）
- `game:over` Socket 广播携带 `ratingChanges` 字段

### Match 记录格式
排位赛 Match 记录：`type='online'`，`result='black'|'white'|'draw'`，`playerBlackType/WhiteType='human'`，`duration` 秒数。

### API
- `calculateNewRating(playerRating, opponentRating, result, playerGamesPlayed, opponentGamesPlayed)` — 纯函数，返回 `{ newPlayerRating, newOpponentRating }`
- `eloService.updateRatings(winnerId, loserId, isDraw)` — 异步，更新数据库中 User.rating 字段
- `onlineGameService.finalizeRankedGame(roomId, winner, isDraw)` — 排位赛积分终态化（ELO + Match + Room 链接）

### 积分 REST API
| 端点 | 说明 |
|------|------|
| `GET /api/users/:id/rating` | 获取用户积分信息（rating, totalGames, wins, losses, draws, winRate） |
| `GET /api/users/leaderboard` | 积分排行榜（Top 50，按 rating 倒序，含 rank 字段） |

---

## 匹配系统（MatchmakingService）

### 概述
内存队列匹配服务，按 `ruleMode` 维护独立队列，支持动态积分阈值扩展。

### 匹配算法
1. **基础阈值**：积分差 ≤ 200 立即匹配
2. **动态扩展**：等待超过 30s 后，每 10s 阈值扩大 100 分
3. **最优匹配**：在阈值范围内选择积分差最小的对手
4. **FIFO 优先**：优先匹配等待时间最长的玩家

### 核心文件
| 文件 | 说明 |
|------|------|
| `services/matchmaking.service.ts` | 匹配服务（内存队列 + 动态阈值） |
| `services/matchmaking.service.test.ts` | 14 个单元测试覆盖所有场景 |

### API
- `enqueue(userId, rating, ruleMode)` — 加入队列（防重复），返回 `boolean`
- `dequeue(userId)` — 离开所有队列，返回是否成功
- `findMatch()` — 遍历所有队列尝试匹配，返回 `{ player1, player2, ruleMode } | null`
- `getQueuePosition(userId)` — 获取用户在队列中的位置（1-based，0 表示不在队列）
- `getQueueSize(ruleMode)` — 获取指定模式队列长度
- `isQueued(userId)` — 检查用户是否在任何队列中

### 测试覆盖场景
1. 相同积分立即匹配
2. 积分差距过大不匹配（>200）
3. 等待超时后阈值扩展匹配
4. 多人同时匹配的正确配对（最近积分优先）
5. 取消匹配后不再被匹配
6. 队列为空/单人不报错
7. 防止重复入队
8. 不同 ruleMode 不交叉匹配
9. 队列位置追踪
10. 连续匹配
11. 阈值扩展的精确时间行为

---

## 匹配 Socket Handler

### 概述
处理客户端匹配事件的 Socket.io handler，集成 MatchmakingService + RoomService，实现从排队到创建排位房间的完整流程。

### 核心文件
| 文件 | 说明 |
|------|------|
| `socket/handlers/match.handler.ts` | 匹配事件处理（match:queue, match:cancel）+ 定时匹配 |

### 导出函数
- `registerMatchHandlers(io, socket)` — 注册 match:queue 和 match:cancel 事件处理
- `startMatchmakingTimer(io)` — 启动 5 秒间隔定时器，周期调用 `findMatch()`

### Socket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| `match:queue` | Client → Server | 加入匹配队列，参数 `{ ruleMode }` |
| `match:cancel` | Client → Server | 离开匹配队列 |
| `match:waiting` | Server → Client | 回报队列位置 `{ position }` |
| `match:found` | Server → Client | 匹配成功 `{ roomId, opponent }` |

### 匹配流程
1. 客户端发送 `match:queue { ruleMode }`
2. 服务端验证认证 → 查询用户 rating → 调用 `matchmakingService.enqueue()`
3. 回发 `match:waiting { position }`
4. 立即尝试 `findMatch()`（不等待定时器）
5. 匹配成功时：创建排位房间（`isRanked=true`）→ 自动加入对手 → 双方收到 `match:found`
6. 定时器每 5 秒额外调用 `findMatch()` 作为兜底

### 断线处理
已有机制：`socket/index.ts` 的 `disconnect` 事件中调用 `matchmakingService.dequeue(userId)` 自动清理离线用户。

### RoomService 变更
`createRoom(hostId, name, ruleMode, isRanked?)` 新增可选参数 `isRanked`（默认 `false`），用于创建排位赛房间。

### RoomInfo 扩展
`RoomInfo` DTO 新增 `hostRating?: number` 和 `guestRating?: number` 可选字段，由 `toRoomInfo` 方法从 `host.rating` / `guest.rating` 映射。所有 Prisma include 查询已更新为 `select: { username: true, rating: true }`，前端 `RoomInfo` 接口同步扩展。
