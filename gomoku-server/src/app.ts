import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { config } from './config';

// 加载环境变量
dotenv.config();

// 初始化Prisma客户端
export const prisma = new PrismaClient();

// 创建Express应用
const app = express();
const PORT = config.server.port;

// 中间件
app.use(helmet());

// CORS配置：支持从环境变量配置多个允许的域名（逗号分隔）
app.use(cors({
  origin: (origin, callback) => {
    // 基础允许的域名列表
    const baseAllowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      'http://localhost:3006',
      'http://localhost:5173', // Vite默认端口
    ];

    // 从环境变量读取配置的域名（支持逗号分隔多个域名）
    const corsOrigin = config.server.corsOrigin;
    const configuredOrigins = corsOrigin
      ? corsOrigin.split(',').map(domain => domain.trim()).filter(domain => domain.length > 0)
      : [];

    // 合并所有允许的域名
    const allowedOrigins = [...baseAllowedOrigins, ...configuredOrigins];

    // 在开发环境中更宽松
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`CORS check - Origin: ${origin}, Allowed: ${allowedOrigins.join(', ')}`);
    }

    // 允许条件：
    // 1. 请求没有origin（例如：curl请求、Postman）
    // 2. origin在允许列表中
    // 3. 在生产环境中，必须有明确的origin匹配
    if (!origin) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
      // 开发环境下允许所有本地端口
      callback(null, true);
    } else {
      logger.warn(`CORS blocked: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // 兼容一些旧浏览器
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
  logger.error('Unhandled error:', err);
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
    logger.info('Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
      logger.info(`Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await prisma.$disconnect();
  logger.info('Database disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Terminating server...');
  await prisma.$disconnect();
  logger.info('Database disconnected');
  process.exit(0);
});

// 启动应用
startServer();

export default app;