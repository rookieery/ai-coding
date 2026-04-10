/**
 * 中国象棋核心类型定义
 */

// 棋子类型枚举
export enum PieceType {
  KING = 'king',       // 将/帅
  ADVISOR = 'advisor', // 士/仕
  ELEPHANT = 'elephant', // 象/相
  KNIGHT = 'knight',   // 马/馬
  ROOK = 'rook',       // 车/車
  CANNON = 'cannon',   // 炮/砲
  PAWN = 'pawn',       // 兵/卒
}

// 玩家方枚举
export enum PlayerSide {
  RED = 'red',   // 红方 (先手)
  BLACK = 'black', // 黑方 (后手)
}

// 棋盘坐标 (列, 行)
export interface BoardCoord {
  col: number; // 0-8 (从左到右)
  row: number; // 0-9 (从上到下)
}

// 棋子对象
export interface Piece {
  type: PieceType;
  side: PlayerSide;
  coord: BoardCoord;
}

// 移动历史记录
export interface MoveHistory {
  from: BoardCoord;
  to: BoardCoord;
  piece: PieceType;
  side: PlayerSide;
  timestamp: number;
  capturedPiece?: PieceType; // 被吃掉的棋子类型（如果有）
}

// 游戏状态枚举
export enum GameStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  CHECK = 'check',          // 将军
  CHECKMATE = 'checkmate',  // 将死
  STALEMATE = 'stalemate',  // 困毙
  DRAW = 'draw',            // 和棋
  RESIGNED = 'resigned',    // 认输
  TIMEOUT = 'timeout',      // 超时
}

// 游戏难度
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// 游戏模式
export type GameMode = 'pvp' | 'pve' | 'analysis';

// 棋盘状态 (9x10 二维数组)
export type BoardState = (Piece | null)[][];

// 游戏配置
export interface GameConfig {
  mode: GameMode;
  difficulty?: Difficulty;
  redPlayer?: PlayerSide; // 红方玩家类型 (人类/AI)
  blackPlayer?: PlayerSide; // 黑方玩家类型
  timeControl?: {
    redTime: number; // 红方剩余时间 (毫秒)
    blackTime: number; // 黑方剩余时间 (毫秒)
    increment?: number; // 每步加时
  };
}

// 完整游戏状态
export interface GameState {
  board: BoardState;
  currentPlayer: PlayerSide;
  status: GameStatus;
  moveHistory: MoveHistory[];
  check?: PlayerSide; // 当前被将军的一方（如果有）
  winner?: PlayerSide; // 获胜方（如果已结束）
  config: GameConfig;
  lastMove?: MoveHistory; // 最后一步棋
}

// 移动验证结果
export interface MoveValidationResult {
  isValid: boolean;
  reason?: string; // 如果无效，说明原因
  isCheck?: boolean; // 是否将军
  isCheckmate?: boolean; // 是否将死
  isCapture?: boolean; // 是否吃子
  isPromotion?: boolean; // 是否升变 (中国象棋中无升变，保留字段)
}

// AI 评估结果
export interface AIEvaluation {
  bestMove: {
    from: BoardCoord;
    to: BoardCoord;
  };
  score: number; // 正数表示红方优势，负数表示黑方优势
  depth: number; // 搜索深度
  nodes: number; // 搜索节点数
  time: number; // 搜索耗时 (毫秒)
  principalVariation?: BoardCoord[]; // 主要变例
}

// 棋子显示配置
export interface PieceDisplayConfig {
  useUnicode: boolean; // 是否使用 Unicode 字符
  useImages: boolean;  // 是否使用图片
  redColor: string;    // 红方颜色
  blackColor: string;  // 黑方颜色
}

// 棋盘显示配置
export interface BoardDisplayConfig {
  showCoordinates: boolean; // 是否显示坐标
  showLastMove: boolean;    // 是否高亮显示上一步
  showValidMoves: boolean;  // 是否显示合法移动提示
  theme: 'wood' | 'marble' | 'simple'; // 棋盘主题
}