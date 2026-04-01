# Gomoku Server

五子棋游戏后端服务，基于 Node.js + TypeScript 构建。提供用户管理、棋谱存储、对局记录等功能。

## 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript 5.x
- **Web框架**: Express.js
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: JWT (JSON Web Tokens)
- **API文档**: Swagger/OpenAPI
- **测试**: Jest + Supertest
- **代码质量**: ESLint + Prettier

## 快速开始

### 环境要求
- Node.js 18 或更高版本
- PostgreSQL 15+ (或使用Docker)
- npm 或 yarn 包管理器

### 1. 数据库设置
```bash
# 使用 Docker 启动 PostgreSQL
docker run --name gomoku-db \
  -e POSTGRES_DB=gomoku \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15-alpine

# 或者使用 docker-compose
docker-compose up -d postgres
```

### 2. 安装依赖
```bash
# 安装项目依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init
```

### 3. 配置环境变量
复制环境变量文件并修改配置：
```bash
cp .env.example .env
# 编辑 .env 文件中的数据库连接和JWT密钥
```

### 4. 启动开发服务器
```bash
# 开发模式（热重载）
npm run dev

# 或构建后运行
npm run build
npm start
```

### 5. 验证
应用启动后，访问以下URL：
- API 基础路径: `http://localhost:3001/api`
- 健康检查: `http://localhost:3001/health`
- Swagger UI: `http://localhost:3001/api-docs` (待实现)

## API 文档

详细的API设计请参考 [backend-design.md](backend-design.md) 文件。

### 主要功能模块

1. **认证模块**
   - 用户注册、登录、登出
   - JWT令牌管理

2. **用户管理**
   - 用户信息查询、更新
   - 用户等级分系统

3. **棋谱管理**
   - 棋谱创建、查询、更新、删除
   - 棋谱导出(SGF格式)
   - 棋谱标签和分类

4. **对局记录**
   - 人机对局、人人对局记录
   - 对局回放数据
   - 对局统计信息

## 开发指南

### 项目结构
```
gomoku-server/
├── src/
│   ├── config/         # 配置文件
│   ├── middleware/     # 中间件 (认证、验证)
│   ├── controllers/    # 控制器层
│   ├── services/       # 业务逻辑层
│   ├── routes/         # 路由定义
│   ├── utils/          # 工具函数
│   └── types/          # TypeScript类型定义
├── prisma/             # 数据库模型和迁移
├── tests/              # 测试文件
└── dist/               # 构建输出
```

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint + Prettier 代码风格
- 使用 Zod 进行数据验证
- 所有公共API必须有单元测试

### 数据库操作
项目使用 Prisma ORM 进行数据库操作：
```typescript
import { prisma } from './app';

// 查询用户
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { games: true }
});

// 创建棋谱
const game = await prisma.game.create({
  data: {
    title: '测试棋谱',
    authorId: userId,
    moves: JSON.stringify(moves),
    // ...
  }
});
```

### 测试
```bash
# 运行所有测试
npm test

# 运行测试并监视变化
npm run test:watch

# 运行特定测试文件
npm test -- tests/user.test.ts
```

## 部署

### Docker 部署 (开发环境)
```bash
# 启动完整开发环境
docker-compose up -d

# 查看日志
docker-compose logs -f app
```

### 生产环境部署
1. 构建Docker镜像: `docker build -t gomoku-server .`
2. 使用生产环境docker-compose文件
3. 配置环境变量（数据库连接、JWT密钥等）
4. 使用 Nginx 作为反向代理
5. 使用 PM2 或 Docker Compose 管理进程

### 环境变量配置
重要配置应通过环境变量设置：
- `DATABASE_URL`: 数据库连接URL
- `JWT_SECRET`: JWT密钥（生产环境必须更改）
- `PORT`: 服务端口
- `NODE_ENV`: 环境标识
- `CORS_ORIGIN`: CORS允许的源

## 开发命令参考

```bash
# 开发命令
npm run dev           # 启动开发服务器（热重载）
npm run build         # 构建TypeScript代码
npm start             # 运行生产构建

# 数据库命令
npm run prisma:generate  # 生成Prisma客户端
npm run prisma:migrate   # 运行数据库迁移
npm run prisma:studio    # 打开Prisma Studio（数据库GUI）

# 代码质量
npm run lint          # 运行ESLint检查
npm run lint:fix      # 自动修复ESLint问题
npm run format        # 使用Prettier格式化代码

# 测试
npm test             # 运行所有测试
npm run test:watch   # 监视模式运行测试
```

## 许可证

MIT License