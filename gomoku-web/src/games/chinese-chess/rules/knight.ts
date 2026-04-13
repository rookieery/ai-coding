/**
 * 马（Knight）移动规则验证
 */

import { BoardState, BoardCoord, PieceType, PlayerSide, MoveValidationResult } from '../types';
import { getPieceAt, isWithinBoard } from '../boardState';

/**
 * 验证马的移动是否合法
 * 规则：日字移动，检查绊马腿（马腿位置是否有棋子）
 */
export function validateKnightMove(
  board: BoardState,
  from: BoardCoord,
  to: BoardCoord
): MoveValidationResult {
  // 1. 检查起点和终点是否在棋盘内
  if (!isWithinBoard(from) || !isWithinBoard(to)) {
    return {
      isValid: false,
      reason: '移动超出棋盘范围',
    };
  }

  // 2. 获取起点棋子
  const piece = getPieceAt(board, from);
  if (!piece) {
    return {
      isValid: false,
      reason: '起点没有棋子',
    };
  }

  // 3. 确保棋子类型为马
  if (piece.type !== PieceType.KNIGHT) {
    return {
      isValid: false,
      reason: '棋子类型不是马',
    };
  }

  // 4. 检查是否移动（起点和终点不能相同）
  if (from.col === to.col && from.row === to.row) {
    return {
      isValid: false,
      reason: '未移动',
    };
  }

  // 5. 计算列差和行差
  const dcol = to.col - from.col;
  const drow = to.row - from.row;

  // 6. 验证是否为日字移动（|dcol| = 1 且 |drow| = 2，或 |dcol| = 2 且 |drow| = 1）
  const isKnightMove =
    (Math.abs(dcol) === 1 && Math.abs(drow) === 2) ||
    (Math.abs(dcol) === 2 && Math.abs(drow) === 1);

  if (!isKnightMove) {
    return {
      isValid: false,
      reason: '马的移动必须为日字形',
    };
  }

  // 7. 检查绊马腿
  let blockingCoord: BoardCoord;
  if (Math.abs(dcol) === 2) {
    // 横向移动两格，纵向移动一格 → 马腿在横向中间位置
    blockingCoord = {
      col: from.col + dcol / 2,
      row: from.row,
    };
  } else {
    // 纵向移动两格，横向移动一格 → 马腿在纵向中间位置
    blockingCoord = {
      col: from.col,
      row: from.row + drow / 2,
    };
  }

  if (getPieceAt(board, blockingCoord)) {
    return {
      isValid: false,
      reason: '绊马腿',
    };
  }

  // 8. 检查终点棋子（如果有）是否为对方棋子
  const targetPiece = getPieceAt(board, to);
  if (targetPiece && targetPiece.side === piece.side) {
    return {
      isValid: false,
      reason: '不能吃掉己方棋子',
    };
  }

  // 9. 移动合法
  return {
    isValid: true,
    isCapture: !!targetPiece,
  };
}