import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { optionalSocketAuth } from './middleware';
import { registerRoomHandlers } from './handlers/room.handler';
import { registerGameHandlers } from './handlers/game.handler';
import { roomService } from '../services/room.service';
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

  // Register optional auth middleware on the main namespace.
  // Guests can connect (e.g. for spectating), but socket.data.user remains undefined.
  // Individual handlers check socket.data.user for actions that require authentication.
  io.use(optionalSocketAuth);

  io.on('connection', (socket) => {
    const userId = socket.data.user?.id ?? 'anonymous';
    logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

    // Register event handlers
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);

    socket.on('disconnect', async (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (user: ${userId}), reason: ${reason}`);

      // Detect spectator disconnect: if user was in a room but is neither host nor guest
      if (socket.data.user) {
        const disconnectedUserId = socket.data.user.id;

        for (const roomId of socket.rooms) {
          // Skip the socket's own ID room
          if (roomId === socket.id) continue;

          try {
            const room = await roomService.getRoomById(roomId);

            // If user is neither host nor guest → they are a spectator
            if (room.hostId !== disconnectedUserId && room.guestId !== disconnectedUserId) {
              await roomService.unwatchRoom(roomId);
              const updatedRoom = await roomService.getRoomById(roomId);
              io.to(roomId).emit('room:updated', { room: updatedRoom });
              logger.info(`Spectator ${disconnectedUserId} disconnected from room ${roomId}`);
            }
          } catch {
            // Room may have been deleted or other benign errors — ignore
          }
        }
      }
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
