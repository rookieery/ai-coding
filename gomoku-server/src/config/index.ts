import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

export const config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/gomoku',
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// 环境检查
export function validateConfig() {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  if (config.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
    logger.warn('Warning: Using default JWT secret. Please change JWT_SECRET in production.');
  }

  logger.info('Configuration loaded successfully');
}