// API配置
import { API_BASE_URL } from '../config';

export type GameType = 'gomoku' | 'chinese_chess';

/**
 * 前端棋谱数据结构
 */
export interface FrontendGame {
  id: string;
  name: string;
  board: number[][];
  moveHistory: { r: number; c: number; player: number }[];
  timestamp: number;
  mode: 'pvp' | 'pve';
  aiDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'neural';
  aiRole: 'first' | 'second';
  ruleMode: 'standard' | 'renju';
  isPublic?: boolean;
  gameType?: GameType;
}

export interface GameListItem {
  id: string;
  name: string;
  timestamp: number;
  moveCount: number;
  author: string;
  mode: string;
  aiDifficulty: string;
  isPublic: boolean;
  gameType: GameType;
  authorId?: string;
}

/**
 * 更新棋谱请求体
 */
export interface UpdateGameRequest {
  title: string;
  metadata: {
    frontendFormat: boolean;
    mode: 'pvp' | 'pve';
    aiDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'neural';
    aiRole: 'first' | 'second';
    ruleMode: 'standard' | 'renju';
    originalTimestamp: number;
  };
  moves?: Array<{
    x: number;
    y: number;
    color: 'black' | 'white';
    step: number;
    timestamp: number;
  }>;
}

/**
 * API响应格式
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * API分页响应格式
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    games: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
  message?: string;
  error?: string;
}

/**
 * 游戏API服务
 */
export class GameApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取请求头（附带认证token）
   */
  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * 保存棋谱到后端
   */
  async saveGame(game: FrontendGame): Promise<{ id: string; name: string; timestamp: number }> {
    try {
      const gameType = game.gameType || 'gomoku';
      const response = await fetch(`${this.baseUrl}/games/${gameType === 'chinese_chess' ? 'chinese-chess' : 'gomoku'}/frontend`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(game),
        credentials: 'include',
      });

      const result: ApiResponse<{ id: string; name: string; timestamp: number }> = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to save game');
      }

      return result.data!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取棋谱列表
   */
  async getGames(gameType: GameType = 'gomoku', page: number = 1, pageSize: number = 20): Promise<{
    games: GameListItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const apiPath = gameType === 'chinese_chess' ? 'chinese-chess' : 'gomoku';
      const response = await fetch(
        `${this.baseUrl}/games/${apiPath}/frontend?page=${page}&pageSize=${pageSize}`,
        {
          headers: this.getHeaders(),
          credentials: 'include',
        }
      );

      const result: PaginatedResponse<GameListItem> = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to fetch games');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取单个棋谱
   */
  async getGame(id: string, gameType: GameType = 'gomoku'): Promise<FrontendGame> {
    try {
      const apiPath = gameType === 'chinese_chess' ? 'chinese-chess' : 'gomoku';
      const response = await fetch(`${this.baseUrl}/games/${apiPath}/frontend/${id}`, {
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const result: ApiResponse<FrontendGame> = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to fetch game');
      }

      return result.data!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新棋谱
   */
  async updateGame(id: string, game: FrontendGame): Promise<void> {
    try {
      const body: UpdateGameRequest = {
        title: game.name,
        metadata: {
          frontendFormat: true,
          mode: game.mode,
          aiDifficulty: game.aiDifficulty,
          aiRole: game.aiRole,
          ruleMode: game.ruleMode,
          originalTimestamp: game.timestamp,
        },
      };

      if (game.moveHistory && game.moveHistory.length > 0) {
        body.moves = game.moveHistory.map((move, index) => ({
          x: move.c,
          y: move.r,
          color: move.player === 1 ? 'black' : 'white',
          step: index + 1,
          timestamp: Date.now(),
        }));
      }

      const response = await fetch(`${this.baseUrl}/games/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to update game');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 删除棋谱
   */
  async deleteGame(id: string, gameType: GameType = 'gomoku'): Promise<void> {
    try {
      const url = gameType === 'chinese_chess'
        ? `${this.baseUrl}/games/chinese-chess/${id}`
        : `${this.baseUrl}/games/${id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to delete game');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 从localStorage迁移数据到后端
   */
  async migrateFromLocalStorage(): Promise<number> {
    try {
      const stored = localStorage.getItem('gomoku_saved_games');
      if (!stored) {
        return 0;
      }

      const savedGames: FrontendGame[] = JSON.parse(stored);
      let migratedCount = 0;

      for (const game of savedGames) {
        try {
          await this.saveGame(game);
          migratedCount++;
        } catch {
          // Skip failed migrations
        }
      }

      return migratedCount;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 检查后端连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 创建默认实例
export const gameApi = new GameApiService();