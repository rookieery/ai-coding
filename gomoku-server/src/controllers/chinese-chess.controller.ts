import { Request, Response } from 'express';
import { chineseChessService } from '../services/chinese-chess.service';
import { logger } from '../utils/logger';
import { ApiResponse, Move } from '../types';

/**
 * 中国象棋移动历史记录类型
 */
interface ChineseChessMove {
  from: { col: number; row: number };
  to: { col: number; row: number };
  piece: string;
  side: 'red' | 'black';
  timestamp: number;
  capturedPiece?: { type: string; side: 'red' | 'black' };
}

export class ChineseChessController {
  /**
   * 健康检查
   */
  healthCheck(_req: Request, res: Response) {
    const response: ApiResponse = {
      success: true,
      data: { status: 'healthy' },
      message: 'Chinese Chess module is healthy',
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json(response);
  }

  /**
   * 从前端格式创建中国象棋棋谱
   */
  async createGameFromFrontend(req: Request, res: Response) {
    try {
      const frontendGame = req.body;
      const authorId = req.user?.id;
      const userRole = req.user?.role;

      if (!frontendGame.name || !frontendGame.moveHistory) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Missing required fields: name and moveHistory',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      const isPublic = userRole === 'ADMIN' ? true : (frontendGame.isPublic ?? false);
      const metadata = {
        frontendFormat: true,
        mode: frontendGame.mode || 'pvp',
        aiDifficulty: frontendGame.aiDifficulty || 'intermediate',
        aiRole: frontendGame.aiRole || 'black',
        originalTimestamp: frontendGame.timestamp,
        isPublic,
      };

      // Chinese chess moves are stored as JSON string directly
      // Each move has: from, to, piece, side, timestamp, capturedPiece?
      // Use type assertion since Chinese chess moves have different structure from Gomoku
      const moves = frontendGame.moveHistory as unknown as Move[];

      const tags: string[] = [];
      if (frontendGame.mode === 'pve') {
        tags.push('human-vs-ai');
      } else {
        tags.push('human-vs-human');
      }

      const game = await chineseChessService.createGame(
        {
          title: frontendGame.name,
          description: `Chinese Chess game created at ${new Date(frontendGame.timestamp).toISOString()}`,
          boardSize: 10,
          moves,
          playerBlack: 'Red',
          playerWhite: 'Black',
          isPublic,
          gameType: 'chinese_chess',
          tags,
          metadata,
        },
        authorId,
        userRole
      );

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
      logger.error('Create chinese chess game from frontend error:', error);
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
   * 获取前端格式的中国象棋棋谱列表
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

      const { games, total } = await chineseChessService.getGames(page, pageSize, filters);

      const frontendGames = games.map(game => ({
        id: game.id,
        name: game.title,
        timestamp: game.createdAt.getTime(),
        moveCount: Array.isArray(game.moves) ? game.moves.length : 0,
        author: game.authorId ? 'User' : 'Anonymous',
        mode: (game.metadata as Record<string, unknown>)?.mode || 'pvp',
        aiDifficulty: (game.metadata as Record<string, unknown>)?.aiDifficulty || 'intermediate',
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
      logger.error('Get chinese chess games for frontend error:', error);
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
   * 获取单个前端格式的中国象棋棋谱
   */
  async getGameForFrontend(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const game = await chineseChessService.getGameById(id);

      if (!game) {
        const response: ApiResponse = {
          success: false,
          error: 'Not Found',
          message: 'Game not found',
          timestamp: new Date().toISOString(),
        };
        return res.status(404).json(response);
      }

      if (!game.isPublic && game.authorId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to access this game',
          timestamp: new Date().toISOString(),
        };
        return res.status(403).json(response);
      }

      // Chinese chess moves have different structure from Gomoku moves
      // Cast to ChineseChessMove[] since game.moves is typed as Move[] but contains ChineseChessMove[]
      const moveHistory = (game.moves as unknown as ChineseChessMove[]) || [];

      const metadata = (game.metadata as Record<string, unknown>) || {};

      const frontendGame = {
        id: game.id,
        name: game.title,
        board: [],
        moveHistory,
        timestamp: metadata.originalTimestamp as number || game.createdAt.getTime(),
        mode: (metadata.mode as string) || 'pvp',
        aiDifficulty: (metadata.aiDifficulty as string) || 'intermediate',
        aiRole: (metadata.aiRole as string) || 'black',
        isPublic: game.isPublic,
        gameType: game.gameType,
      };

      const response: ApiResponse = {
        success: true,
        data: frontendGame,
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Get chinese chess game for frontend error:', error);
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
   * 删除中国象棋棋谱
   */
  async deleteGame(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      await chineseChessService.deleteGame(id, userId || '', userRole);

      const response: ApiResponse = {
        success: true,
        message: 'Game deleted successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Delete chinese chess game error:', error);
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
}

export const chineseChessController = new ChineseChessController();
