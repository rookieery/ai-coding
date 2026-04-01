import { prisma } from '../app';
import { Game, GameCreateInput, GameUpdateInput } from '../types';
import { logger } from '../utils/logger';

export class GameService {
  /**
   * 创建新棋谱
   */
  async createGame(data: GameCreateInput, authorId?: string): Promise<Game> {
    try {
      const game = await prisma.game.create({
        data: {
          title: data.title,
          description: data.description,
          boardSize: data.boardSize || 15,
          moves: JSON.stringify(data.moves),
          result: data.result,
          playerBlack: data.playerBlack,
          playerWhite: data.playerWhite,
          isPublic: data.isPublic ?? true,
          tags: JSON.stringify(data.tags || []),
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          authorId: authorId || null,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      logger.info(`Game created: ${game.id} by user ${authorId || 'anonymous'}`);
      return this.mapToGame(game);
    } catch (error) {
      logger.error('Error creating game:', error);
      throw new Error('Failed to create game');
    }
  }

  /**
   * 获取棋谱列表
   */
  async getGames(
    page: number = 1,
    pageSize: number = 20,
    filters: {
      authorId?: string;
      isPublic?: boolean;
      tags?: string[];
      search?: string;
    } = {}
  ): Promise<{ games: Game[]; total: number }> {
    try {
      const skip = (page - 1) * pageSize;
      const where: any = {};

      if (filters.authorId) {
        where.authorId = filters.authorId;
      }

      if (filters.isPublic !== undefined) {
        where.isPublic = filters.isPublic;
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = {
          hasSome: filters.tags,
        };
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [games, total] = await Promise.all([
        prisma.game.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
        }),
        prisma.game.count({ where }),
      ]);

      return {
        games: games.map(game => this.mapToGame(game)),
        total,
      };
    } catch (error) {
      logger.error('Error fetching games:', error);
      throw new Error('Failed to fetch games');
    }
  }

  /**
   * 获取单个棋谱
   */
  async getGameById(id: string): Promise<Game | null> {
    try {
      const game = await prisma.game.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      if (!game) {
        return null;
      }

      return this.mapToGame(game);
    } catch (error) {
      logger.error(`Error fetching game ${id}:`, error);
      throw new Error('Failed to fetch game');
    }
  }

  /**
   * 更新棋谱
   */
  async updateGame(id: string, data: GameUpdateInput, userId: string): Promise<Game> {
    try {
      // 验证用户是否有权限更新（作者或管理员）
      const existingGame = await prisma.game.findUnique({
        where: { id },
        select: { authorId: true },
      });

      if (!existingGame) {
        throw new Error('Game not found');
      }

      // 检查权限：如果游戏有作者，只有作者可以更新；如果游戏没有作者（匿名），允许更新
      if (existingGame.authorId) {
        if (!userId || existingGame.authorId !== userId) {
          // TODO: 检查管理员权限
          throw new Error('Unauthorized to update this game');
        }
      }

      const game = await prisma.game.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.boardSize !== undefined && { boardSize: data.boardSize }),
          ...(data.moves !== undefined && { moves: JSON.stringify(data.moves) }),
          ...(data.result !== undefined && { result: data.result }),
          ...(data.playerBlack !== undefined && { playerBlack: data.playerBlack }),
          ...(data.playerWhite !== undefined && { playerWhite: data.playerWhite }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
          ...(data.tags !== undefined && { tags: JSON.stringify(data.tags) }),
          ...(data.metadata !== undefined && { metadata: data.metadata ? JSON.stringify(data.metadata) : null }),
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      logger.info(`Game updated: ${id} by user ${userId}`);
      return this.mapToGame(game);
    } catch (error) {
      logger.error(`Error updating game ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to update game');
    }
  }

  /**
   * 删除棋谱
   */
  async deleteGame(id: string, userId: string): Promise<void> {
    try {
      // 验证用户是否有权限删除
      const existingGame = await prisma.game.findUnique({
        where: { id },
        select: { authorId: true },
      });

      if (!existingGame) {
        throw new Error('Game not found');
      }

      // 检查权限：如果游戏有作者，只有作者可以删除；如果游戏没有作者（匿名），允许删除
      if (existingGame.authorId) {
        if (!userId || existingGame.authorId !== userId) {
          // TODO: 检查管理员权限
          throw new Error('Unauthorized to delete this game');
        }
      }

      await prisma.game.delete({
        where: { id },
      });

      logger.info(`Game deleted: ${id} by user ${userId}`);
    } catch (error) {
      logger.error(`Error deleting game ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to delete game');
    }
  }

  /**
   * 获取用户的所有棋谱
   */
  async getUserGames(userId: string, page: number = 1, pageSize: number = 20): Promise<{ games: Game[]; total: number }> {
    try {
      const skip = (page - 1) * pageSize;

      const [games, total] = await Promise.all([
        prisma.game.findMany({
          where: { authorId: userId },
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
        }),
        prisma.game.count({ where: { authorId: userId } }),
      ]);

      return {
        games: games.map(game => this.mapToGame(game)),
        total,
      };
    } catch (error) {
      logger.error(`Error fetching games for user ${userId}:`, error);
      throw new Error('Failed to fetch user games');
    }
  }

  /**
   * 将Prisma模型转换为Game类型
   */
  private mapToGame(game: any): Game {
    // 安全解析JSON字段
    const parseJson = (str: string | null | undefined, defaultValue: any = null) => {
      if (!str) return defaultValue;
      try {
        return JSON.parse(str);
      } catch {
        return defaultValue;
      }
    };

    return {
      id: game.id,
      title: game.title,
      description: game.description ?? undefined,
      boardSize: game.boardSize,
      moves: parseJson(game.moves, []),
      result: game.result as any,
      playerBlack: game.playerBlack ?? undefined,
      playerWhite: game.playerWhite ?? undefined,
      isPublic: game.isPublic,
      tags: parseJson(game.tags, []),
      metadata: parseJson(game.metadata, undefined),
      authorId: game.authorId,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }
}

export const gameService = new GameService();