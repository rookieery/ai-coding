import { logger } from '../utils/logger';

export interface QueueEntry {
  userId: string;
  rating: number;
  enqueuedAt: number;
}

export interface MatchResult {
  player1: QueueEntry;
  player2: QueueEntry;
  ruleMode: string;
}

/** Base rating difference threshold for immediate matching */
const BASE_RATING_THRESHOLD = 200;
/** Time (ms) before the threshold begins to expand */
const EXPANSION_DELAY_MS = 30_000;
/** Extra rating range (ms) added per expansion tick */
const EXPANSION_STEP = 100;
/** Interval (ms) between expansion ticks after the delay */
const EXPANSION_TICK_MS = 10_000;

class MatchmakingService {
  private queues = new Map<string, QueueEntry[]>();

  /**
   * Add a player to the matchmaking queue for the given rule mode.
   * Prevents duplicate entries — a user can only be in one queue at a time.
   *
   * @returns `true` if enqueued successfully, `false` if already queued
   */
  enqueue(userId: string, rating: number, ruleMode: string): boolean {
    // Prevent duplicate entry across all queues
    if (this.isQueued(userId)) {
      return false;
    }

    const queue = this.queues.get(ruleMode) ?? [];
    const entry: QueueEntry = {
      userId,
      rating: Math.max(0, rating),
      enqueuedAt: Date.now(),
    };

    queue.push(entry);
    this.queues.set(ruleMode, queue);

    logger.info(
      `User ${userId} (rating ${rating}) enqueued for ${ruleMode} — queue size: ${queue.length}`,
    );
    return true;
  }

  /**
   * Remove a user from all matchmaking queues.
   * Used when a player cancels matchmaking or disconnects.
   *
   * @returns `true` if the user was found and removed, `false` otherwise
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

        // Clean up empty queues
        if (queue.length === 0) {
          this.queues.delete(ruleMode);
        }
      }
    }

    return found;
  }

  /**
   * Attempt to find a match from all queues.
   * Scans each queue and pairs players whose rating difference falls within
   * a dynamic threshold:
   *   - Base threshold: 200 points
   *   - After waiting 30 s, the threshold expands by 100 points every 10 s
   *
   * When a match is found, both players are removed from the queue.
   *
   * @returns A `MatchResult` if a pair was found, or `null`
   */
  findMatch(): MatchResult | null {
    for (const [ruleMode, queue] of this.queues.entries()) {
      if (queue.length < 2) continue;

      // Outer loop: pick the player who has waited the longest
      for (let i = 0; i < queue.length - 1; i++) {
        const player1 = queue[i];
        const waitTime = Date.now() - player1.enqueuedAt;

        // Dynamic threshold: expands after EXPANSION_DELAY_MS
        let threshold = BASE_RATING_THRESHOLD;
        if (waitTime > EXPANSION_DELAY_MS) {
          const ticks = Math.floor(
            (waitTime - EXPANSION_DELAY_MS) / EXPANSION_TICK_MS,
          );
          threshold += ticks * EXPANSION_STEP;
        }

        // Inner loop: find the closest rated opponent within threshold
        let bestIndex = -1;
        let bestDiff = Infinity;

        for (let j = i + 1; j < queue.length; j++) {
          const diff = Math.abs(player1.rating - queue[j].rating);
          if (diff <= threshold && diff < bestDiff) {
            bestDiff = diff;
            bestIndex = j;
          }
        }

        if (bestIndex !== -1) {
          const player2 = queue[bestIndex];

          // Remove matched players (higher index first to avoid shifting)
          queue.splice(bestIndex, 1);
          queue.splice(i, 1);

          // Clean up empty queues
          if (queue.length === 0) {
            this.queues.delete(ruleMode);
          }

          logger.info(
            `Match found in ${ruleMode}: ${player1.userId} (${player1.rating}) vs ${player2.userId} (${player2.rating}), diff=${bestDiff}`,
          );

          return { player1, player2, ruleMode };
        }
      }
    }

    return null;
  }

  /**
   * Get the position of a user in their current queue (1-based).
   *
   * @returns The 1-based position, or `0` if the user is not in any queue
   */
  getQueuePosition(userId: string): number {
    for (const queue of this.queues.values()) {
      const index = queue.findIndex((entry) => entry.userId === userId);
      if (index !== -1) {
        return index + 1;
      }
    }
    return 0;
  }

  /**
   * Get the number of players waiting in the queue for the given rule mode.
   */
  getQueueSize(ruleMode: string): number {
    return this.queues.get(ruleMode)?.length ?? 0;
  }

  /**
   * Check whether a user is currently in any matchmaking queue.
   */
  isQueued(userId: string): boolean {
    for (const queue of this.queues.values()) {
      if (queue.some((entry) => entry.userId === userId)) {
        return true;
      }
    }
    return false;
  }
}

export const matchmakingService = new MatchmakingService();
