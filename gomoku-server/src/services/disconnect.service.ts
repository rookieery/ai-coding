import { prisma } from '../app';
import { logger } from '../utils/logger';
import { onlineGameService } from './online-game.service';
import type { PlayerColor, GameOverReason } from '../socket/types';
import type { TypedServer } from '../socket/types';

const DISCONNECT_TIMEOUT_MS = 60_000;
const WARNING_INTERVAL_MS = 1_000;

interface DisconnectEntry {
  userId: string;
  timeout: NodeJS.Timeout;
  warningInterval: NodeJS.Timeout;
  startedAt: number;
}

class DisconnectService {
  private timers = new Map<string, DisconnectEntry>();

  private makeKey(roomId: string, userId: string): string {
    return `${roomId}:${userId}`;
  }

  /**
   * Start a 60-second disconnect countdown for a player in a room.
   * When the timer expires, the disconnected player loses.
   * Every second, a disconnect:warning is broadcast to other room members.
   */
  startDisconnectTimer(roomId: string, userId: string, io: TypedServer): void {
    const key = this.makeKey(roomId, userId);

    // Cancel any existing timer for the same player-room combo
    if (this.timers.has(key)) {
      this.cancelDisconnectTimer(roomId, userId);
    }

    const startedAt = Date.now();

    // Broadcast disconnect:warning every second
    const warningInterval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remainingSeconds = Math.max(
        0,
        Math.ceil((DISCONNECT_TIMEOUT_MS - elapsed) / 1000),
      );

      io.to(roomId).emit('disconnect:warning', {
        roomId,
        remainingSeconds,
      });
    }, WARNING_INTERVAL_MS);

    // Main timeout: declare the disconnected player as loser
    const timeout = setTimeout(async () => {
      try {
        // Clear from map first to prevent re-entry
        this.timers.delete(key);
        clearInterval(warningInterval);

        const room = await prisma.room.findUnique({
          where: { id: roomId },
        });

        if (!room || room.status !== 'playing') {
          logger.info(
            `Disconnect timer expired for room ${roomId}, but game is no longer in progress — skipping`,
          );
          return;
        }

        // Determine the winner (opponent of disconnected player)
        let winner: PlayerColor;
        if (room.hostId === userId) {
          winner = room.hostColor === 'black' ? 'white' : 'black';
        } else {
          winner = room.hostColor === 'black' ? 'black' : 'white';
        }

        // Update database
        await prisma.room.update({
          where: { id: roomId },
          data: {
            status: 'finished',
            winner,
            disconnectTimeoutAt: new Date(),
          },
        });

        // ── Ranked game finalization ──────────────────────────────────────
        let ratingChanges;
        if (room.isRanked) {
          try {
            ratingChanges = await onlineGameService.finalizeRankedGame(
              roomId,
              winner,
              false,
            );
          } catch (eloErr) {
            logger.error(
              `ELO finalization error on disconnect for room ${roomId}: ${eloErr instanceof Error ? eloErr.message : String(eloErr)}`,
            );
          }
        }

        // Broadcast game:over with disconnect reason
        io.to(roomId).emit('game:over', {
          roomId,
          winner,
          reason: 'disconnect' as GameOverReason,
          ratingChanges,
        });

        logger.info(
          `Disconnect timer expired: player ${userId} in room ${roomId} loses by disconnect`,
        );
      } catch (err) {
        logger.error(
          `Error processing disconnect timeout for room ${roomId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }, DISCONNECT_TIMEOUT_MS);

    this.timers.set(key, { userId, timeout, warningInterval, startedAt });

    logger.info(
      `Disconnect timer started for player ${userId} in room ${roomId} (${DISCONNECT_TIMEOUT_MS / 1000}s)`,
    );
  }

  /**
   * Cancel the disconnect countdown (player reconnected).
   */
  cancelDisconnectTimer(roomId: string, userId: string): void {
    const key = this.makeKey(roomId, userId);
    const entry = this.timers.get(key);

    if (entry) {
      clearTimeout(entry.timeout);
      clearInterval(entry.warningInterval);
      this.timers.delete(key);
      logger.info(
        `Disconnect timer cancelled for player ${userId} in room ${roomId}`,
      );
    }
  }

  /**
   * Check whether a player is currently in a disconnected state for a room.
   */
  isDisconnected(roomId: string, userId: string): boolean {
    return this.timers.has(this.makeKey(roomId, userId));
  }
}

export const disconnectService = new DisconnectService();
