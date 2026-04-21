import { Request, Response } from 'express';
import { gomokuService } from '../services/gomoku.service';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { frontendGameToBackendData, backendGameToFrontendGame } from '../utils/game-converter';

export class GomokuController {
  /**
   * 从前端格式创建五子棋棋谱
   */
  async createGameFromFrontend(req: Request, res: Response) {
    try {
      const frontendGame = req.body;
      const authorId = req.user?.id;
      const userRole = req.user?.role;

      // 验证必要字段
      if (!frontendGame.name || !frontendGame.moveHistory) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Missing required fields: name and moveHistory',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      // 转换前端数据为后端格式
      const backendData = frontendGameToBackendData(frontendGame);

      // 创建棋谱
      const game = await gomokuService.createGame(backendData, authorId, userRole);

      const response: ApiResponse = {
        success: true,
        data: {
          id: game.id,
          name: frontendGame.name,
          timestamp: frontendGame.timestamp,
        },
        message: 'Game saved successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(201).json(response);
    } catch (error) {
      logger.error('Create game from frontend error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to save game',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }

  /**
   * 获取前端格式的五子棋棋谱列表
   */
  async getGamesForFrontend(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // 权限过滤逻辑：
      // - Admin: 只能看到公开棋谱 (isPublic: true)
      // - 非Admin: 能看到公开棋谱 + 自己的私有棋谱 (isPublic: true OR authorId: userId)
      // - 未登录: 只能看到公开棋谱 (isPublic: true)
      const filters: Record<string, unknown> = {};
      if (userId && userRole !== 'ADMIN') {
        filters.OR = [
          { isPublic: true },
          { authorId: userId },
        ];
      } else {
        filters.isPublic = true;
      }

      // 获取棋谱列表
      const { games, total } = await gomokuService.getGames(page, pageSize, filters);

      // 转换为前端格式
      const frontendGames = games.map(game => ({
        id: game.id,
        name: game.title,
        timestamp: game.createdAt.getTime(),
        moveCount: Array.isArray(game.moves) ? game.moves.length : 0,
        author: game.authorId ? 'User' : 'Anonymous',
        mode: (game.metadata as Record<string, unknown>)?.mode || 'pvp',
        aiDifficulty: (game.metadata as Record<string, unknown>)?.aiDifficulty || 'intermediate',
        aiRole: (game.metadata as Record<string, unknown>)?.aiRole || 'second',
        ruleMode: (game.metadata as Record<string, unknown>)?.ruleMode || 'standard',
        isPublic: game.isPublic,
        gameType: game.gameType,
        authorId: game.authorId,
      }));

      const response: ApiResponse = {
        success: true,
        data: {
          games: frontendGames,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        },
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Get games for frontend error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch games',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }

  /**
   * 获取单个前端格式的五子棋棋谱
   */
  async getGameForFrontend(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const game = await gomokuService.getGameById(id);

      if (!game) {
        const response: ApiResponse = {
          success: false,
          error: 'Not Found',
          message: 'Game not found',
          timestamp: new Date().toISOString(),
        };
        return res.status(404).json(response);
      }

      // 检查权限：如果游戏是私有的，只有作者可以访问
      if (!game.isPublic && game.authorId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to access this game',
          timestamp: new Date().toISOString(),
        };
        return res.status(403).json(response);
      }

      // 使用转换工具转换为前端格式
      const frontendGame = backendGameToFrontendGame(game as unknown as Record<string, unknown>, id);

      const response: ApiResponse = {
        success: true,
        data: frontendGame,
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Get game for frontend error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch game',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }
}

export const gomokuController = new GomokuController();