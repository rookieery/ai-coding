/**
 * 中国象棋棋盘状态管理
 */
import {
  BoardState,
  Piece,
  PieceType,
  PlayerSide,
  BoardCoord,
  GameState,
  GameStatus,
  GameConfig,
  GameMode,
  Difficulty,
} from './types';

// 棋盘尺寸
export const BOARD_COLS = 9;
export const BOARD_ROWS = 10;

// 初始棋子位置配置 (红方在底部，黑方在顶部)
// 坐标: { col: 0-8, row: 0-9 }，其中 row=0 是顶部（黑方），row=9 是底部（红方）
const INITIAL_PIECES: Omit<Piece, 'coord'>[] = [
  // 黑方棋子 (顶部)
  { type: PieceType.ROOK, side: PlayerSide.BLACK },
  { type: PieceType.KNIGHT, side: PlayerSide.BLACK },
  { type: PieceType.ELEPHANT, side: PlayerSide.BLACK },
  { type: PieceType.ADVISOR, side: PlayerSide.BLACK },
  { type: PieceType.KING, side: PlayerSide.BLACK },
  { type: PieceType.ADVISOR, side: PlayerSide.BLACK },
  { type: PieceType.ELEPHANT, side: PlayerSide.BLACK },
  { type: PieceType.KNIGHT, side: PlayerSide.BLACK },
  { type: PieceType.ROOK, side: PlayerSide.BLACK },
  { type: PieceType.CANNON, side: PlayerSide.BLACK },
  { type: PieceType.CANNON, side: PlayerSide.BLACK },
  { type: PieceType.PAWN, side: PlayerSide.BLACK },
  { type: PieceType.PAWN, side: PlayerSide.BLACK },
  { type: PieceType.PAWN, side: PlayerSide.BLACK },
  { type: PieceType.PAWN, side: PlayerSide.BLACK },
  { type: PieceType.PAWN, side: PlayerSide.BLACK },
  // 红方棋子 (底部)
  { type: PieceType.ROOK, side: PlayerSide.RED },
  { type: PieceType.KNIGHT, side: PlayerSide.RED },
  { type: PieceType.ELEPHANT, side: PlayerSide.RED },
  { type: PieceType.ADVISOR, side: PlayerSide.RED },
  { type: PieceType.KING, side: PlayerSide.RED },
  { type: PieceType.ADVISOR, side: PlayerSide.RED },
  { type: PieceType.ELEPHANT, side: PlayerSide.RED },
  { type: PieceType.KNIGHT, side: PlayerSide.RED },
  { type: PieceType.ROOK, side: PlayerSide.RED },
  { type: PieceType.CANNON, side: PlayerSide.RED },
  { type: PieceType.CANNON, side: PlayerSide.RED },
  { type: PieceType.PAWN, side: PlayerSide.RED },
  { type: PieceType.PAWN, side: PlayerSide.RED },
  { type: PieceType.PAWN, side: PlayerSide.RED },
  { type: PieceType.PAWN, side: PlayerSide.RED },
  { type: PieceType.PAWN, side: PlayerSide.RED },
];

// 初始棋子坐标 (按上述顺序)
const INITIAL_COORDS: BoardCoord[] = [
  // 黑方棋子坐标 (row 0-2)
  { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }, { col: 4, row: 0 },
  { col: 5, row: 0 }, { col: 6, row: 0 }, { col: 7, row: 0 }, { col: 8, row: 0 },
  { col: 1, row: 2 }, { col: 7, row: 2 },
  { col: 0, row: 3 }, { col: 2, row: 3 }, { col: 4, row: 3 }, { col: 6, row: 3 }, { col: 8, row: 3 },
  // 红方棋子坐标 (row 7-9)
  { col: 0, row: 9 }, { col: 1, row: 9 }, { col: 2, row: 9 }, { col: 3, row: 9 }, { col: 4, row: 9 },
  { col: 5, row: 9 }, { col: 6, row: 9 }, { col: 7, row: 9 }, { col: 8, row: 9 },
  { col: 1, row: 7 }, { col: 7, row: 7 },
  { col: 0, row: 6 }, { col: 2, row: 6 }, { col: 4, row: 6 }, { col: 6, row: 6 }, { col: 8, row: 6 },
];

/**
 * 创建初始棋盘状态
 */
export function createInitialBoard(): BoardState {
  const board: BoardState = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => null)
  );

  // 放置棋子
  for (let i = 0; i < INITIAL_PIECES.length; i++) {
    const pieceInfo = INITIAL_PIECES[i];
    const coord = INITIAL_COORDS[i];
    const piece: Piece = {
      type: pieceInfo.type,
      side: pieceInfo.side,
      coord: { ...coord },
    };
    board[coord.row][coord.col] = piece;
  }

  return board;
}

/**
 * 创建初始游戏状态
 */
export function createInitialGameState(config: GameConfig): GameState {
  const board = createInitialBoard();

  return {
    board,
    currentPlayer: PlayerSide.RED, // 红方先手
    status: GameStatus.NOT_STARTED,
    moveHistory: [],
    config,
  };
}

/**
 * 获取棋盘上指定位置的棋子
 */
export function getPieceAt(board: BoardState, coord: BoardCoord): Piece | null {
  if (coord.row < 0 || coord.row >= BOARD_ROWS || coord.col < 0 || coord.col >= BOARD_COLS) {
    return null;
  }
  return board[coord.row][coord.col];
}

/**
 * 移动棋子
 * 注意：此函数不验证移动是否合法，仅执行移动操作
 * @returns 新的棋盘状态（浅拷贝，包含更新后的棋子位置）
 */
export function movePiece(board: BoardState, from: BoardCoord, to: BoardCoord): BoardState {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[from.row][from.col];

  if (!piece) {
    throw new Error(`No piece at (${from.col}, ${from.row})`);
  }

  // 更新棋子坐标
  const movedPiece: Piece = {
    ...piece,
    coord: { ...to },
  };

  // 移动棋子
  newBoard[from.row][from.col] = null;
  newBoard[to.row][to.col] = movedPiece;

  return newBoard;
}

/**
 * 检查坐标是否在棋盘范围内
 */
export function isWithinBoard(coord: BoardCoord): boolean {
  return coord.col >= 0 && coord.col < BOARD_COLS && coord.row >= 0 && coord.row < BOARD_ROWS;
}

/**
 * 检查坐标是否在九宫格内（将/帅的活动范围）
 * @param side 玩家方，用于确定红方还是黑方的九宫格
 */
export function isInPalace(coord: BoardCoord, side: PlayerSide): boolean {
  const palaceCols = [3, 4, 5];
  const palaceRows = side === PlayerSide.RED ? [7, 8, 9] : [0, 1, 2];

  return palaceCols.includes(coord.col) && palaceRows.includes(coord.row);
}

/**
 * 检查坐标是否在河的同一边
 * @returns true 如果两个坐标都在河的同一侧（红方区域或黑方区域）
 */
export function isSameSideOfRiver(coord1: BoardCoord, coord2: BoardCoord): boolean {
  // 河位于 row 4 和 row 5 之间（0-9坐标系）
  const isCoord1RedSide = coord1.row >= 5; // 红方区域 (row 5-9)
  const isCoord2RedSide = coord2.row >= 5;
  return isCoord1RedSide === isCoord2RedSide;
}

/**
 * 检查兵是否过河
 * @param piece 兵/卒棋子
 * @param coord 棋子当前位置
 */
export function isPawnCrossedRiver(piece: Piece, coord: BoardCoord): boolean {
  if (piece.type !== PieceType.PAWN) {
    return false;
  }

  // 红方兵：过河条件是 row <= 4（到达黑方区域）
  // 黑方兵：过河条件是 row >= 5（到达红方区域）
  return piece.side === PlayerSide.RED ? coord.row <= 4 : coord.row >= 5;
}

/**
 * 更新游戏状态（例如：切换玩家、更新游戏状态）
 */
export function updateGameState(
  currentState: GameState,
  newBoard: BoardState,
  moveFrom?: BoardCoord,
  moveTo?: BoardCoord,
  capturedPiece?: PieceType
): GameState {
  let newStatus = currentState.status;

  // 如果游戏尚未开始，开始游戏
  if (newStatus === GameStatus.NOT_STARTED) {
    newStatus = GameStatus.IN_PROGRESS;
  }

  // 切换当前玩家
  const nextPlayer = currentState.currentPlayer === PlayerSide.RED
    ? PlayerSide.BLACK
    : PlayerSide.RED;

  // 如果有移动记录，则添加到历史记录
  let newMoveHistory = [...currentState.moveHistory];
  if (moveFrom && moveTo) {
    const movedPiece = currentState.board[moveFrom.row][moveFrom.col];
    if (movedPiece) {
      const moveRecord = {
        from: { ...moveFrom },
        to: { ...moveTo },
        piece: movedPiece.type,
        side: movedPiece.side,
        timestamp: Date.now(),
        capturedPiece,
      };
      newMoveHistory.push(moveRecord);
    }
  }

  return {
    ...currentState,
    board: newBoard,
    currentPlayer: nextPlayer,
    status: newStatus,
    moveHistory: newMoveHistory,
    lastMove: newMoveHistory.length > 0 ? newMoveHistory[newMoveHistory.length - 1] : undefined,
  };
}

/**
 * 检查游戏是否结束（将死、困毙、认输等）
 * 注意：此函数为简化版本，实际需要结合规则验证
 */
export function checkGameOver(state: GameState): GameState {
  // 这里需要实现完整的将死检测逻辑
  // 目前仅返回原状态
  return state;
}

/**
 * 重置游戏状态
 */
export function resetGameState(config: GameConfig): GameState {
  return createInitialGameState(config);
}

/**
 * 导出当前游戏状态为 JSON（用于保存/加载）
 */
export function exportGameState(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * 从 JSON 导入游戏状态
 */
export function importGameState(json: string): GameState {
  const parsed = JSON.parse(json);
  // 验证和转换逻辑可以在这里添加
  return parsed as GameState;
}