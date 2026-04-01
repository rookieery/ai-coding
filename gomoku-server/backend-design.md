# Gomoku 后端项目设计文档

## 项目概述
本项目为五子棋游戏提供后端服务，主要功能包括用户管理、棋谱存储、对局记录等。与前端项目 `gomoku-web` 配合，构建完整的在线五子棋平台。

## 技术栈选择
- **运行时**: Node.js (最新LTS版本)
- **语言**: TypeScript
- **Web框架**: Express.js
- **数据库**: PostgreSQL (开发环境可使用SQLite)
- **ORM**: Prisma (类型安全，自动迁移)
- **认证**: JWT (JSON Web Tokens)
- **API文档**: Swagger/OpenAPI
- **测试**: Jest + Supertest
- **代码质量**: ESLint + Prettier

## 系统架构
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  前端 (gomoku-web) │────▶│  后端 API 服务   │────▶│     数据库       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                        │
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                           ┌─────────────────┐
                           │   文件存储       │
                           │   (棋谱导出)     │
                           └─────────────────┘
```

## API 设计

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 用户管理
- `GET /api/users` - 获取用户列表 (管理员)
- `GET /api/users/:id` - 获取用户详情
- `PUT /api/users/:id` - 更新用户信息
- `DELETE /api/users/:id` - 删除用户 (管理员)

### 棋谱管理
- `POST /api/games` - 创建新棋谱
- `GET /api/games` - 获取棋谱列表 (支持分页、过滤)
- `GET /api/games/:id` - 获取棋谱详情
- `PUT /api/games/:id` - 更新棋谱信息
- `DELETE /api/games/:id` - 删除棋谱
- `GET /api/games/:id/export` - 导出棋谱 (SGF格式)
- `GET /api/users/:userId/games` - 获取用户的所有棋谱

### 对局记录
- `POST /api/matches` - 创建对局记录 (人机/人人)
- `GET /api/matches` - 获取对局记录列表
- `GET /api/matches/:id` - 获取对局详情
- `GET /api/matches/:id/replay` - 获取对局回放数据

## 数据模型

### User 用户表 (Prisma Model)
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String   // 加密存储
  avatar    String?  // 头像URL
  rating    Int      @default(1200) // 等级分
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  games     Game[]   // 创建的棋谱
  matches   Match[]  // 参与的对局
}
```

### Game 棋谱表 (Prisma Model)
```prisma
model Game {
  id          String   @id @default(cuid())
  title       String   // 棋谱标题
  description String?  // 描述
  boardSize   Int      @default(15) // 棋盘大小 (15x15)
  moves       Json     // 棋步序列 [{x, y, color, step}]
  result      String?  // 结果 (黑胜、白胜、和棋)
  playerBlack String?  // 黑方玩家名
  playerWhite String?  // 白方玩家名
  isPublic    Boolean  @default(true) // 是否公开
  tags        String[] // 标签 ["定式", "中盘", "官子"]

  authorId    String   // 作者ID
  author      User     @relation(fields: [authorId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Match 对局表 (Prisma Model)
```prisma
model Match {
  id          String   @id @default(cuid())
  type        String   // 对局类型: "human-vs-human", "human-vs-ai", "ai-vs-ai"
  mode        String   // 游戏模式: "standard", "renju", "free-style"
  boardSize   Int      @default(15)

  // 玩家信息
  playerBlackId   String?  // 黑方用户ID (如果是人类)
  playerBlackName String   // 黑方名称
  playerBlackType String   // "human" 或 "ai"
  playerWhiteId   String?  // 白方用户ID
  playerWhiteName String   // 白方名称
  playerWhiteType String   // "human" 或 "ai"

  // AI配置
  aiLevelBlack    Int?     // 黑方AI等级
  aiLevelWhite    Int?     // 白方AI等级

  // 对局数据
  moves       Json     // 棋步序列
  result      String?  // 结果
  duration    Int?     // 对局时长(秒)

  // 统计
  blackCaptures Int @default(0) // 黑方提子数
  whiteCaptures Int @default(0) // 白方提子数

  createdAt   DateTime @default(now())
  endedAt     DateTime?

  // 关系
  playerBlack User? @relation("BlackMatches", fields: [playerBlackId], references: [id])
  playerWhite User? @relation("WhiteMatches", fields: [playerWhiteId], references: [id])
}
```

## 目录结构 (Node.js + TypeScript)
```
gomoku-server/
├── src/
│   ├── config/         # 配置文件
│   │   └── index.ts
│   ├── middleware/     # 中间件
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── controllers/    # 控制器
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── game.controller.ts
│   │   └── match.controller.ts
│   ├── services/       # 业务逻辑
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── game.service.ts
│   │   └── match.service.ts
│   ├── models/         # 数据模型 (Prisma schema)
│   │   └── schema.prisma
│   ├── routes/         # 路由定义
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── game.routes.ts
│   │   └── match.routes.ts
│   ├── utils/          # 工具函数
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   └── sgf-export.ts
│   ├── types/          # TypeScript 类型定义
│   │   └── index.ts
│   └── app.ts          # Express 应用入口
├── prisma/
│   └── migrations/     # 数据库迁移文件
├── tests/              # 测试文件
│   ├── unit/
│   └── integration/
├── .env.example        # 环境变量示例
├── .gitignore
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 开发环境配置

### 1. 环境变量
```
DATABASE_URL="postgresql://user:password@localhost:5432/gomoku"
JWT_SECRET="your-jwt-secret-key"
PORT=3001
NODE_ENV="development"
```

### 2. 数据库设置
```bash
# 安装 PostgreSQL 或使用 Docker
docker run --name gomoku-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# 使用 Prisma 迁移
npx prisma migrate dev --name init
```

### 3. 安装依赖
```bash
npm init -y
npm install express cors helmet bcryptjs jsonwebtoken dotenv
npm install -D typescript @types/node @types/express ts-node nodemon
npm install prisma @prisma/client
```

### 4. 脚本配置 (package.json)
```json
{
  "scripts": {
    "dev": "nodemon src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "test": "jest"
  }
}
```

## 部署方案

### 开发环境
- 本地运行 PostgreSQL 数据库
- 使用 `npm run dev` 启动开发服务器

### 生产环境
- 使用 Docker Compose 编排服务
- PostgreSQL 数据库持久化存储
- Nginx 反向代理
- PM2 进程管理

## 下一步计划
1. ✅ 完成项目设计文档
2. ✅ 创建项目目录结构
3. 初始化SpringBoot项目配置文件 (build.gradle/pom.xml)
4. 配置数据库连接和JPA实体
5. 实现Spring Security + JWT认证
6. 实现用户管理API
7. 实现棋谱管理API
8. 实现对局记录API
9. 添加单元测试和集成测试
10. 配置OpenAPI文档
11. 编写Docker部署配置

---
*最后更新: 2026-03-30 (更新为Node.js + TypeScript方案)*