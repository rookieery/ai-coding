import { Request, Response } from 'express';
import { prisma } from '../app';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export class UserController {
  /**
   * GET /api/users/:id/rating
   * Get a user's rating info: rating, total games, wins, losses, draws, win rate.
   * Access: Public (optional auth).
   */
  async getUserRating(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, rating: true, avatar: true },
      });

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'Not Found',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      const [totalGames, blackWins, whiteWins, draws] = await Promise.all([
        prisma.match.count({
          where: {
            OR: [{ playerBlackId: id }, { playerWhiteId: id }],
          },
        }),
        prisma.match.count({
          where: { playerBlackId: id, result: 'black' },
        }),
        prisma.match.count({
          where: { playerWhiteId: id, result: 'white' },
        }),
        prisma.match.count({
          where: {
            OR: [{ playerBlackId: id }, { playerWhiteId: id }],
            result: 'draw',
          },
        }),
      ]);

      const wins = blackWins + whiteWins;
      const losses = totalGames - wins - draws;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      const response: ApiResponse<{
        id: string;
        username: string;
        rating: number;
        avatar: string | null;
        totalGames: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number;
      }> = {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          rating: user.rating,
          avatar: user.avatar,
          totalGames,
          wins,
          losses,
          draws,
          winRate,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get user rating error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch user rating',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/users/leaderboard
   * Get the leaderboard: Top 50 users by rating (descending).
   * Access: Public (optional auth).
   */
  async getLeaderboard(_req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        orderBy: { rating: 'desc' },
        take: 50,
        select: {
          id: true,
          username: true,
          rating: true,
          avatar: true,
        },
      });

      const leaderboard = users.map((u, index) => ({
        rank: index + 1,
        id: u.id,
        username: u.username,
        rating: u.rating,
        avatar: u.avatar,
      }));

      const response: ApiResponse<typeof leaderboard> = {
        success: true,
        data: leaderboard,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get leaderboard error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch leaderboard',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
}

export const userController = new UserController();
