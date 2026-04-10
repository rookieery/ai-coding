/**
 * 将死检测逻辑
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
import { getPieceAt, movePiece } from '../boardState';
import { isCheck } from './check';

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
 * 生成指定方的所有合法移动
 * @param board 棋盘状态
 * @param side 玩家方
 * @returns 所有合法移动的数组，每个元素包含起始坐标和目标坐标
 */
export function generateAllLegalMoves(board: BoardState, side: PlayerSide): Array<{from: BoardCoord, to: BoardCoord}> {
  const pieces = getPiecesBySide(board, side);
  const legalMoves: Array<{from: BoardCoord, to: BoardCoord}> = [];

  for (const piece of pieces) {
    const validator = getValidatorForPieceType(piece.type);
    // 遍历棋盘上的所有可能目标位置
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const targetCoord: BoardCoord = { col, row };
        const result = validator(board, piece.coord, targetCoord);
        if (result.isValid) {
          legalMoves.push({ from: piece.coord, to: targetCoord });
        }
      }
    }
  }

  return legalMoves;
}

/**
 * 模拟移动并返回新的棋盘状态
 * 注意：不修改原棋盘，返回一个全新的棋盘状态
 */
function simulateMove(board: BoardState, from: BoardCoord, to: BoardCoord): BoardState {
  return movePiece(board, from, to);
}

/**
 * 检测指定方是否被将死
 * @param board 棋盘状态
 * @param side 待检测的一方（红方或黑方）
 * @returns true 如果该方被将死
 */
export function isCheckmate(board: BoardState, side: PlayerSide): boolean {
  // 首先检查是否被将军
  if (!isCheck(board, side)) {
    return false;
  }

  // 生成该方的所有合法移动
  const legalMoves = generateAllLegalMoves(board, side);

  // 遍历每个合法移动，检查移动后是否仍被将军
  for (const move of legalMoves) {
    const simulatedBoard = simulateMove(board, move.from, move.to);
    // 移动后，检查是否仍被将军（注意：移动后轮到对方走棋，但将军检测是针对当前方的将/帅）
    // 我们需要检查移动后，当前方是否还被将军
    if (!isCheck(simulatedBoard, side)) {
      // 存在至少一个移动可以解除将军，不是将死
      return false;
    }
  }

  // 所有合法移动都无法解除将军，将死
  return true;
}

/**
 * 检测指定方是否困毙（无合法移动且未被将军）
 * 注意：在中国象棋中，困毙视为输棋，相当于将死
 * @param board 棋盘状态
 * @param side 待检测的一方（红方或黑方）
 * @returns true 如果该方困毙
 */
export function isStalemate(board: BoardState, side: PlayerSide): boolean {
  // 如果被将军，则不是困毙（可能是将死）
  if (isCheck(board, side)) {
    return false;
  }

  // 检查是否有任何合法移动
  const legalMoves = generateAllLegalMoves(board, side);
  return legalMoves.length === 0;
}

/**
 * 检测指定方是否输棋（将死或困毙）
 * @param board 棋盘状态
 * @param side 待检测的一方（红方或黑方）
 * @returns true 如果该方输棋（将死或困毙）
 */
export function isLosing(board: BoardState, side: PlayerSide): boolean {
  return isCheckmate(board, side) || isStalemate(board, side);
}