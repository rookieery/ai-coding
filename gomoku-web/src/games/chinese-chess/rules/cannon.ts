/**
 * 炮（Cannon）移动规则验证
 */

import { BoardState, BoardCoord, PieceType, PlayerSide, MoveValidationResult } from '../types';
import { getPieceAt, isWithinBoard } from '../boardState';

/**
 * 验证炮的移动是否合法
 * 规则：直线移动，吃子时必须隔一个棋子（炮架）
 */
export function validateCannonMove(
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

  // 3. 确保棋子类型为炮
  if (piece.type !== PieceType.CANNON) {
    return {
      isValid: false,
      reason: '棋子类型不是炮',
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
      reason: '炮只能直线移动（同一行或同一列）',
    };
  }

  // 6. 计算步进方向
  const colStep = isHorizontal ? (to.col > from.col ? 1 : -1) : 0;
  const rowStep = isVertical ? (to.row > from.row ? 1 : -1) : 0;

  // 7. 统计起点和终点之间（不包括两端）的棋子数量
  let pieceCount = 0;
  let currentCol = from.col + colStep;
  let currentRow = from.row + rowStep;

  while (currentCol !== to.col || currentRow !== to.row) {
    const intermediateCoord: BoardCoord = { col: currentCol, row: currentRow };
    if (getPieceAt(board, intermediateCoord)) {
      pieceCount++;
    }
    currentCol += colStep;
    currentRow += rowStep;
  }

  // 8. 检查终点棋子（如果有）
  const targetPiece = getPieceAt(board, to);

  // 9. 根据终点是否有棋子应用不同规则
  if (targetPiece) {
    // 9a. 吃子：必须恰好有一个棋子介于起点和终点之间（炮架）
    if (pieceCount !== 1) {
      return {
        isValid: false,
        reason: pieceCount === 0 ? '吃子时必须有炮架' : '吃子时只能隔一个棋子',
      };
    }
    // 9b. 不能吃掉己方棋子
    if (targetPiece.side === piece.side) {
      return {
        isValid: false,
        reason: '不能吃掉己方棋子',
      };
    }
  } else {
    // 9c. 不吃子：路径上不能有任何棋子
    if (pieceCount > 0) {
      return {
        isValid: false,
        reason: '不吃子时不能越过其他棋子',
      };
    }
  }

  // 10. 移动合法
  return {
    isValid: true,
    isCapture: !!targetPiece,
  };
}