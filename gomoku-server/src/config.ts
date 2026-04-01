import dotenv from 'dotenv';

dotenv.config();

export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  server: {
    port: process.env.PORT || 3001,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};