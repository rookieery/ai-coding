import { gameService } from './game.service';
import { Game, GameCreateInput } from '../types';

export class GomokuService {
  /**
   * 创建五子棋棋谱
   */
  async createGame(data: GameCreateInput, authorId?: string, userRole?: string): Promise<Game> {
    const gomokuData = { ...data, gameType: 'gomoku' as const };
    return gameService.createGame(gomokuData, authorId, userRole);
  }

  /**
   * 获取五子棋棋谱列表
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
    return gameService.getGames(page, pageSize, { ...filters, gameType: 'gomoku' });
  }

  /**
   * 获取单个五子棋棋谱
   */
  async getGameById(id: string): Promise<Game | null> {
    return gameService.getGameById(id);
  }

  /**
   * 更新五子棋棋谱
   */
  async updateGame(id: string, data: any, userId: string, userRole?: string): Promise<Game> {
    return gameService.updateGame(id, data, userId, userRole);
  }

  /**
   * 删除五子棋棋谱
   */
  async deleteGame(id: string, userId: string, userRole?: string): Promise<void> {
    return gameService.deleteGame(id, userId, userRole);
  }

  /**
   * 获取用户的所有五子棋棋谱
   */
  async getUserGames(userId: string, page: number = 1, pageSize: number = 20): Promise<{ games: Game[]; total: number }> {
    return gameService.getUserGames(userId, page, pageSize, 'gomoku');
  }
}

export const gomokuService = new GomokuService();