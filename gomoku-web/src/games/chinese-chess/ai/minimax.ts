/**
 * 中国象棋 AI 基础框架 - Minimax 搜索算法
 */

import {
  BoardState,
  BoardCoord,
  PlayerSide,
  PieceType,
} from '../types';

import {
  generateAllLegalMoves,
} from '../rules/checkmate';

import {
  isCheck,
} from '../rules/check';

import {
  movePiece,
  getPieceAt,
} from '../boardState';

/**
 * 棋子基础价值 (红方视角)
 */
const PIECE_VALUES: Record<PieceType, number> = {
  [PieceType.KING]: 10000,   // 将/帅 (实际上不可被吃，但赋予极高价值)
  [PieceType.ROOK]: 900,     // 车
  [PieceType.CANNON]: 450,   // 炮
  [PieceType.KNIGHT]: 400,   // 马
  [PieceType.ELEPHANT]: 200, // 象/相
  [PieceType.ADVISOR]: 200,  // 士/仕
  [PieceType.PAWN]: 100,     // 兵/卒 (未过河)
};

/**
 * 兵过河后的价值加成
 */
const PAWN_CROSSED_RIVER_BONUS = 50;

/**
 * 棋子位置价值表 (红方视角)
 * 棋盘坐标: row 0-9 (从上到下), col 0-8 (从左到右)
 * 位置价值鼓励棋子向前推进、控制中心
 */
const POSITION_VALUES: Record<PieceType, number[][]> = {
  [PieceType.KING]: Array(10).fill(0).map(() => Array(9).fill(0)), // 将帅位置固定，不设位置价值
  [PieceType.ROOK]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 10, 5],
    [5, 10, 15, 20, 20, 20, 15, 10, 5],
    [5, 10, 15, 20, 20, 20, 15, 10, 5],
    [5, 10, 15, 20, 20, 20, 15, 10, 5],
    [5, 10, 15, 20, 20, 20, 15, 10, 5],
    [5, 10, 10, 10, 10, 10, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  [PieceType.CANNON]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 10, 0, 0, 0, 10, 0, 0],
    [0, 0, 10, 0, 0, 0, 10, 0, 0],
    [5, 10, 15, 20, 20, 20, 15, 10, 5],
    [5, 10, 15, 20, 20, 20, 15, 10, 5],
    [5, 10, 15, 20, 20, 20, 15, 10, 5],
    [0, 0, 10, 0, 0, 0, 10, 0, 0],
    [0, 0, 10, 0, 0, 0, 10, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  [PieceType.KNIGHT]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 5, 5, 5, 0, 0, 0],
    [0, 0, 10, 10, 15, 10, 10, 0, 0],
    [0, 5, 15, 20, 20, 20, 15, 5, 0],
    [0, 5, 15, 20, 20, 20, 15, 5, 0],
    [0, 5, 15, 20, 20, 20, 15, 5, 0],
    [0, 0, 10, 10, 15, 10, 10, 0, 0],
    [0, 0, 0, 5, 5, 5, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  [PieceType.ELEPHANT]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 10, 0, 10, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 10, 0, 10, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  [PieceType.ADVISOR]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 10, 0, 10, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 10, 0, 10, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  [PieceType.PAWN]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [10, 20, 30, 40, 50, 40, 30, 20, 10],
    [20, 30, 40, 50, 60, 50, 40, 30, 20],
    [30, 40, 50, 60, 70, 60, 50, 40, 30],
    [40, 50, 60, 70, 80, 70, 60, 50, 40],
    [50, 60, 70, 80, 90, 80, 70, 60, 50],
    [60, 70, 80, 90, 100, 90, 80, 70, 60],
    [70, 80, 90, 100, 110, 100, 90, 80, 70],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
};

/**
 * 评估棋盘状态（从红方视角）
 * 正数表示红方优势，负数表示黑方优势
 */
export function evaluateBoard(board: BoardState): number {
  let score = 0;

  // 遍历所有棋子
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const pieceValue = PIECE_VALUES[piece.type];
      let positionValue = 0;

      // 获取位置价值（根据棋子类型和位置）
      const positionTable = POSITION_VALUES[piece.type];
      if (positionTable) {
        // 对于红方，位置表直接使用；对于黑方，需要镜像（因为棋盘是对称的）
        const effectiveRow = piece.side === PlayerSide.RED ? row : 9 - row;
        positionValue = positionTable[effectiveRow][col];
      }

      // 兵过河加成
      let pawnBonus = 0;
      if (piece.type === PieceType.PAWN) {
        const isCrossedRiver = piece.side === PlayerSide.RED ? row >= 5 : row <= 4;
        if (isCrossedRiver) {
          pawnBonus = PAWN_CROSSED_RIVER_BONUS;
        }
      }

      // 计算单个棋子的贡献
      const contribution = pieceValue + positionValue + pawnBonus;

      // 红方棋子加正分，黑方棋子加减分
      if (piece.side === PlayerSide.RED) {
        score += contribution;
      } else {
        score -= contribution;
      }
    }
  }

  return score;
}

/**
 * 生成当前玩家的所有合法移动（已过滤掉会导致己方被将军的移动）
 */
function getLegalMoves(board: BoardState, player: PlayerSide): Array<{ from: BoardCoord; to: BoardCoord }> {
  const allMoves = generateAllLegalMoves(board, player);

  // 过滤掉会导致己方被将军的移动
  const safeMoves = allMoves.filter(move => {
    const simulatedBoard = movePiece(board, move.from, move.to);
    return !isCheck(simulatedBoard, player);
  });

  return safeMoves;
}

/**
 * Minimax 搜索核心函数
 * @param board 当前棋盘状态
 * @param depth 搜索深度
 * @param alpha Alpha 值（用于 Alpha-Beta 剪枝）
 * @param beta Beta 值（用于 Alpha-Beta 剪枝）
 * @param maximizingPlayer 当前是否为最大化玩家（红方）
 * @param currentPlayer 当前轮到哪一方走棋
 * @returns 当前节点的评估分数
 */
function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  currentPlayer: PlayerSide
): number {
  // 达到搜索深度或游戏结束，返回评估值
  if (depth === 0) {
    return evaluateBoard(board);
  }

  const legalMoves = getLegalMoves(board, currentPlayer);

  // 如果没有合法移动，检查是否将死或困毙
  if (legalMoves.length === 0) {
    if (isCheck(board, currentPlayer)) {
      // 将死：当前玩家被将死，对手获胜
      return maximizingPlayer ? -100000 : 100000;
    } else {
      // 困毙：平局
      return 0;
    }
  }

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      // 执行移动
      const newBoard = movePiece(board, move.from, move.to);
      // 切换玩家
      const nextPlayer = currentPlayer === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED;
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, nextPlayer === PlayerSide.RED, nextPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) {
        break; // Beta 剪枝
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      const newBoard = movePiece(board, move.from, move.to);
      const nextPlayer = currentPlayer === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED;
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, nextPlayer === PlayerSide.RED, nextPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) {
        break; // Alpha 剪枝
      }
    }
    return minEval;
  }
}

/**
 * 寻找最佳移动
 * @param board 当前棋盘状态
 * @param player 当前玩家（寻找该玩家的最佳移动）
 * @param depth 搜索深度
 * @returns 最佳移动和评估分数
 */
export function findBestMove(
  board: BoardState,
  player: PlayerSide,
  depth: number = 3
): { bestMove: { from: BoardCoord; to: BoardCoord } | null; score: number } {
  const legalMoves = getLegalMoves(board, player);

  if (legalMoves.length === 0) {
    return { bestMove: null, score: player === PlayerSide.RED ? -Infinity : Infinity };
  }

  let bestMove = legalMoves[0];
  let bestScore = player === PlayerSide.RED ? -Infinity : Infinity;

  for (const move of legalMoves) {
    const newBoard = movePiece(board, move.from, move.to);
    const nextPlayer = player === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED;
    const isNextPlayerRed = nextPlayer === PlayerSide.RED;
    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, isNextPlayerRed, nextPlayer);

    if (player === PlayerSide.RED) {
      // 红方想要最大化分数
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      // 黑方想要最小化分数（从红方视角，即负数越大越好）
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return { bestMove, score: bestScore };
}

/**
 * 简易 AI 接口（用于游戏集成）
 * @param board 棋盘状态
 * @param player AI 玩家方
 * @param difficulty 难度级别（影响搜索深度）
 * @returns 最佳移动的起始和目标坐标
 */
export function getAIMove(
  board: BoardState,
  player: PlayerSide,
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate'
): { from: BoardCoord; to: BoardCoord } {
  const depthMap = {
    beginner: 2,
    intermediate: 3,
    advanced: 4,
    expert: 5,
  };

  const depth = depthMap[difficulty];
  const { bestMove } = findBestMove(board, player, depth);

  if (!bestMove) {
    throw new Error('No legal moves available');
  }

  return bestMove;
}