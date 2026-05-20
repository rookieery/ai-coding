import { prisma } from '../../app';
import { matchmakingService } from '../../services/matchmaking.service';
import { roomService } from '../../services/room.service';
import { logger } from '../../utils/logger';
import type { RuleMode, TypedServer, TypedSocket } from '../types';

/** Interval (ms) between periodic matchmaking ticks */
const MATCHMAKING_TICK_MS = 5_000;

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Find a connected socket by user ID.
 */
function findSocketByUserId(io: TypedServer, userId: string): TypedSocket | undefined {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.user?.id === userId) {
      return socket;
    }
  }
  return undefined;
}

/**
 * Process a successful match: create a ranked room, notify both players.
 */
async function handleMatchResult(
  io: TypedServer,
  match: { player1: { userId: string; rating: number }; player2: { userId: string; rating: number }; ruleMode: string },
): Promise<void> {
  const { player1, player2, ruleMode } = match;

  try {
    // Look up both users from DB
    const [user1, user2] = await Promise.all([
      prisma.user.findUnique({
        where: { id: player1.userId },
        select: { id: true, username: true, rating: true },
      }),
      prisma.user.findUnique({
        where: { id: player2.userId },
        select: { id: true, username: true, rating: true },
      }),
    ]);

    if (!user1 || !user2) {
      logger.error(
        `Matchmaking: could not find users ${player1.userId} / ${player2.userId}`,
      );
      return;
    }

    // Create ranked room with player1 as host
    const room = await roomService.createRoom(
      player1.userId,
      `Ranked: ${user1.username} vs ${user2.username}`,
      ruleMode as RuleMode,
      true, // isRanked
    );

    // Join player2 as guest — this transitions room to 'playing'
    const { room: updatedRoom } = await roomService.joinRoom(room.id, player2.userId);

    // Find sockets for both players and join them to the Socket.io room
    const p1Socket = findSocketByUserId(io, player1.userId);
    const p2Socket = findSocketByUserId(io, player2.userId);

    if (p1Socket) {
      p1Socket.join(room.id);
      p1Socket.join(`${room.id}:players`);
    }
    if (p2Socket) {
      p2Socket.join(room.id);
      p2Socket.join(`${room.id}:players`);
    }

    // Emit match:found to each player with opponent info
    if (p1Socket) {
      p1Socket.emit('match:found', {
        roomId: room.id,
        opponent: { id: user2.id, username: user2.username, rating: user2.rating },
      });
    }
    if (p2Socket) {
      p2Socket.emit('match:found', {
        roomId: room.id,
        opponent: { id: user1.id, username: user1.username, rating: user1.rating },
      });
    }

    // Broadcast updated room state to everyone in the room
    io.to(room.id).emit('room:updated', { room: updatedRoom });

    logger.info(
      `Matchmaking: ${user1.username} (${player1.rating}) vs ${user2.username} (${player2.rating}) — room ${room.id}`,
    );
  } catch (err) {
    logger.error(
      `Matchmaking: error handling match result: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ── Periodic Timer ───────────────────────────────────────────────────────

/**
 * Start the periodic matchmaking timer.
 * Should be called once from `initializeSocket`.
 */
export function startMatchmakingTimer(io: TypedServer): void {
  setInterval(() => {
    const match = matchmakingService.findMatch();
    if (match) {
      handleMatchResult(io, match);
    }
  }, MATCHMAKING_TICK_MS);

  logger.info(`Matchmaking timer started (interval: ${MATCHMAKING_TICK_MS}ms)`);
}

// ── Event Handlers ───────────────────────────────────────────────────────

/**
 * Register match-related Socket.io event handlers on the given socket.
 */
export function registerMatchHandlers(io: TypedServer, socket: TypedSocket): void {
  // ── match:queue ────────────────────────────────────────────────────────
  socket.on('match:queue', async (payload) => {
    try {
      if (!socket.data.user) {
        socket.emit('match:error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
      }

      const userId = socket.data.user.id;
      const { ruleMode } = payload;

      // Fetch user rating from DB
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rating: true },
      });

      if (!user) {
        socket.emit('match:error', { code: 'USER_NOT_FOUND', message: 'User not found' });
        return;
      }

      // Enqueue (prevents duplicate entry)
      const enqueued = matchmakingService.enqueue(userId, user.rating, ruleMode);
      if (!enqueued) {
        socket.emit('match:error', {
          code: 'ALREADY_IN_QUEUE',
          message: 'Already in matchmaking queue',
        });
        return;
      }

      // Notify user of their queue position
      const position = matchmakingService.getQueuePosition(userId);
      socket.emit('match:waiting', { position });

      // Attempt immediate match
      const match = matchmakingService.findMatch();
      if (match) {
        await handleMatchResult(io, match);
      }

      logger.info(
        `match:queue — user ${userId} (rating ${user.rating}) queued for ${ruleMode}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`match:queue error: ${message}`);
      socket.emit('match:error', { code: 'MATCH_QUEUE_FAILED', message });
    }
  });

  // ── match:cancel ───────────────────────────────────────────────────────
  socket.on('match:cancel', async () => {
    try {
      if (!socket.data.user) {
        socket.emit('match:error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
      }

      const userId = socket.data.user.id;
      matchmakingService.dequeue(userId);

      logger.info(`match:cancel — user ${userId} left matchmaking queue`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`match:cancel error: ${message}`);
      socket.emit('match:error', { code: 'MATCH_CANCEL_FAILED', message });
    }
  });
}
