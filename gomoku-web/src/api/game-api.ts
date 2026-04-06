// API配置
const API_BASE_URL = 'http://localhost:3003/api';

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
      const response = await fetch(`${this.baseUrl}/games/frontend`, {
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
      console.error('Error saving game:', error);
      throw error;
    }
  }

  /**
   * 获取棋谱列表
   */
  async getGames(page: number = 1, pageSize: number = 20): Promise<{
    games: Array<{
      id: string;
      name: string;
      timestamp: number;
      moveCount: number;
      author: string;
      mode: string;
      aiDifficulty: string;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/games/frontend?page=${page}&pageSize=${pageSize}`,
        {
          headers: this.getHeaders(),
          credentials: 'include',
        }
      );

      const result: PaginatedResponse<any> = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to fetch games');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching games:', error);
      throw error;
    }
  }

  /**
   * 获取单个棋谱
   */
  async getGame(id: string): Promise<FrontendGame> {
    try {
      const response = await fetch(`${this.baseUrl}/games/frontend/${id}`, {
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const result: ApiResponse<FrontendGame> = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to fetch game');
      }

      return result.data!;
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  }

  /**
   * 更新棋谱
   */
  async updateGame(id: string, game: FrontendGame): Promise<void> {
    try {
      // 注意：更新API可能需要认证，这里暂时使用前端格式的更新
      // 实际项目中可能需要转换为后端格式
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

      // 只有在有移动历史时才更新moves字段
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
      console.error('Error updating game:', error);
      throw error;
    }
  }

  /**
   * 删除棋谱
   */
  async deleteGame(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/games/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to delete game');
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      throw error;
    }
  }

  /**
   * 从localStorage迁移数据到后端
   * @returns 迁移的游戏数量
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
          console.log(`Migrated game: ${game.name}`);
        } catch (error) {
          console.error(`Failed to migrate game ${game.name}:`, error);
        }
      }

      return migratedCount;
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
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