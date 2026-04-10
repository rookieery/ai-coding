/**
 * 中国象棋游戏逻辑主文件
 * 集成所有规则验证、将军检测、将死检测等功能
 */

import {
  BoardState,
  BoardCoord,
  PieceType,
  PlayerSide,
  GameState,
  GameStatus,
  MoveValidationResult,
  Difficulty,
  GameMode,
  GameConfig,
  MoveHistory,
} from './types';

import {
  getPieceAt,
  movePiece,
  updateGameState as updateBoardGameState,
  createInitialBoard,
} from './boardState';

import {
  validateRookMove,
  validateKnightMove,
  validateCannonMove,
  validatePawnMove,
  validateAdvisorMove,
  validateElephantMove,
  validateKingMove,
} from './rules/index';

import {
  isCheck,
  getCheckingPieces,
} from './rules/check';

import {
  generateAllLegalMoves,
  isCheckmate,
  isStalemate,
  isLosing,
} from './rules/checkmate';

/**
 * 根据棋子类型选择对应的移动验证函数
 */
function getValidatorForPieceType(pieceType: PieceType) {
  switch (pieceType) {
    case PieceType.ROOK:
      return validateRookMove;
    case PieceType.KNIGHT:
      return validateKnightMove;
    case PieceType.CANNON:
      return validateCannonMove;
    case PieceType.PAWN:
      return validatePawnMove;
    case PieceType.ADVISOR:
      return validateAdvisorMove;
    case PieceType.ELEPHANT:
      return validateElephantMove;
    case PieceType.KING:
      return validateKingMove;
    default:
      throw new Error(`Unknown piece type: ${pieceType}`);
  }
}

/**
 * 验证移动是否合法（包含基础规则和将军限制）
 * @param board 棋盘状态
 * @param from 起始坐标
 * @param to 目标坐标
 * @param currentPlayer 当前玩家方
 * @returns 移动验证结果
 */
export function validateMove(
  board: BoardState,
  from: BoardCoord,
  to: BoardCoord,
  currentPlayer: PlayerSide
): MoveValidationResult {
  // 1. 基础检查：坐标是否在棋盘内
  if (
    from.row < 0 || from.row >= 10 || from.col < 0 || from.col >= 9 ||
    to.row < 0 || to.row >= 10 || to.col < 0 || to.col >= 9
  ) {
    return {
      isValid: false,
      reason: '坐标超出棋盘范围',
    };
  }

  // 2. 检查起点是否有棋子
  const piece = getPieceAt(board, from);
  if (!piece) {
    return {
      isValid: false,
      reason: '起点没有棋子',
    };
  }

  // 3. 检查棋子是否属于当前玩家
  if (piece.side !== currentPlayer) {
    return {
      isValid: false,
      reason: '不能移动对方棋子',
    };
  }

  // 4. 使用对应棋子的规则验证函数
  const validator = getValidatorForPieceType(piece.type);
  const basicValidation = validator(board, from, to);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // 5. 模拟移动，检查移动后是否导致己方被将军（不能送将）
  const simulatedBoard = movePiece(board, from, to);
  if (isCheck(simulatedBoard, currentPlayer)) {
    return {
      isValid: false,
      reason: '移动后己方被将军',
    };
  }

  // 6. 检查移动后是否导致对方被将军
  const opponent = currentPlayer === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED;
  const isOpponentInCheck = isCheck(simulatedBoard, opponent);

  // 7. 返回完整的验证结果
  return {
    isValid: true,
    isCheck: isOpponentInCheck,
    isCapture: basicValidation.isCapture || false,
    reason: '移动合法',
  };
}

/**
 * 执行移动并更新游戏状态
 * @param gameState 当前游戏状态
 * @param from 起始坐标
 * @param to 目标坐标
 * @returns 新的游戏状态
 */
export function makeMove(
  gameState: GameState,
  from: BoardCoord,
  to: BoardCoord
): GameState {
  // 验证移动合法性
  const validation = validateMove(gameState.board, from, to, gameState.currentPlayer);
  if (!validation.isValid) {
    throw new Error(`非法移动: ${validation.reason}`);
  }

  // 获取被吃掉的棋子类型（如果有）
  const targetPiece = getPieceAt(gameState.board, to);
  const capturedPiece = targetPiece ? targetPiece.type : undefined;

  // 执行移动
  const newBoard = movePiece(gameState.board, from, to);

  // 更新游戏状态
  const newGameState = updateBoardGameState(gameState, newBoard, from, to, capturedPiece);

  // 检查游戏是否结束
  return evaluateGameResult(newGameState);
}

/**
 * 评估游戏结果（将死、困毙、和棋等）
 * @param gameState 游戏状态
 * @returns 更新后的游戏状态（包含可能的状态变更）
 */
export function evaluateGameResult(gameState: GameState): GameState {
  const { board, currentPlayer, status } = gameState;

  // 如果游戏已经结束，直接返回
  if (status === GameStatus.CHECKMATE || status === GameStatus.STALEMATE ||
      status === GameStatus.DRAW || status === GameStatus.RESIGNED ||
      status === GameStatus.TIMEOUT) {
    return gameState;
  }

  // 检查当前玩家是否被将死或困毙
  const isCurrentPlayerLosing = isLosing(board, currentPlayer);
  if (isCurrentPlayerLosing) {
    // 确定输棋类型
    if (isCheckmate(board, currentPlayer)) {
      return {
        ...gameState,
        status: GameStatus.CHECKMATE,
        winner: currentPlayer === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED,
      };
    } else if (isStalemate(board, currentPlayer)) {
      return {
        ...gameState,
        status: GameStatus.STALEMATE,
        winner: currentPlayer === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED,
      };
    }
  }

  // 检查是否将军
  const isOpponentInCheck = isCheck(
    board,
    currentPlayer === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED
  );
  if (isOpponentInCheck) {
    return {
      ...gameState,
      status: GameStatus.CHECK,
      check: currentPlayer === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED,
    };
  }

  // 检查是否和棋（例如长将、长捉、双方无攻击子力等，简化版：暂无实现）
  // 目前仅返回原状态
  return gameState;
}

/**
 * 获取当前玩家的所有合法移动
 * @param gameState 游戏状态
 * @returns 合法移动数组，每个元素包含起始坐标和目标坐标
 */
export function getLegalMoves(gameState: GameState): Array<{ from: BoardCoord; to: BoardCoord }> {
  const { board, currentPlayer } = gameState;
  const allMoves = generateAllLegalMoves(board, currentPlayer);

  // 过滤掉会导致己方被将军的移动
  const safeMoves = allMoves.filter(move => {
    const simulatedBoard = movePiece(board, move.from, move.to);
    return !isCheck(simulatedBoard, currentPlayer);
  });

  return safeMoves;
}

/**
 * 获取指定坐标上棋子的合法目标位置
 * @param gameState 游戏状态
 * @param coord 棋子坐标
 * @returns 合法目标坐标数组
 */
export function getPieceLegalMoves(gameState: GameState, coord: BoardCoord): BoardCoord[] {
  const piece = getPieceAt(gameState.board, coord);
  if (!piece || piece.side !== gameState.currentPlayer) {
    return [];
  }

  const validator = getValidatorForPieceType(piece.type);
  const legalTargets: BoardCoord[] = [];

  // 遍历棋盘所有位置
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const target: BoardCoord = { col, row };
      const validation = validator(gameState.board, coord, target);
      if (validation.isValid) {
        // 检查移动后是否导致己方被将军
        const simulatedBoard = movePiece(gameState.board, coord, target);
        if (!isCheck(simulatedBoard, gameState.currentPlayer)) {
          legalTargets.push(target);
        }
      }
    }
  }

  return legalTargets;
}

/**
 * 创建新的游戏
 * @param config 游戏配置
 * @returns 初始游戏状态
 */
export function createNewGame(config: GameConfig): GameState {
  const board = createInitialBoard();
  return {
    board,
    currentPlayer: PlayerSide.RED,
    status: GameStatus.NOT_STARTED,
    moveHistory: [],
    config,
  };
}

/**
 * 认输
 * @param gameState 当前游戏状态
 * @param resigningPlayer 认输的玩家方
 * @returns 更新后的游戏状态
 */
export function resign(gameState: GameState, resigningPlayer: PlayerSide): GameState {
  return {
    ...gameState,
    status: GameStatus.RESIGNED,
    winner: resigningPlayer === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED,
  };
}

/**
 * 判断游戏是否结束
 * @param gameState 游戏状态
 * @returns true 如果游戏已结束
 */
export function isGameOver(gameState: GameState): boolean {
  return gameState.status === GameStatus.CHECKMATE ||
         gameState.status === GameStatus.STALEMATE ||
         gameState.status === GameStatus.DRAW ||
         gameState.status === GameStatus.RESIGNED ||
         gameState.status === GameStatus.TIMEOUT;
}

/**
 * 获取获胜方（如果游戏已结束）
 * @param gameState 游戏状态
 * @returns 获胜方，如果未结束则返回 undefined
 */
export function getWinner(gameState: GameState): PlayerSide | undefined {
  return gameState.winner;
}

/**
 * 导出游戏状态为字符串（用于保存）
 * @param gameState 游戏状态
 * @returns JSON 字符串
 */
export function exportGame(gameState: GameState): string {
  return JSON.stringify(gameState, null, 2);
}

/**
 * 导入游戏状态
 * @param json JSON 字符串
 * @returns 游戏状态
 */
export function importGame(json: string): GameState {
  const parsed = JSON.parse(json);
  // 可以添加验证逻辑
  return parsed as GameState;
}

/**
 * 切换当前玩家（用于测试或特定场景）
 * @param gameState 游戏状态
 * @returns 切换玩家后的游戏状态
 */
export function switchPlayer(gameState: GameState): GameState {
  const nextPlayer = gameState.currentPlayer === PlayerSide.RED
    ? PlayerSide.BLACK
    : PlayerSide.RED;
  return {
    ...gameState,
    currentPlayer: nextPlayer,
  };
}