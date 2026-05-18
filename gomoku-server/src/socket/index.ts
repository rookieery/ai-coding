import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { optionalSocketAuth } from './middleware';
import { registerRoomHandlers } from './handlers/room.handler';
import { registerGameHandlers } from './handlers/game.handler';
import { registerChatHandlers } from './handlers/chat.handler';
import { registerMatchHandlers, startMatchmakingTimer } from './handlers/match.handler';
import { roomService } from '../services/room.service';
import { disconnectService } from '../services/disconnect.service';
import { matchmakingService } from '../services/matchmaking.service';
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

  // Start the periodic matchmaking timer (runs once per server lifetime)
  startMatchmakingTimer(io);

  io.on('connection', (socket) => {
    const userId = socket.data.user?.id ?? 'anonymous';
    logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

    // ── Reconnect detection ──────────────────────────────────────────
    // If a reconnecting user was in a disconnect timer, cancel it.
    if (socket.data.user) {
      const reconnectingUserId = socket.data.user.id;

      // Check all rooms the server knows this user belongs to
      // by scanning active rooms with status=playing where user is host or guest
      // We rely on the socket joining rooms on the client side, but we can
      // check disconnect state directly.
      (async () => {
        try {
          const { prisma: db } = await import('../app');
          const activeRooms = await db.room.findMany({
            where: {
              status: 'playing',
              OR: [
                { hostId: reconnectingUserId },
                { guestId: reconnectingUserId },
              ],
            },
            select: { id: true },
          });

          for (const room of activeRooms) {
            if (disconnectService.isDisconnected(room.id, reconnectingUserId)) {
              disconnectService.cancelDisconnectTimer(room.id, reconnectingUserId);

              // Notify the room that the player has reconnected
              io.to(room.id).emit('disconnect:warning', {
                roomId: room.id,
                remainingSeconds: -1, // -1 signals reconnected
              });

              logger.info(
                `Player ${reconnectingUserId} reconnected to room ${room.id}, disconnect timer cancelled`,
              );
            }
          }
        } catch (err) {
          logger.error(
            `Error checking reconnect state for user ${reconnectingUserId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      })();
    }

    // Register event handlers
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerMatchHandlers(io, socket);

    socket.on('disconnect', async (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (user: ${userId}), reason: ${reason}`);

      if (socket.data.user) {
        const disconnectedUserId = socket.data.user.id;

        // Clean up any matchmaking queue entries for this user
        matchmakingService.dequeue(disconnectedUserId);

        for (const roomId of socket.rooms) {
          // Skip the socket's own ID room
          if (roomId === socket.id) continue;
          // Skip channel sub-rooms (e.g. "roomId:players", "roomId:spectators")
          if (roomId.includes(':')) continue;

          try {
            const room = await roomService.getRoomById(roomId);

            const isHost = room.hostId === disconnectedUserId;
            const isGuest = room.guestId === disconnectedUserId;

            if (isHost || isGuest) {
              // Player disconnect during an active game → start disconnect timer
              if (room.status === 'playing') {
                disconnectService.startDisconnectTimer(roomId, disconnectedUserId, io);
              } else if (room.status === 'waiting' && isHost) {
                // Host of a waiting room disconnected — destroy the room
                await roomService.leaveRoom(roomId, disconnectedUserId);
                io.to(roomId).emit('room:removed', { roomId });
                io.emit('room:removed', { roomId });
                logger.info(
                  `Host ${disconnectedUserId} disconnected from waiting room ${roomId}, room destroyed`,
                );
              }
            } else {
              // Spectator disconnect
              await roomService.unwatchRoom(roomId);
              const updatedRoom = await roomService.getRoomById(roomId);
              io.to(roomId).emit('room:updated', { room: updatedRoom });
              io.emit('room:updated', { room: updatedRoom });
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
