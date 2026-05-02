/**
 * Chinese Chess (Xiangqi) LLM AI Service Types
 * Defines interfaces for DeepSeek-powered AI move generation
 *
 * Piece encoding (10×9 board, values 0-14):
 *   0 = Empty
 *   1 = Red King (帅)    8  = Black King (将)
 *   2 = Red Advisor (仕) 9  = Black Advisor (士)
 *   3 = Red Elephant (相) 10 = Black Elephant (象)
 *   4 = Red Horse (马)    11 = Black Horse (马)
 *   5 = Red Chariot (车)  12 = Black Chariot (车)
 *   6 = Red Cannon (炮)   13 = Black Cannon (炮)
 *   7 = Red Pawn (兵)     14 = Black Pawn (卒)
 */

/** Coordinate position on the 10×9 board (row: 0-9, col: 0-8) */
export interface ChessPosition {
  row: number;
  col: number;
}

/** 行棋方 */
export type ChessPlayerColor = 'red' | 'black';

/** 历史走法记录 */
export interface ChessMoveRecord {
  from: ChessPosition;
  to: ChessPosition;
  piece: number;
  capturedPiece?: number;
  notation?: string;
}

/** LLM 走子请求 */
export interface ChessLLMMoveRequest {
  /** 10×9 数值矩阵，棋子编码 0-14 */
  board: number[][];
  /** 当前行棋方 */
  currentPlayer: ChessPlayerColor;
  /** 历史走法记录 */
  moveHistory: ChessMoveRecord[];
}

/** LLM 走子响应 */
export interface ChessLLMMoveResponse {
  /** 推荐走法坐标 */
  move: {
    from: ChessPosition;
    to: ChessPosition;
  };
  /** 分析文本 */
  reason: string;
  /** 局势评估 */
  situationAnalysis?: string;
  /** 是否为兜底走法（威胁拦截或非法回退） */
  isFallback: boolean;
}

/** 候选走法（供 LLM 选择或兜底使用） */
export interface ChessCandidateMove {
  from: ChessPosition;
  to: ChessPosition;
  /** 启发式评分 */
  score: number;
  /** 简短中文落子理由（如「进车将军」「跳马防守」） */
  reason: string;
}
