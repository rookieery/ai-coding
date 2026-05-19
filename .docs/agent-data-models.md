# Agent 数据模型速查

> 包含数据库表、TypeScript 类型定义、前后端格式转换规则。

---

## 数据库表 (Prisma Schema)

### User 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (cuid) | PK | 自动生成 |
| phone | String | UNIQUE NOT NULL | 登录手机号 |
| email | String? | UNIQUE | 邮箱（可选） |
| username | String | UNIQUE NOT NULL | 用户名 |
| password | String | NOT NULL | bcrypt 哈希 |
| avatar | String? | | 头像 URL |
| rating | Int | DEFAULT 1200 | ELO 积分 |
| role | String | DEFAULT 'USER' | 'USER' 或 'ADMIN' |
| createdAt | DateTime | | |
| updatedAt | DateTime | | |

### Game 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (cuid) | PK | |
| title | String | NOT NULL | 棋局标题 |
| description | String? | | 描述 |
| boardSize | Int | DEFAULT 15 | 棋盘大小 |
| moves | String (@db.Text) | NOT NULL | JSON 序列化的 `Move[]` |
| result | String? | | 比赛结果 |
| playerBlack | String? | | 黑方名称 |
| playerWhite | String? | | 白方名称 |
| isPublic | Boolean | DEFAULT true | 是否公开 |
| gameType | String | DEFAULT 'gomoku' | 'gomoku' 或 'chinese_chess' |
| tags | String (@db.Text) | NOT NULL | JSON 序列化的 `string[]` |
| metadata | String? (@db.Text) | | JSON 序列化的对象 |
| authorId | String? | FK → User.id | 创建者 |
| createdAt | DateTime | | |
| updatedAt | DateTime | | |

### Match 表（预留，当前无 API）

完整比赛记录，包含：type, mode, boardSize, 玩家信息(playerBlack/White的Id/Name/Type), AI配置(aiLevel), moves, result, duration, captures, endedAt。

---

## 后端 TypeScript 类型

### 通用类型 (`src/types/index.ts`)

```typescript
// 用户（API 返回，不含密码）
User = { id, phone, email?, username, avatar?, rating, role, createdAt, updatedAt }

// 认证响应
AuthResponse = { user: User, token: string, expiresIn: number }

// 棋局（内部使用，moves 已解析为对象数组）
Game = { id, title, description?, boardSize, moves: Move[], result?,
         playerBlack?, playerWhite?, isPublic, gameType: GameType,
         tags: string[], metadata?, authorId?, createdAt, updatedAt }

GameType = 'gomoku' | 'chinese_chess'

Move = { x: number, y: number, color: 'black'|'white', step: number, timestamp? }

// API 响应包装
ApiResponse<T> = { success: boolean, data?: T, error?: string, message?: string, timestamp: string }
PaginatedResponse<T> = ApiResponse<T[]> & { page, pageSize, total, totalPages }
```

### 五子棋 AI 类型 (`src/types/llm.types.ts`)

```typescript
BoardCell = 'X' | 'O' | '.'
BoardState = BoardCell[][]  // 15x15
PlayerColor = 'black' | 'white'

LLMMoveRequest = {
  board: BoardState
  currentPlayer: PlayerColor
  history: { player: string, position: string }[]
}

LLMMoveResponse = {
  move: string           // 如 "H8"
  reason: string
  situation_analysis?: string
  candidate_index?: number
}
```

### 象棋 AI 类型 (`src/types/chess-llm.types.ts`)

```typescript
ChessPlayerColor = 'red' | 'black'

ChessLLMMoveRequest = {
  board: number[][]      // 10x9, 棋子编码见下
  currentPlayer: ChessPlayerColor
  moveHistory: ChessMoveRecord[]
}

ChessLLMMoveResponse = {
  move: { from: {row,col}, to: {row,col} }
  reason: string
  situationAnalysis?: string
  isFallback?: boolean
}
```

### 象棋棋子编码

| 编码 | 红方 | 编码 | 黑方 |
|------|------|------|------|
| 0 | 空 | - | - |
| 1 | 帅 | 8 | 将 |
| 2 | 仕 | 9 | 士 |
| 3 | 相 | 10 | 象 |
| 4 | 马 | 11 | 马 |
| 5 | 车 | 12 | 车 |
| 6 | 炮 | 13 | 炮 |
| 7 | 兵 | 14 | 卒 |

---

## 前端 TypeScript 类型

### 认证 (`src/api/auth-api.ts`)

```typescript
User = { id, phone, email?, username, avatar?, rating, role, createdAt, updatedAt }
AuthResponse = { user, token, expiresIn }
RegisterRequest = { phone, password, username, email? }
LoginRequest = { phone, password }
UpdateUserRequest = { username?, avatar?, email? }
ChangePasswordRequest = { oldPassword, newPassword }
```

### 聊天 (`src/api/chat-api.ts`)

```typescript
ChatMessage = { role: 'user'|'assistant'|'system', content: string }
ChatRequest = { messages: ChatMessage[], stream?: boolean }
ChatStreamChunk = { type: 'thinking'|'answer', content: string }
```

### 棋局 (`src/api/game-api.ts`)

```typescript
GameType = 'gomoku' | 'chinese_chess'

FrontendGame = {
  id?: string
  name: string
  board: number[][]           // 棋盘矩阵
  moveHistory: FrontendMove[]
  timestamp: number
  mode: string                // 'pvp' | 'pve'
  aiDifficulty?: string
  aiRole?: number
  ruleMode?: string           // 'standard' | 'renju'
  isPublic?: boolean
  gameType?: GameType
}

FrontendMove = { r: number, c: number, player: 1|2 }

ChineseChessFrontendGame = FrontendGame & {
  gameType: 'chinese_chess'
  board: number[][]           // 10x9 棋子编码矩阵
}
```

### Agent 消息 (`src/types/agent.ts`)

```typescript
AgentMessage = {
  role: 'user' | 'assistant'
  text: string
  reasoningContent?: string
  relatedUserQuery?: string
  isGameSelector?: boolean
  hasImage?: boolean
  imageBase64?: string
}
```

---

## 前后端格式转换

**文件**：`gomoku-server/src/utils/game-converter.ts`

### Move 格式差异

| 方面 | 前端格式 | 后端格式 |
|------|---------|---------|
| 坐标 | `{ r, c }` (row, col) | `{ x, y }` (x=col, y=row) |
| 玩家 | `player: 1\|2` (1=黑, 2=白) | `color: 'black'\|'white'` |
| 步数 | 无 | `step: number` |

### 转换函数
- `convertToFrontendGame(backendGame)` → `FrontendGame`
- `convertToBackendGame(frontendGame, userId?)` → `GameCreateInput`

### 棋盘矩阵

**五子棋**：
- 前端：`0`（空）、`1`（黑）、`2`（白）
- 后端 AI：`'X'`（黑）、`'O'`（白）、`'.'`（空）
- 前端 API 层在调用 LLM API 时自动转换

**象棋**：
- 前后端统一使用数字编码（0=空，1-7=红，8-14=黑）
- 前端 `chess-vision-api.ts` 提供 `convertCodesToBoardState()` 和 `convertBoardStateToCodes()` 转换函数
