/**
 * 兵（Pawn）移动规则验证
 */

import { BoardState, BoardCoord, PieceType, PlayerSide, MoveValidationResult } from '../types';
import { getPieceAt, isWithinBoard, isPawnCrossedRiver } from '../boardState';

/**
 * 验证兵/卒的移动是否合法
 * 规则：过河前只能向前，过河后可左右移动，不能后退
 */
export function validatePawnMove(
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

  // 3. 确保棋子类型为兵/卒
  if (piece.type !== PieceType.PAWN) {
    return {
      isValid: false,
      reason: '棋子类型不是兵/卒',
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

  // 6. 确定前进方向：红方向前是 row 减少（向上），黑方向前是 row 增加（向下）
  const forwardStep = piece.side === PlayerSide.RED ? -1 : 1;

  // 7. 检查是否过河
  const crossedRiver = isPawnCrossedRiver(piece, from);

  // 8. 验证移动步长和方向
  let isValidMove = false;

  // 8a. 向前移动一步
  if (dcol === 0 && drow === forwardStep) {
    isValidMove = true;
  }
  // 8b. 过河后可以横向移动一步（左右）
  else if (crossedRiver && Math.abs(dcol) === 1 && drow === 0) {
    isValidMove = true;
  }

  if (!isValidMove) {
    return {
      isValid: false,
      reason: crossedRiver
        ? '兵过河后只能向前或左右移动一步'
        : '兵过河前只能向前移动一步',
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