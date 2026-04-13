/**
 * 中国象棋引擎核心模块
 * 提供棋子移动生成、局面评估、搜索等底层功能
 */

import {
  BoardState,
  BoardCoord,
  PieceType,
  PlayerSide,
  Piece,
} from './types';

import {
  getPieceAt,
  movePiece,
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

import { isCheck } from './rules/check';

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
 * 获取指定棋子的所有合法落子坐标
 * @param board 棋盘状态
 * @param coord 棋子坐标
 * @returns 合法目标坐标数组
 */
export function getLegalMovesForPiece(
  board: BoardState,
  coord: BoardCoord
): BoardCoord[] {
  const piece = getPieceAt(board, coord);
  if (!piece) {
    return [];
  }

  const validator = getValidatorForPieceType(piece.type);
  const legalTargets: BoardCoord[] = [];

  // 遍历棋盘所有位置
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const target: BoardCoord = { col, row };
      const validation = validator(board, coord, target);
      if (validation.isValid) {
        // 模拟移动，检查移动后是否导致己方被将军
        const simulatedBoard = movePiece(board, coord, target);
        if (!isCheck(simulatedBoard, piece.side)) {
          legalTargets.push(target);
        }
      }
    }
  }

  return legalTargets;
}

/**
 * 获取指定方的所有合法移动
 * @param board 棋盘状态
 * @param side 玩家方
 * @returns 所有合法移动的数组，每个元素包含起始坐标和目标坐标
 */
export function generateAllLegalMoves(
  board: BoardState,
  side: PlayerSide
): Array<{ from: BoardCoord; to: BoardCoord }> {
  const pieces: Piece[] = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece && piece.side === side) {
        pieces.push(piece);
      }
    }
  }

  const legalMoves: Array<{ from: BoardCoord; to: BoardCoord }> = [];
  for (const piece of pieces) {
    const targets = getLegalMovesForPiece(board, piece.coord);
    for (const target of targets) {
      legalMoves.push({ from: piece.coord, to: target });
    }
  }
  return legalMoves;
}