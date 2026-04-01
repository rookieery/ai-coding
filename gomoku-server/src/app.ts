import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// 加载环境变量
dotenv.config();

// 初始化Prisma客户端
export const prisma = new PrismaClient();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查路由
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API路由前缀
app.use('/api', (_req, _res, next) => {
  // 这里可以添加API特定的中间件
  next();
});

// 导入路由
import apiRoutes from './routes';

// 挂载API路由
app.use('/api', apiRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// 错误处理中间件
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📚 API available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  console.log('Database disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Terminating server...');
  await prisma.$disconnect();
  console.log('Database disconnected');
  process.exit(0);
});

// 启动应用
startServer();

export default app;