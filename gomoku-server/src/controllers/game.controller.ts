import { Request, Response } from 'express';
import { gameService } from '../services/game.service';
import { logger } from '../utils/logger';
import { ApiResponse, PaginatedResponse } from '../types';
import { frontendGameToBackendData, backendGameToFrontendGame } from '../utils/game-converter';

export class GameController {
  /**
   * 创建新棋谱
   */
  async createGame(req: Request, res: Response) {
    try {
      const { title, description, boardSize, moves, result, playerBlack, playerWhite, isPublic, tags } = req.body;
      const authorId = req.user?.id; // 从认证中间件获取，可选

      const game = await gameService.createGame(
        {
          title,
          description,
          boardSize,
          moves,
          result,
          playerBlack,
          playerWhite,
          isPublic,
          tags,
        },
        authorId
      );

      const response: ApiResponse = {
        success: true,
        data: game,
        message: 'Game created successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(201).json(response);
    } catch (error) {
      logger.error('Create game error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create game',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }

  /**
   * 获取棋谱列表
   */
  async getGames(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const authorId = req.query.authorId as string;
      const isPublic = req.query.isPublic as string;
      const tags = req.query.tags as string;
      const search = req.query.search as string;

      const filters: any = {};
      if (authorId) filters.authorId = authorId;
      if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
      if (tags) filters.tags = tags.split(',');
      if (search) filters.search = search;

      const { games, total } = await gameService.getGames(page, pageSize, filters);

      const response: PaginatedResponse<typeof games[0]> = {
        success: true,
        data: games,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Get games error:', error);
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
   * 获取单个棋谱
   */
  async getGame(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const game = await gameService.getGameById(id);

      if (!game) {
        const response: ApiResponse = {
          success: false,
          error: 'Not Found',
          message: 'Game not found',
          timestamp: new Date().toISOString(),
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: game,
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Get game error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch game',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }

  /**
   * 更新棋谱
   */
  async updateGame(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id;

      const game = await gameService.updateGame(id, updateData, userId || '');

      const response: ApiResponse = {
        success: true,
        data: game,
        message: 'Game updated successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Update game error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error && error.message.includes('not found') ? 'Not Found' : 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update game',
        timestamp: new Date().toISOString(),
      };
      return res.status(error instanceof Error && error.message.includes('not found') ? 404 :
                error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500).json(response);
    }
  }

  /**
   * 删除棋谱
   */
  async deleteGame(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      await gameService.deleteGame(id, userId || '');

      const response: ApiResponse = {
        success: true,
        message: 'Game deleted successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Delete game error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error && error.message.includes('not found') ? 'Not Found' : 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete game',
        timestamp: new Date().toISOString(),
      };
      return res.status(error instanceof Error && error.message.includes('not found') ? 404 :
                error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500).json(response);
    }
  }

  /**
   * 获取当前用户的所有棋谱
   */
  async getMyGames(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const { games, total } = await gameService.getUserGames(userId, page, pageSize);

      const response: PaginatedResponse<typeof games[0]> = {
        success: true,
        data: games,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Get my games error:', error);
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
   * 从前端格式创建棋谱
   */
  async createGameFromFrontend(req: Request, res: Response) {
    try {
      const frontendGame = req.body;
      const authorId = req.user?.id;

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
      const game = await gameService.createGame(backendData, authorId);

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
   * 获取前端格式的棋谱
   */
  async getGamesForFrontend(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const userId = req.user?.id;

      // 构建过滤条件：如果用户已认证，显示该用户的所有游戏（包括私有）
      // 如果用户未认证，只显示公共游戏
      const filters: any = {};
      if (userId) {
        filters.authorId = userId;
      } else {
        filters.isPublic = true;
      }

      // 获取棋谱列表
      const { games, total } = await gameService.getGames(page, pageSize, filters);

      // 转换为前端格式
      const frontendGames = games.map(game => ({
        id: game.id,
        name: game.title,
        timestamp: game.createdAt.getTime(),
        moveCount: Array.isArray(game.moves) ? game.moves.length : 0,
        author: game.authorId ? 'User' : 'Anonymous',
        mode: game.metadata?.mode || 'pvp',
        aiDifficulty: game.metadata?.aiDifficulty || 'intermediate',
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
   * 获取单个前端格式的棋谱
   */
  async getGameForFrontend(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const game = await gameService.getGameById(id);

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
      const frontendGame = backendGameToFrontendGame(game, id);

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

export const gameController = new GameController();