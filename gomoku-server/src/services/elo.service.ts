import { prisma } from '../app';
import { logger } from '../utils/logger';

// ── Types ──────────────────────────────────────────────────────────────

export interface EloResult {
  newPlayerRating: number;
  newOpponentRating: number;
}

export interface RatingUpdateResult extends EloResult {
  playerId: string;
  opponentId: string;
}

// ── K-factor helpers ───────────────────────────────────────────────────

/**
 * Determine the K-factor based on player profile.
 * - First 30 games (gamesPlayed < 30): K = 40
 * - Rating < 2400: K = 20
 * - Rating >= 2400: K = 10
 */
function getKFactor(rating: number, gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40;
  if (rating < 2400) return 20;
  return 10;
}

// ── Pure ELO calculation ───────────────────────────────────────────────

/**
 * Calculate new ratings using the standard ELO formula.
 *
 * Expected = 1 / (1 + 10^((opponentRating - playerRating) / 400))
 * New = Old + K * (Actual - Expected)
 *
 * @param playerRating   Current rating of the player
 * @param opponentRating Current rating of the opponent
 * @param result         'win' | 'loss' | 'draw'
 * @param playerGamesPlayed   Number of games the player has played (for K-factor)
 * @param opponentGamesPlayed Number of games the opponent has played (for K-factor)
 */
export function calculateNewRating(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw',
  playerGamesPlayed: number = 0,
  opponentGamesPlayed: number = 0,
): EloResult {
  // Clamp ratings to non-negative
  const pRating = Math.max(0, playerRating);
  const oRating = Math.max(0, opponentRating);

  const playerK = getKFactor(pRating, playerGamesPlayed);
  const opponentK = getKFactor(oRating, opponentGamesPlayed);

  const expectedPlayer =
    1 / (1 + Math.pow(10, (oRating - pRating) / 400));
  const expectedOpponent =
    1 / (1 + Math.pow(10, (pRating - oRating) / 400));

  let actualPlayer: number;
  let actualOpponent: number;

  switch (result) {
    case 'win':
      actualPlayer = 1;
      actualOpponent = 0;
      break;
    case 'loss':
      actualPlayer = 0;
      actualOpponent = 1;
      break;
    case 'draw':
      actualPlayer = 0.5;
      actualOpponent = 0.5;
      break;
  }

  const newPlayerRating = Math.round(
    pRating + playerK * (actualPlayer - expectedPlayer),
  );
  const newOpponentRating = Math.round(
    oRating + opponentK * (actualOpponent - expectedOpponent),
  );

  return {
    newPlayerRating: Math.max(0, newPlayerRating),
    newOpponentRating: Math.max(0, newOpponentRating),
  };
}

// ── Service class ──────────────────────────────────────────────────────

class EloService {
  /**
   * Update ratings in the database after a game concludes.
   *
   * @param winnerId  User ID of the winner (ignored for draws)
   * @param loserId   User ID of the loser  (ignored for draws)
   * @param isDraw    Whether the game ended in a draw
   * @returns The updated rating values for both players
   */
  async updateRatings(
    winnerId: string,
    loserId: string,
    isDraw: boolean,
  ): Promise<RatingUpdateResult> {
    const [winner, loser] = await Promise.all([
      prisma.user.findUnique({ where: { id: winnerId } }),
      prisma.user.findUnique({ where: { id: loserId } }),
    ]);

    if (!winner || !loser) {
      throw new Error('USER_NOT_FOUND');
    }

    // Count previous matches for K-factor calculation
    const [winnerGames, loserGames] = await Promise.all([
      prisma.match.count({
        where: {
          OR: [{ playerBlackId: winnerId }, { playerWhiteId: winnerId }],
        },
      }),
      prisma.match.count({
        where: {
          OR: [{ playerBlackId: loserId }, { playerWhiteId: loserId }],
        },
      }),
    ]);

    // For EloService, "player" = winner, "opponent" = loser
    const result = isDraw ? 'draw' : 'win';

    const eloResult = calculateNewRating(
      winner.rating,
      loser.rating,
      result,
      winnerGames,
      loserGames,
    );

    await Promise.all([
      prisma.user.update({
        where: { id: winnerId },
        data: { rating: eloResult.newPlayerRating },
      }),
      prisma.user.update({
        where: { id: loserId },
        data: { rating: eloResult.newOpponentRating },
      }),
    ]);

    logger.info(
      `ELO updated: ${winner.username} (${winner.rating} -> ${eloResult.newPlayerRating}), ` +
      `${loser.username} (${loser.rating} -> ${eloResult.newOpponentRating})`,
    );

    return {
      playerId: winnerId,
      opponentId: loserId,
      ...eloResult,
    };
  }
}

export const eloService = new EloService();
