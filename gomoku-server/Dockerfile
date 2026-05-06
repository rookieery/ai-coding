# ---------------- 构建阶段 ----------------
FROM node:18-bullseye-slim AS builder
WORKDIR /app

# 1. 安装 Prisma 必需的 OpenSSL
RUN apt-get update -y && apt-get install -y openssl

# 2. 复制包管理文件
COPY package*.json ./
COPY tsconfig.json ./

# 3. 安装所有依赖 (去掉 --only=production 以确保能拉取 typescript 进行编译)
RUN npm ci

# 4. 复制源代码
COPY src ./src
COPY prisma ./prisma

# 5. 生成 Prisma 客户端并构建 TypeScript
RUN npx prisma generate
RUN npm run build

# ---------------- 运行阶段 ----------------
FROM node:18-bullseye-slim
WORKDIR /app

# 1. 安装运行时需要的 OpenSSL 和用于健康检查的 curl
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# 2. 使用 Node 镜像自带的非 root 用户 (Debian 镜像自带 node 用户，无需手动 adduser)
USER node

# 3. 复制生产依赖和构建产物，并赋予 node 用户权限
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/prisma ./prisma

# 4. 暴露端口 (确保你的代码里监听的是 3001，如果是 3000 请改成 3000)
EXPOSE 3001

# 5. 健康检查 (将 wget 替换为 curl，更适配 Debian 系统)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 6. 启动应用（先同步数据库表结构，再启动服务）
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/app.js"]