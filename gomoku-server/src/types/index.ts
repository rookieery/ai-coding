// 基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 用户相关类型
export interface User {
  id: string;
  phone: string;
  email?: string;
  username: string;
  avatar?: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  phone: string;
  email?: string;
  username: string;
  password: string;
  avatar?: string;
}

export interface UserUpdateInput {
  email?: string;
  username?: string;
  password?: string;
  avatar?: string;
  rating?: number;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

// 棋谱相关类型
export interface Move {
  x: number;
  y: number;
  color: 'black' | 'white';
  step: number;
  timestamp?: number;
}

export interface Game {
  id: string;
  title: string;
  description?: string;
  boardSize: number;
  moves: Move[];
  result?: 'black_win' | 'white_win' | 'draw';
  playerBlack?: string;
  playerWhite?: string;
  isPublic: boolean;
  tags: string[];
  metadata?: any;
  authorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameCreateInput {
  title: string;
  description?: string;
  boardSize?: number;
  moves: Move[];
  result?: 'black_win' | 'white_win' | 'draw';
  playerBlack?: string;
  playerWhite?: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: any;
}

export interface GameUpdateInput {
  title?: string;
  description?: string;
  boardSize?: number;
  moves?: Move[];
  result?: 'black_win' | 'white_win' | 'draw';
  playerBlack?: string;
  playerWhite?: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: any;
}

// 对局相关类型
export type MatchType = 'human-vs-human' | 'human-vs-ai' | 'ai-vs-ai';
export type GameMode = 'standard' | 'renju' | 'free-style';
export type PlayerType = 'human' | 'ai';

export interface Match {
  id: string;
  type: MatchType;
  mode: GameMode;
  boardSize: number;

  // 玩家信息
  playerBlackId?: string;
  playerBlackName: string;
  playerBlackType: PlayerType;
  playerWhiteId?: string;
  playerWhiteName: string;
  playerWhiteType: PlayerType;

  // AI配置
  aiLevelBlack?: number;
  aiLevelWhite?: number;

  // 对局数据
  moves: Move[];
  result?: 'black_win' | 'white_win' | 'draw';
  duration?: number;

  // 统计
  blackCaptures: number;
  whiteCaptures: number;

  createdAt: Date;
  endedAt?: Date;
}

export interface MatchCreateInput {
  type: MatchType;
  mode: GameMode;
  boardSize?: number;

  playerBlackId?: string;
  playerBlackName: string;
  playerBlackType: PlayerType;
  playerWhiteId?: string;
  playerWhiteName: string;
  playerWhiteType: PlayerType;

  aiLevelBlack?: number;
  aiLevelWhite?: number;

  moves: Move[];
  result?: 'black_win' | 'white_win' | 'draw';
  duration?: number;

  blackCaptures?: number;
  whiteCaptures?: number;
}

// 查询参数类型
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GameQueryParams extends PaginationParams {
  authorId?: string;
  isPublic?: boolean;
  tags?: string[];
  search?: string;
}

export interface MatchQueryParams extends PaginationParams {
  playerId?: string;
  type?: MatchType;
  mode?: GameMode;
  result?: string;
}