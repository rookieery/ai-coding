# Agent API 接口速查

> 全部 API 前缀：`/api`，基础 URL 由前端 `VITE_API_BASE_URL` 环境变量配置（默认 `http://localhost:3003/api`）。

---

## 认证 `/api/auth`

| 方法 | 路径 | 认证 | 请求体 | 返回 | 说明 |
|------|------|------|--------|------|------|
| POST | `/auth/register` | 无 | `{ phone, password, username, email? }` | `{ success, data: { user, token, expiresIn } }` | 注册 |
| POST | `/auth/login` | 无 | `{ phone, password }` | `{ success, data: { user, token, expiresIn } }` | 登录 |
| GET | `/auth/me` | 必须 | - | `{ success, data: User }` | 当前用户信息 |
| PUT | `/auth/me` | 必须 | `{ username?, avatar?, email? }` | `{ success, data: User }` | 更新用户信息 |
| POST | `/auth/change-password` | 必须 | `{ oldPassword, newPassword }` | `{ success, message }` | 修改密码 |
| POST | `/auth/logout` | 必须 | - | `{ success, message }` | 登出（客户端删 token） |

---

## 聊天 `/api/chat`

| 方法 | 路径 | 认证 | 请求体 | 返回 | 说明 |
|------|------|------|--------|------|------|
| POST | `/chat` | 可选 | `{ messages: ChatMessage[], stream?: false }` | `{ success, data: { content, reasoning } }` | 普通聊天 |
| POST | `/chat/stream` | 可选 | `{ messages: ChatMessage[], stream: true }` | SSE 流：`thinking` / `answer` 事件，`[DONE]` 结束 | 流式聊天 |

**ChatMessage**：`{ role: 'user'|'assistant'|'system', content: string }`

**SSE 事件格式**：
```
event: thinking
data: {"content": "推理内容..."}

event: answer
data: {"content": "回答内容..."}

data: [DONE]
```

---

## 棋局 `/api/games`

### 通用接口
| 方法 | 路径 | 认证 | 参数 | 返回 | 说明 |
|------|------|------|------|------|------|
| GET | `/games` | 可选 | `?page&pageSize&authorId&gameType&search&tags` | `PaginatedResponse<Game>` | 棋局列表 |
| GET | `/games/my` | 必须 | `?page&pageSize` | `PaginatedResponse<Game>` | 我的棋局 |
| GET | `/games/:id` | 无 | - | `{ success, data: Game }` | 棋局详情 |
| POST | `/games` | 必须 | `GameCreateInput` | `{ success, data: Game }` | 创建棋局（后端格式） |
| PUT | `/games/:id` | 作者/管理员 | `GameUpdateInput` | `{ success, data: Game }` | 更新棋局 |
| DELETE | `/games/:id` | 作者/管理员 | - | `{ success }` | 删除棋局 |

### 前端格式接口
| 方法 | 路径 | 认证 | 参数 | 返回 | 说明 |
|------|------|------|------|------|------|
| POST | `/games/frontend` | 可选 | `FrontendGame` | `{ success, data: { id } }` | 创建（前端格式） |
| GET | `/games/frontend` | 无 | `?page&pageSize&gameType` | `PaginatedResponse<FrontendGame>` | 列表（前端格式） |
| GET | `/games/frontend/:id` | 无 | - | `{ success, data: FrontendGame }` | 详情（前端格式） |

---

## 五子棋 `/api/games/gomoku`

### 棋局接口
| 方法 | 路径 | 认证 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/games/gomoku/frontend` | 可选 | `FrontendGame` | `{ id, name, ... }` |
| GET | `/games/gomoku/frontend` | 可选 | `?page&pageSize` | 分页列表 |
| GET | `/games/gomoku/frontend/:id` | 可选 | - | 单个棋局 |
| GET | `/games/gomoku/health` | 无 | - | `{ status: 'ok' }` |

### AI 走子
| 方法 | 路径 | 认证 | 请求体 | 返回 | 说明 |
|------|------|------|--------|------|------|
| GET | `/games/gomoku/llm/health` | 无 | - | `{ status, apiKeyConfigured }` | AI 服务状态 |
| POST | `/games/gomoku/llm/move` | 无 | `LLMMoveRequest` | `LLMMoveResponse` | AI 生成走子 |

**LLMMoveRequest**：
```typescript
{
  board: ('X'|'O'|'.')[][] // 15x15 棋盘
  currentPlayer: 'black' | 'white'
  history: { player: string, position: string }[]
}
```

**LLMMoveResponse**：
```typescript
{
  move: string          // 如 "H8"
  reason: string        // AI 走子理由
  situation_analysis?: string
  candidate_index?: number
}
```

---

## 中国象棋 `/api/games/chinese-chess`

### 棋局接口
| 方法 | 路径 | 认证 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/games/chinese-chess/frontend` | 可选 | `FrontendGame` | 创建结果 |
| GET | `/games/chinese-chess/frontend` | 可选 | `?page&pageSize` | 分页列表 |
| GET | `/games/chinese-chess/frontend/:id` | 可选 | - | 单个棋局 |
| DELETE | `/games/chinese-chess/:id` | 必须 | - | `{ success }` |
| GET | `/games/chinese-chess/health` | 无 | - | `{ status: 'ok' }` |

### AI 走子
| 方法 | 路径 | 认证 | 请求体 | 返回 |
|------|------|------|--------|------|
| GET | `/games/chinese-chess/llm/health` | 无 | - | `{ status }` |
| POST | `/games/chinese-chess/llm/move` | 无 | `ChessLLMMoveRequest` | `ChessLLMMoveResponse` |

**ChessLLMMoveRequest**：
```typescript
{
  board: number[][]     // 10x9 (0=空, 1-7=红, 8-14=黑)
  currentPlayer: 'red' | 'black'
  moveHistory: { from: {row,col}, to: {row,col}, piece, capturedPiece? }[]
}
```

**ChessLLMMoveResponse**：
```typescript
{
  move: { from: {row,col}, to: {row,col} }
  reason: string
  situationAnalysis?: string
  isFallback?: boolean
}
```

---

## 视觉识别 `/api/vision`

| 方法 | 路径 | 认证 | 请求体 | 返回 | 说明 |
|------|------|------|--------|------|------|
| GET | `/vision/health` | 无 | - | `{ status }` | 服务状态 |
| POST | `/vision/recognize` | 无 | `{ image: base64 }` | `{ success, data: { candidates[] } }` | 普通识别 |
| POST | `/vision/recognize/stream` | 无 | `{ image: base64 }` | SSE: `thinking`/`answer`/`board_data` → `[DONE]` | 流式识别 |

---

## 管理员 `/api/admin`

| 方法 | 路径 | 认证 | 参数 | 返回 | 说明 |
|------|------|------|------|------|------|
| GET | `/admin/users` | ADMIN | `?page&pageSize` | 分页用户列表（含私有棋局数） | 用户列表 |
| DELETE | `/admin/users/:id` | ADMIN | - | `{ success }` | 删除用户及其棋局 |

---

## 用户与积分 `/api/users`

| 方法 | 路径 | 认证 | 参数 | 返回 | 说明 |
|------|------|------|------|------|------|
| GET | `/users/:id/rating` | 可选 | - | `{ success, data: { id, username, rating, avatar, totalGames, wins, losses, draws, winRate } }` | 用户积分信息 |
| GET | `/users/leaderboard` | 可选 | - | `{ success, data: [{ rank, id, username, rating, avatar }] }` | 排行榜 Top 50 |

---

## 在线房间 `/api/rooms`

| 方法 | 路径 | 认证 | 参数 | 返回 | 说明 |
|------|------|------|------|------|------|
| GET | `/rooms` | 可选 | `?page&pageSize` | `PaginatedResponse<RoomInfo>` | 公开房间列表 |
| GET | `/rooms/:id` | 可选 | - | `{ success, data: RoomInfo }` | 房间详情 |

---

## 通用响应格式

```typescript
// 成功
{ success: true, data: T, timestamp: string }

// 错误
{ success: false, error: string, message: string, timestamp: string }

// 分页
{ success: true, data: T[], page: number, pageSize: number, total: number, totalPages: number }
```

## 认证方式

所有需要认证的接口在 Header 中携带：
```
Authorization: Bearer <jwt_token>
```

Token 有效期 7 天，载荷：`{ id, phone, username, role }`
