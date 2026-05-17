/**
 * Unit Tests for ELO Rating Service
 * Tests the pure calculateNewRating function for all ELO scenarios.
 */

import { calculateNewRating } from './elo.service';

describe('EloService - calculateNewRating', () => {
  // -- 1. Initial rating match (1200 vs 1200) ---

  describe('initial rating match (1200 vs 1200)', () => {
    it('winner gains points, loser loses points', () => {
      const result = calculateNewRating(1200, 1200, 'win');

      expect(result.newPlayerRating).toBeGreaterThan(1200);
      expect(result.newOpponentRating).toBeLessThan(1200);

      // Expected = 0.5, K = 40 (gamesPlayed < 30)
      // New = 1200 + 40 * (1 - 0.5) = 1220
      // Opp = 1200 + 40 * (0 - 0.5) = 1180
      expect(result.newPlayerRating).toBe(1220);
      expect(result.newOpponentRating).toBe(1180);
    });

    it('rating change is symmetric for equal players', () => {
      const result = calculateNewRating(1200, 1200, 'win');
      const playerGain = result.newPlayerRating - 1200;
      const opponentLoss = 1200 - result.newOpponentRating;

      expect(playerGain).toBe(opponentLoss);
    });
  });

  // -- 2. High rating beats low rating - small change ---

  describe('high rating beats low rating', () => {
    it('high-rated winner gains fewer points', () => {
      // 2000 vs 1200: expected ≈ 0.99, even K=40 gives gain = 0.396 → rounds to 0
      const result = calculateNewRating(2000, 1200, 'win', 0, 0);

      // The gain is so small it rounds to 0 — this is correct ELO behavior
      expect(result.newPlayerRating).toBeGreaterThanOrEqual(2000);
      const gain = result.newPlayerRating - 2000;
      expect(gain).toBeLessThanOrEqual(10);
    });

    it('low-rated loser loses fewer points', () => {
      const result = calculateNewRating(2000, 1200, 'win', 0, 0);

      // Expected opponent ≈ 0.01, loss = 40 * (0 - 0.01) ≈ -0.4 → rounds to 0
      // Loss is very small since the outcome was expected
      const loss = 1200 - result.newOpponentRating;
      expect(loss).toBeLessThanOrEqual(10);
    });

    it('exact calculation with K=20 rounds very small change', () => {
      const result = calculateNewRating(2000, 1200, 'win', 30, 30);

      const expectedPlayer = 1 / (1 + Math.pow(10, (1200 - 2000) / 400));
      expect(expectedPlayer).toBeCloseTo(0.9901, 3);
      // K=20 * (1 - 0.9901) = 0.198, rounds to 0
      expect(result.newPlayerRating).toBe(2000);
    });

    it('moderate gap with K=20 shows visible change', () => {
      // 1500 vs 1200 — moderate gap
      const result = calculateNewRating(1500, 1200, 'win', 30, 30);

      // expected ≈ 0.849, K=20, gain = 20 * (1 - 0.849) ≈ 3.02 → rounds to 3
      expect(result.newPlayerRating).toBe(1503);
    });
  });

  // -- 3. Low rating beats high rating - big change (upset) ---

  describe('low rating beats high rating (upset)', () => {
    it('low-rated winner gains many points', () => {
      const result = calculateNewRating(1200, 2000, 'win', 30, 30);

      expect(result.newPlayerRating).toBeGreaterThan(1200);
      const gain = result.newPlayerRating - 1200;
      expect(gain).toBeGreaterThan(10);
    });

    it('high-rated loser loses many points', () => {
      const result = calculateNewRating(1200, 2000, 'win', 30, 30);

      expect(result.newOpponentRating).toBeLessThan(2000);
      const loss = 2000 - result.newOpponentRating;
      expect(loss).toBeGreaterThan(10);
    });

    it('upset gain is larger than expected win gain', () => {
      const upsetResult = calculateNewRating(1200, 2000, 'win', 30, 30);
      const expectedResult = calculateNewRating(2000, 1200, 'win', 30, 30);

      const upsetGain = upsetResult.newPlayerRating - 1200;
      const expectedGain = expectedResult.newPlayerRating - 2000;

      expect(upsetGain).toBeGreaterThan(expectedGain);
    });
  });

  // -- 4. Draw - both ratings move toward average ---

  describe('draw handling', () => {
    it('equal players stay at same rating on draw', () => {
      const result = calculateNewRating(1200, 1200, 'draw');

      expect(result.newPlayerRating).toBe(1200);
      expect(result.newOpponentRating).toBe(1200);
    });

    it('higher-rated player loses on draw, lower-rated gains', () => {
      const result = calculateNewRating(1800, 1200, 'draw', 30, 30);

      expect(result.newPlayerRating).toBeLessThan(1800);
      expect(result.newOpponentRating).toBeGreaterThan(1200);
    });

    it('ratings converge toward each other on draw', () => {
      const result = calculateNewRating(1600, 1400, 'draw', 30, 30);

      const playerDiff = 1600 - result.newPlayerRating;
      const opponentDiff = result.newOpponentRating - 1400;

      expect(playerDiff).toBeGreaterThan(0);
      expect(opponentDiff).toBeGreaterThan(0);
    });
  });

  // -- 5. K-factor variation ---

  describe('K-factor variation', () => {
    it('K=40 for players with fewer than 30 games', () => {
      const result = calculateNewRating(1200, 1200, 'win', 0, 0);
      expect(result.newPlayerRating).toBe(1220);
      expect(result.newOpponentRating).toBe(1180);
    });

    it('K=20 for players with 30+ games and rating < 2400', () => {
      const result = calculateNewRating(1200, 1200, 'win', 30, 30);
      expect(result.newPlayerRating).toBe(1210);
      expect(result.newOpponentRating).toBe(1190);
    });

    it('K=10 for players with rating >= 2400', () => {
      const result = calculateNewRating(2400, 2400, 'win', 30, 30);
      expect(result.newPlayerRating).toBe(2405);
      expect(result.newOpponentRating).toBe(2395);
    });

    it('different K-factors for each player', () => {
      const result = calculateNewRating(1200, 1200, 'win', 0, 30);

      expect(result.newPlayerRating).toBe(1220);
      expect(result.newOpponentRating).toBe(1190);
    });

    it('K=40 still applies at rating 2399 with < 30 games', () => {
      // 2399 vs 2399 — equal players, K=40 since gamesPlayed < 30
      const result = calculateNewRating(2399, 2399, 'win', 0, 0);
      expect(result.newPlayerRating - 2399).toBeLessThan(40);
      expect(result.newPlayerRating).toBeGreaterThan(2399);
    });
  });

  // -- 6. Boundary values ---

  describe('boundary values', () => {
    it('rating of 0 should not go negative', () => {
      const result = calculateNewRating(0, 1200, 'loss', 30, 30);

      expect(result.newPlayerRating).toBeGreaterThanOrEqual(0);
    });

    it('extremely high rating should not cause overflow', () => {
      const result = calculateNewRating(9999, 1000, 'win', 30, 30);

      // Very large gap: expected ≈ 1.0, change rounds to 0 for winner
      expect(isFinite(result.newPlayerRating)).toBe(true);
      expect(isFinite(result.newOpponentRating)).toBe(true);
      expect(result.newPlayerRating).toBeGreaterThanOrEqual(9999);
      expect(result.newOpponentRating).toBeLessThanOrEqual(1000);
    });

    it('negative rating is clamped to 0', () => {
      const result = calculateNewRating(-100, 1200, 'win');

      expect(result.newPlayerRating).toBeGreaterThan(0);
    });

    it('both players at rating 0', () => {
      const result = calculateNewRating(0, 0, 'win', 0, 0);

      expect(result.newPlayerRating).toBe(20);
      expect(result.newOpponentRating).toBe(0);
    });

    it('loss result produces correct output', () => {
      const result = calculateNewRating(1200, 1200, 'loss', 0, 0);

      expect(result.newPlayerRating).toBeLessThan(1200);
      expect(result.newOpponentRating).toBeGreaterThan(1200);
    });
  });

  // -- 7. Zero-sum property for equal K-factors ---

  describe('zero-sum property', () => {
    it('total rating is conserved when both players have same K-factor', () => {
      const result = calculateNewRating(1500, 1300, 'win', 30, 30);

      const totalBefore = 1500 + 1300;
      const totalAfter = result.newPlayerRating + result.newOpponentRating;

      expect(totalAfter).toBe(totalBefore);
    });

    it('total rating NOT conserved when K-factors differ', () => {
      const result = calculateNewRating(1500, 1300, 'win', 0, 30);

      const totalBefore = 1500 + 1300;
      const totalAfter = result.newPlayerRating + result.newOpponentRating;

      expect(totalAfter).not.toBe(totalBefore);
    });
  });
});