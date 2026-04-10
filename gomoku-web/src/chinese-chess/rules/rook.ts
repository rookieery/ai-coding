/**
 * 车（Rook）移动规则验证
 */

import { BoardState, BoardCoord, PieceType, PlayerSide, MoveValidationResult } from '../types';
import { getPieceAt, isWithinBoard } from '../boardState';

/**
 * 验证车的移动是否合法
 * 规则：直线移动（同一行或同一列），不能越过其他棋子
 */
export function validateRookMove(
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

  // 3. 确保棋子类型为车
  if (piece.type !== PieceType.ROOK) {
    return {
      isValid: false,
      reason: '棋子类型不是车',
    };
  }

  // 4. 检查是否移动（起点和终点不能相同）
  if (from.col === to.col && from.row === to.row) {
    return {
      isValid: false,
      reason: '未移动',
    };
  }

  // 5. 验证移动方向：必须是直线（同一行或同一列）
  const isHorizontal = from.row === to.row;
  const isVertical = from.col === to.col;
  if (!isHorizontal && !isVertical) {
    return {
      isValid: false,
      reason: '车只能直线移动（同一行或同一列）',
    };
  }

  // 6. 检查路径上是否有其他棋子（不包括终点）
  const colStep = isHorizontal ? (to.col > from.col ? 1 : -1) : 0;
  const rowStep = isVertical ? (to.row > from.row ? 1 : -1) : 0;

  let currentCol = from.col + colStep;
  let currentRow = from.row + rowStep;

  while (currentCol !== to.col || currentRow !== to.row) {
    const intermediateCoord: BoardCoord = { col: currentCol, row: currentRow };
    if (getPieceAt(board, intermediateCoord)) {
      return {
        isValid: false,
        reason: '移动路径上有其他棋子',
      };
    }
    currentCol += colStep;
    currentRow += rowStep;
  }

  // 7. 检查终点棋子（如果有）是否为对方棋子
  const targetPiece = getPieceAt(board, to);
  if (targetPiece && targetPiece.side === piece.side) {
    return {
      isValid: false,
      reason: '不能吃掉己方棋子',
    };
  }

  // 8. 移动合法
  return {
    isValid: true,
    isCapture: !!targetPiece,
  };
}