/**
 * 士（Advisor）和象（Elephant）移动规则验证
 */

import { BoardState, BoardCoord, PieceType, PlayerSide, MoveValidationResult } from '../types';
import { getPieceAt, isWithinBoard, isInPalace, isSameSideOfRiver } from '../boardState';

/**
 * 验证士的移动是否合法
 * 规则：斜线移动（九宫格内）
 */
export function validateAdvisorMove(
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

  // 3. 确保棋子类型为士
  if (piece.type !== PieceType.ADVISOR) {
    return {
      isValid: false,
      reason: '棋子类型不是士',
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

  // 6. 验证移动方向：必须是斜向一步（|dcol| = 1 且 |drow| = 1）
  if (Math.abs(dcol) !== 1 || Math.abs(drow) !== 1) {
    return {
      isValid: false,
      reason: '士只能斜向移动一步',
    };
  }

  // 7. 检查终点是否在九宫格内
  if (!isInPalace(to, piece.side)) {
    return {
      isValid: false,
      reason: '士不能离开九宫格',
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

/**
 * 验证象的移动是否合法
 * 规则：田字移动，不能过河，塞象眼
 */
export function validateElephantMove(
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

  // 3. 确保棋子类型为象
  if (piece.type !== PieceType.ELEPHANT) {
    return {
      isValid: false,
      reason: '棋子类型不是象',
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

  // 6. 验证移动方向：必须是田字移动（|dcol| = 2 且 |drow| = 2）
  if (Math.abs(dcol) !== 2 || Math.abs(drow) !== 2) {
    return {
      isValid: false,
      reason: '象只能田字移动（斜向两格）',
    };
  }

  // 7. 检查是否过河：象不能过河，即起点和终点必须在河的同一侧
  if (!isSameSideOfRiver(from, to)) {
    return {
      isValid: false,
      reason: '象不能过河',
    };
  }

  // 8. 检查塞象眼：中间对角位置是否有棋子
  const blockingCoord: BoardCoord = {
    col: from.col + dcol / 2,
    row: from.row + drow / 2,
  };
  if (getPieceAt(board, blockingCoord)) {
    return {
      isValid: false,
      reason: '塞象眼',
    };
  }

  // 9. 检查终点棋子（如果有）是否为对方棋子
  const targetPiece = getPieceAt(board, to);
  if (targetPiece && targetPiece.side === piece.side) {
    return {
      isValid: false,
      reason: '不能吃掉己方棋子',
    };
  }

  // 10. 移动合法
  return {
    isValid: true,
    isCapture: !!targetPiece,
  };
}