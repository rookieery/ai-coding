import { onlineGameService } from '../../services/online-game.service';
import { roomService } from '../../services/room.service';
import { logger } from '../../utils/logger';
import type { PlayerColor, GameOverReason } from '../types';
import type { TypedServer, TypedSocket } from '../types';

const PLAYER_NUMBER_TO_COLOR: Record<number, PlayerColor> = {
  1: 'black',
  2: 'white',
};

/**
 * Register game-related Socket.io event handlers on the given socket.
 */
export function registerGameHandlers(io: TypedServer, socket: TypedSocket): void {
  // ── game:move ─────────────────────────────────────────────────────────
  socket.on('game:move', async (payload) => {
    try {
      if (!socket.data.user) {
        socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
      }

      const { roomId, r, c } = payload;
      const userId = socket.data.user.id;

      // Spectator permission check — only host or guest may move
      const roomInfo = await roomService.getRoomById(roomId);
      if (roomInfo.hostId !== userId && roomInfo.guestId !== userId) {
        socket.emit('error', {
          code: 'GAME_MOVE_FAILED',
          message: 'onlineErrorNotYourTurn',
        });
        return;
      }

      const result = await onlineGameService.makeMove(roomId, userId, r, c);

      const playerColor = PLAYER_NUMBER_TO_COLOR[result.move.player];

      // Broadcast move to everyone in the room (including spectators)
      io.to(roomId).emit('game:move', {
        roomId,
        r,
        c,
        player: playerColor,
        boardState: result.boardState,
      });

      // If the game is over, broadcast game:over
      if (result.winner !== null) {
        const reason: GameOverReason = result.isDraw ? 'draw' : 'win';

        io.to(roomId).emit('game:over', {
          roomId,
          winner: result.winner,
          reason,
          ratingChanges: result.ratingChanges,
        });

        // Notify lobby to remove the room (finished rooms should not appear)
        io.emit('room:removed', { roomId });
      }

      logger.info(`game:move — (${r},${c}) by ${userId} in room ${roomId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`game:move error: ${message}`);
      socket.emit('error', { code: 'GAME_MOVE_FAILED', message });
    }
  });

  // ── game:resign ───────────────────────────────────────────────────────
  socket.on('game:resign', async (payload) => {
    try {
      if (!socket.data.user) {
        socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
      }

      const { roomId } = payload;
      const userId = socket.data.user.id;

      // Spectator permission check — only host or guest may resign
      const roomInfo = await roomService.getRoomById(roomId);
      if (roomInfo.hostId !== userId && roomInfo.guestId !== userId) {
        socket.emit('error', {
          code: 'GAME_RESIGN_FAILED',
          message: 'onlineErrorNotYourTurn',
        });
        return;
      }

      const result = await onlineGameService.resign(roomId, userId);

      io.to(roomId).emit('game:over', {
        roomId,
        winner: result.winner,
        reason: 'resign',
        ratingChanges: result.ratingChanges,
      });

      // Notify lobby to remove the room (finished rooms should not appear)
      io.emit('room:removed', { roomId });

      logger.info(`game:resign — ${userId} resigned in room ${roomId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`game:resign error: ${message}`);
      socket.emit('error', { code: 'GAME_RESIGN_FAILED', message });
    }
  });
}
