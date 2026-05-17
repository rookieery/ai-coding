/**
 * Unit Tests for MatchmakingService
 * Covers: enqueue, dequeue, findMatch, getQueuePosition, getQueueSize, duplicate prevention.
 */

import { matchmakingService, type QueueEntry } from './matchmaking.service';

/**
 * Helper: access the private queues map for test assertions and time manipulation.
 */
function getQueues(): Map<string, QueueEntry[]> {
  return (matchmakingService as unknown as { queues: Map<string, QueueEntry[]> }).queues;
}

/**
 * Helper: fast-forward the enqueuedAt timestamp of all entries by ms milliseconds.
 */
function fastForward(ms: number): void {
  for (const queue of getQueues().values()) {
    for (const entry of queue) {
      entry.enqueuedAt -= ms;
    }
  }
}

beforeEach(() => {
  const queues = getQueues();
  const allUserIds: string[] = [];
  for (const queue of queues.values()) {
    for (const entry of queue) {
      allUserIds.push(entry.userId);
    }
  }
  for (const uid of allUserIds) {
    matchmakingService.dequeue(uid);
  }
  queues.clear();
});

describe('MatchmakingService', () => {
  // 1. Same rating - immediate match
  it('matches two players with the same rating immediately', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');
    matchmakingService.enqueue('userB', 1200, 'standard');

    const match = matchmakingService.findMatch();

    expect(match).not.toBeNull();
    expect(match!.player1.userId).toBe('userA');
    expect(match!.player2.userId).toBe('userB');
    expect(match!.ruleMode).toBe('standard');

    expect(matchmakingService.getQueueSize('standard')).toBe(0);
  });

  // 2. Rating gap too large - no match
  it('does not match players when rating gap exceeds 200', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');
    matchmakingService.enqueue('userB', 1500, 'standard');

    const match = matchmakingService.findMatch();

    expect(match).toBeNull();
    expect(matchmakingService.getQueueSize('standard')).toBe(2);
  });

  // 3. Wait timeout expands range - then match
  it('matches after rating threshold expands due to wait time', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');
    matchmakingService.enqueue('userB', 1500, 'standard');

    expect(matchmakingService.findMatch()).toBeNull();

    // 40 seconds: 1 full tick past 30s delay, threshold = 200 + 100 = 300
    fastForward(40_000);

    const match = matchmakingService.findMatch();

    expect(match).not.toBeNull();
    expect(match!.player1.userId).toBe('userA');
    expect(match!.player2.userId).toBe('userB');
  });

  // 4. Multiple players - correct pairing
  it('pairs the closest-rated players among multiple entries', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');
    matchmakingService.enqueue('userB', 1250, 'standard');
    matchmakingService.enqueue('userC', 1300, 'standard');

    const match = matchmakingService.findMatch();

    expect(match).not.toBeNull();
    expect([match!.player1.userId, match!.player2.userId].sort()).toEqual(
      ['userA', 'userB'].sort(),
    );

    expect(matchmakingService.getQueueSize('standard')).toBe(1);
    expect(matchmakingService.getQueuePosition('userC')).toBe(1);
  });

  // 5. Cancel matchmaking - no longer matched
  it('does not match a player after they cancel (dequeue)', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');
    matchmakingService.enqueue('userB', 1200, 'standard');

    const removed = matchmakingService.dequeue('userB');
    expect(removed).toBe(true);

    const match = matchmakingService.findMatch();

    expect(match).toBeNull();
    expect(matchmakingService.getQueueSize('standard')).toBe(1);
  });

  // 6. Empty queue - no errors
  it('returns null when queue is empty', () => {
    expect(matchmakingService.getQueueSize('standard')).toBe(0);

    const match = matchmakingService.findMatch();
    expect(match).toBeNull();
  });

  it('returns null when only one player is in queue', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');

    const match = matchmakingService.findMatch();
    expect(match).toBeNull();
  });

  // 7. Prevent duplicate entry
  it('prevents the same user from enqueuing twice', () => {
    const first = matchmakingService.enqueue('userA', 1200, 'standard');
    const second = matchmakingService.enqueue('userA', 1300, 'renju');

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(matchmakingService.getQueueSize('standard')).toBe(1);
    expect(matchmakingService.getQueueSize('renju')).toBe(0);
  });

  // 8. Dequeue from non-existent queue
  it('returns false when dequeuing a user not in any queue', () => {
    const removed = matchmakingService.dequeue('nonExistent');
    expect(removed).toBe(false);
  });

  // 9. Different rule modes - no cross-mode matching
  it('does not match players across different rule modes', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');
    matchmakingService.enqueue('userB', 1200, 'renju');

    const match = matchmakingService.findMatch();
    expect(match).toBeNull();

    expect(matchmakingService.getQueueSize('standard')).toBe(1);
    expect(matchmakingService.getQueueSize('renju')).toBe(1);
  });

  // 10. Queue position tracking
  it('returns correct queue position (1-based)', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');
    matchmakingService.enqueue('userB', 1300, 'standard');
    matchmakingService.enqueue('userC', 1400, 'standard');

    expect(matchmakingService.getQueuePosition('userA')).toBe(1);
    expect(matchmakingService.getQueuePosition('userB')).toBe(2);
    expect(matchmakingService.getQueuePosition('userC')).toBe(3);
  });

  it('returns 0 for a user not in any queue', () => {
    expect(matchmakingService.getQueuePosition('nobody')).toBe(0);
  });

  // 11. Multiple sequential matches
  it('matches sequentially as new players join', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');
    matchmakingService.enqueue('userB', 1200, 'standard');

    const match1 = matchmakingService.findMatch();
    expect(match1).not.toBeNull();

    expect(matchmakingService.getQueueSize('standard')).toBe(0);

    matchmakingService.enqueue('userC', 1400, 'standard');
    matchmakingService.enqueue('userD', 1350, 'standard');

    const match2 = matchmakingService.findMatch();
    expect(match2).not.toBeNull();
    expect([match2!.player1.userId, match2!.player2.userId].sort()).toEqual(
      ['userC', 'userD'].sort(),
    );
  });

  // 12. Large threshold expansion over time
  it('expands threshold by 100 every 10s after the 30s delay', () => {
    matchmakingService.enqueue('userA', 1200, 'standard');
    matchmakingService.enqueue('userB', 1500, 'standard');

    expect(matchmakingService.findMatch()).toBeNull();

    // 31 seconds: 0 full ticks past 30s delay, threshold still 200
    fastForward(31_000);
    expect(matchmakingService.findMatch()).toBeNull();

    // 40 seconds total: 1 tick, threshold = 300, gap = 300 fits
    fastForward(9_000);
    const match = matchmakingService.findMatch();
    expect(match).not.toBeNull();
  });
});
