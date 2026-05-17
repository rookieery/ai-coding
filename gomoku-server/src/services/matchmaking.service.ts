import { logger } from '../utils/logger';

interface QueueEntry {
  userId: string;
  rating: number;
  enqueuedAt: number;
}

/**
 * Minimal MatchmakingService stub for disconnect integration.
 * Full implementation will be completed in ONLINE-23.
 */
class MatchmakingService {
  private queues = new Map<string, QueueEntry[]>();

  /**
   * Remove a user from all matchmaking queues.
   * Used when a player disconnects to prevent zombie entries.
   */
  dequeue(userId: string): boolean {
    let found = false;

    for (const [ruleMode, queue] of this.queues.entries()) {
      const index = queue.findIndex((entry) => entry.userId === userId);
      if (index !== -1) {
        queue.splice(index, 1);
        found = true;
        logger.info(
          `User ${userId} dequeued from ${ruleMode} matchmaking queue`,
        );
      }
    }

    return found;
  }
}

export const matchmakingService = new MatchmakingService();
