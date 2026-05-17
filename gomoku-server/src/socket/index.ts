import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import type { TypedServer } from './types';

let io: TypedServer;

function getAllowedOrigins(): string[] {
  const baseAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://localhost:3006',
    'http://localhost:5173',
  ];

  const corsOrigin = process.env.CORS_ORIGIN;
  const configuredOrigins = corsOrigin
    ? corsOrigin.split(',').map((domain: string) => domain.trim()).filter((domain: string) => domain.length > 0)
    : [];

  return [...baseAllowedOrigins, ...configuredOrigins];
}

export function initializeSocket(httpServer: Server): void {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins();

        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
          callback(null, true);
          return;
        }

        logger.warn(`Socket CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  }) as TypedServer;

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  logger.info('Socket.io server initialized');
}

export function getIO(): TypedServer {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
}

export { io };
