/**
 * 将军检测逻辑
 */

import {
  BoardState,
  BoardCoord,
  PieceType,
  PlayerSide,
  Piece,
} from '../types';
import {
  validateRookMove,
  validateKnightMove,
  validateCannonMove,
  validatePawnMove,
  validateAdvisorMove,
  validateElephantMove,
  validateKingMove,
} from './index';
import { getPieceAt } from '../boardState';

/**
 * 查找指定方的将/帅坐标
 */
function findKingCoord(board: BoardState, side: PlayerSide): BoardCoord | null {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece?.type === PieceType.KING && piece.side === side) {
        return { col, row };
      }
    }
  }
  return null;
}

/**
 * 获取棋盘上指定方的所有棋子
 */
function getPiecesBySide(board: BoardState, side: PlayerSide): Piece[] {
  const pieces: Piece[] = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece && piece.side === side) {
        pieces.push(piece);
      }
    }
  }
  return pieces;
}

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
 * 检测指定方是否被将军
 * @param board 棋盘状态
 * @param side 待检测的一方（红方或黑方）
 * @returns true 如果该方被将军
 */
export function isCheck(board: BoardState, side: PlayerSide): boolean {
  // 1. 查找该方的将/帅坐标
  const kingCoord = findKingCoord(board, side);
  if (!kingCoord) {
    // 将/帅不存在（理论上不应该发生），视为未被将军
    return false;
  }

  // 2. 确定对方棋子
  const opponentSide = side === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED;
  const opponentPieces = getPiecesBySide(board, opponentSide);

  // 3. 遍历对方每个棋子，检查是否能移动到将/帅位置
  for (const piece of opponentPieces) {
    const validator = getValidatorForPieceType(piece.type);
    const result = validator(board, piece.coord, kingCoord);
    if (result.isValid) {
      return true;
    }
  }

  return false;
}

/**
 * 获取所有正在将军的对方棋子
 * @param board 棋盘状态
 * @param side 被将军的一方
 * @returns 正在将军的棋子数组（可能为空）
 */
export function getCheckingPieces(board: BoardState, side: PlayerSide): Piece[] {
  const kingCoord = findKingCoord(board, side);
  if (!kingCoord) {
    return [];
  }

  const opponentSide = side === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED;
  const opponentPieces = getPiecesBySide(board, opponentSide);
  const checkingPieces: Piece[] = [];

  for (const piece of opponentPieces) {
    const validator = getValidatorForPieceType(piece.type);
    const result = validator(board, piece.coord, kingCoord);
    if (result.isValid) {
      checkingPieces.push(piece);
    }
  }

  return checkingPieces;
}