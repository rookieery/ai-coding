import { gameService } from './game.service';
import { Game, GameCreateInput } from '../types';

export class ChineseChessService {
  /**
   * 创建中国象棋棋谱
   */
  async createGame(data: GameCreateInput, authorId?: string, userRole?: string): Promise<Game> {
    const chessData = { ...data, gameType: 'chinese_chess' as const };
    return gameService.createGame(chessData, authorId, userRole);
  }

  /**
   * 获取中国象棋棋谱列表
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
    return gameService.getGames(page, pageSize, { ...filters, gameType: 'chinese_chess' });
  }

  /**
   * 获取单个中国象棋棋谱
   */
  async getGameById(id: string): Promise<Game | null> {
    return gameService.getGameById(id);
  }

  /**
   * 更新中国象棋棋谱
   */
  async updateGame(id: string, data: GameCreateInput, userId: string, userRole?: string): Promise<Game> {
    return gameService.updateGame(id, data, userId, userRole);
  }

  /**
   * 删除中国象棋棋谱
   */
  async deleteGame(id: string, userId: string, userRole?: string): Promise<void> {
    return gameService.deleteGame(id, userId, userRole);
  }

  /**
   * 获取用户的所有中国象棋棋谱
   */
  async getUserGames(userId: string, page: number = 1, pageSize: number = 20): Promise<{ games: Game[]; total: number }> {
    return gameService.getUserGames(userId, page, pageSize, 'chinese_chess');
  }
}

export const chineseChessService = new ChineseChessService();
