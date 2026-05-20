import { prisma } from '../../app';
import { roomService } from '../../services/room.service';
import { logger } from '../../utils/logger';
import type { ChatChannel, TypedServer, TypedSocket } from '../types';

const MIN_CONTENT_LENGTH = 1;
const MAX_CONTENT_LENGTH = 500;

/**
 * Register chat-related Socket.io event handlers on the given socket.
 */
export function registerChatHandlers(io: TypedServer, socket: TypedSocket): void {
  // ── chat:send ─────────────────────────────────────────────────────────
  socket.on('chat:send', async (payload) => {
    try {
      // 1. Authentication check
      if (!socket.data.user) {
        socket.emit('chat:error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
      }

      const { roomId, content, channel } = payload;
      const userId = socket.data.user.id;
      const username = socket.data.user.username;

      // 2. Verify user is in the room
      if (!socket.rooms.has(roomId)) {
        socket.emit('chat:error', { code: 'CHAT_SEND_FAILED', message: 'NOT_IN_ROOM' });
        return;
      }

      // 3. Determine user role and validate channel
      const room = await roomService.getRoomById(roomId);
      const isPlayer = room.hostId === userId || room.guestId === userId;
      const allowedChannel: ChatChannel = isPlayer ? 'players' : 'spectators';

      if (channel !== allowedChannel) {
        socket.emit('chat:error', {
          code: 'CHAT_SEND_FAILED',
          message: 'INVALID_CHANNEL',
        });
        return;
      }

      // 4. Validate message content
      const trimmed = (content as string).trim();
      if (trimmed.length < MIN_CONTENT_LENGTH || trimmed.length > MAX_CONTENT_LENGTH) {
        socket.emit('chat:error', {
          code: 'CHAT_SEND_FAILED',
          message: 'INVALID_MESSAGE_LENGTH',
        });
        return;
      }

      // 5. Persist message to database
      const message = await prisma.roomMessage.create({
        data: {
          roomId,
          userId,
          username,
          content: trimmed,
          channel,
        },
      });

      // 6. Build broadcast payload
      const broadcastPayload = {
        roomId,
        message: {
          id: message.id,
          userId: message.userId,
          username: message.username,
          content: message.content,
          channel: message.channel as ChatChannel,
          createdAt: message.createdAt.toISOString(),
        },
      };

      // 7. Broadcast to the appropriate channel sub-room
      const channelRoom = `${roomId}:${channel}`;
      io.to(channelRoom).emit('chat:message', broadcastPayload);

      logger.info(`chat:send — ${username} in room ${roomId} on ${channel}: "${trimmed.substring(0, 50)}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`chat:send error: ${message}`);
      socket.emit('chat:error', { code: 'CHAT_SEND_FAILED', message });
    }
  });
}
