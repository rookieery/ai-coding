/**
 * 将（King）移动规则验证
 */

import { BoardState, BoardCoord, PieceType, PlayerSide, MoveValidationResult } from '../types';
import { getPieceAt, isWithinBoard, isInPalace } from '../boardState';

/**
 * 检查两个将/帅是否直接照面（中间无棋子）
 * @param board 棋盘状态
 * @param redKingCoord 红方将/帅坐标（如果已知）
 * @param blackKingCoord 黑方将/帅坐标（如果已知）
 * @returns true 如果直接照面
 */
function areKingsFacing(
  board: BoardState,
  redKingCoord?: BoardCoord,
  blackKingCoord?: BoardCoord
): boolean {
  // 如果坐标未提供，需要先查找
  let redCoord = redKingCoord;
  let blackCoord = blackKingCoord;

  if (!redCoord || !blackCoord) {
    // 遍历棋盘查找双方将/帅
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        if (piece?.type === PieceType.KING) {
          if (piece.side === PlayerSide.RED) {
            redCoord = { col, row };
          } else {
            blackCoord = { col, row };
          }
        }
      }
    }
  }

  // 如果找不到某一方，返回 false
  if (!redCoord || !blackCoord) {
    return false;
  }

  // 检查是否在同一列
  if (redCoord.col !== blackCoord.col) {
    return false;
  }

  // 检查中间是否有棋子（不包括两端）
  const minRow = Math.min(redCoord.row, blackCoord.row);
  const maxRow = Math.max(redCoord.row, blackCoord.row);
  for (let row = minRow + 1; row < maxRow; row++) {
    if (board[row][redCoord.col]) {
      return false;
    }
  }

  // 中间无棋子，直接照面
  return true;
}

/**
 * 验证将/帅的移动是否合法
 * 规则：九宫格内移动，将帅不能直接照面（中间无棋子）
 */
export function validateKingMove(
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

  // 3. 确保棋子类型为将/帅
  if (piece.type !== PieceType.KING) {
    return {
      isValid: false,
      reason: '棋子类型不是将/帅',
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

  // 6. 验证移动方向：必须是正交一步（|dcol| + |drow| = 1）
  if (Math.abs(dcol) + Math.abs(drow) !== 1) {
    return {
      isValid: false,
      reason: '将/帅只能移动一步（上下左右）',
    };
  }

  // 7. 检查终点是否在九宫格内
  if (!isInPalace(to, piece.side)) {
    return {
      isValid: false,
      reason: '将/帅不能离开九宫格',
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

  // 9. 模拟移动后的棋盘状态，检查是否导致将帅直接照面
  const newBoard = board.map(row => [...row]);
  newBoard[from.row][from.col] = null;
  const movedPiece = { ...piece, coord: to };
  newBoard[to.row][to.col] = movedPiece;

  // 确定双方将/帅坐标
  let redKingCoord: BoardCoord | undefined;
  let blackKingCoord: BoardCoord | undefined;

  if (piece.side === PlayerSide.RED) {
    redKingCoord = to;
    // 需要查找黑方将/帅（可能位置不变）
    for (let row = 0; row < newBoard.length; row++) {
      for (let col = 0; col < newBoard[row].length; col++) {
        const p = newBoard[row][col];
        if (p?.type === PieceType.KING && p.side === PlayerSide.BLACK) {
          blackKingCoord = { col, row };
          break;
        }
      }
    }
  } else {
    blackKingCoord = to;
    // 查找红方将/帅
    for (let row = 0; row < newBoard.length; row++) {
      for (let col = 0; col < newBoard[row].length; col++) {
        const p = newBoard[row][col];
        if (p?.type === PieceType.KING && p.side === PlayerSide.RED) {
          redKingCoord = { col, row };
          break;
        }
      }
    }
  }

  // 如果双方将/帅都存在且直接照面，则移动非法
  if (redKingCoord && blackKingCoord && areKingsFacing(newBoard, redKingCoord, blackKingCoord)) {
    return {
      isValid: false,
      reason: '将帅不能直接照面',
    };
  }

  // 10. 移动合法
  return {
    isValid: true,
    isCapture: !!targetPiece,
  };
}