import { roomService } from '../../services/room.service';
import { logger } from '../../utils/logger';
import type { TypedServer, TypedSocket } from '../types';

/**
 * Register room-related Socket.io event handlers on the given socket.
 */
export function registerRoomHandlers(io: TypedServer, socket: TypedSocket): void {
  // ── room:create ────────────────────────────────────────────────────────
  socket.on('room:create', async (payload) => {
    try {
      if (!socket.data.user) {
        socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
      }

      const room = await roomService.createRoom(
        socket.data.user.id,
        payload.name,
        payload.ruleMode,
      );

      socket.join(room.id);
      socket.join(`${room.id}:players`);

      socket.emit('room:created', { room });

      // Broadcast updated room list to all connected clients (lobby)
      io.emit('room:updated', { room });

      logger.info(`room:create — room ${room.id} created by ${socket.data.user.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`room:create error: ${message}`);
      socket.emit('error', { code: 'ROOM_CREATE_FAILED', message });
    }
  });

  // ── room:join ──────────────────────────────────────────────────────────
  socket.on('room:join', async (payload) => {
    try {
      if (!socket.data.user) {
        socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
      }

      const { room, color } = await roomService.joinRoom(
        payload.roomId,
        socket.data.user.id,
      );

      socket.join(payload.roomId);
      socket.join(`${payload.roomId}:players`);

      // Notify the joining player
      socket.emit('room:joined', { room, color });

      // Broadcast updated state to everyone in the room
      io.to(payload.roomId).emit('room:updated', { room });

      // Notify lobby clients so room list stays in sync
      io.emit('room:updated', { room });

      logger.info(`room:join — user ${socket.data.user.id} joined room ${payload.roomId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`room:join error: ${message}`);
      socket.emit('error', { code: 'ROOM_JOIN_FAILED', message });
    }
  });

  // ── room:leave ─────────────────────────────────────────────────────────
  socket.on('room:leave', async (payload) => {
    try {
      const { destroyed } = await roomService.leaveRoom(
        payload.roomId,
        socket.data.user?.id ?? '',
      );

      socket.leave(payload.roomId);
      socket.leave(`${payload.roomId}:players`);
      socket.leave(`${payload.roomId}:spectators`);

      if (destroyed) {
        io.to(payload.roomId).emit('room:removed', { roomId: payload.roomId });
        // Notify lobby clients to remove the room
        io.emit('room:removed', { roomId: payload.roomId });
      } else {
        // Fetch updated room and broadcast
        const updatedRoom = await roomService.getRoomById(payload.roomId);
        io.to(payload.roomId).emit('room:updated', { room: updatedRoom });
        // Notify lobby clients so room list stays in sync
        io.emit('room:updated', { room: updatedRoom });
      }

      logger.info(`room:leave — user left room ${payload.roomId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`room:leave error: ${message}`);
      socket.emit('error', { code: 'ROOM_LEAVE_FAILED', message });
    }
  });

  // ── room:watch ─────────────────────────────────────────────────────────
  socket.on('room:watch', async (payload) => {
    try {
      if (!socket.data.user) {
        socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
      }

      // Validate room exists and is in a watchable state (playing or waiting)
      const existingRoom = await roomService.getRoomById(payload.roomId);
      if (existingRoom.status !== 'playing' && existingRoom.status !== 'waiting') {
        socket.emit('error', {
          code: 'ROOM_WATCH_FAILED',
          message: 'ROOM_NOT_WATCHABLE',
        });
        return;
      }

      const room = await roomService.watchRoom(
        payload.roomId,
        socket.data.user.id,
      );

      socket.join(payload.roomId);
      socket.join(`${payload.roomId}:spectators`);

      io.to(payload.roomId).emit('room:updated', { room });

      // Notify lobby clients so spectator count stays in sync
      io.emit('room:updated', { room });

      logger.info(`room:watch — user ${socket.data.user.id} watching room ${payload.roomId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`room:watch error: ${message}`);
      socket.emit('error', { code: 'ROOM_WATCH_FAILED', message });
    }
  });

  // ── room:list ──────────────────────────────────────────────────────────
  socket.on('room:list', async (payload) => {
    try {
      const result = await roomService.getRoomList(payload.page, payload.pageSize);

      socket.emit('room:list', {
        rooms: result.rooms,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`room:list error: ${message}`);
      socket.emit('error', { code: 'ROOM_LIST_FAILED', message });
    }
  });
}
