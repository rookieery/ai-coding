import { describe, it, expect, beforeEach } from 'vitest';
import { validateKingMove } from '../king';
import { createInitialBoard } from '../../boardState';
import { PieceType, PlayerSide, BoardCoord } from '../../types';

describe('validateKingMove', () => {
  // 初始棋盘（黑方在顶部，红方在底部）
  let board = createInitialBoard();

  beforeEach(() => {
    // 每个测试前重置棋盘
    board = createInitialBoard();
  });

  describe('基本验证', () => {
    it('起点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: -1, row: 0 };
      const to: BoardCoord = { col: 0, row: 0 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('终点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 10 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('起点没有棋子应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 4 }; // 空位置
      const to: BoardCoord = { col: 4, row: 5 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('起点没有棋子');
    });

    it('棋子类型不是将应返回无效', () => {
      // 使用黑方车的位置 (0,0)
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 0, row: 1 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('棋子类型不是将/帅');
    });

    it('起点终点相同应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 0 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('未移动');
    });
  });

  describe('移动方向验证', () => {
    it('斜线移动应返回无效', () => {
      // 黑方将在 (4,0)，尝试斜线移动到 (5,1)
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 5, row: 1 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('将/帅只能移动一步（上下左右）');
    });

    it('移动两步应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 2 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('将/帅只能移动一步（上下左右）');
    });

    it('向上移动一步有效', () => {
      // 黑方将在 (4,0) 向上移动到 (4,1)（仍在九宫格内）
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 1 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('向左移动一步有效', () => {
      // 创建自定义棋盘，黑方将在 (4,0)，左侧 (3,0) 清空
      const customBoard = createInitialBoard();
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      customBoard[0][3] = null;
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 3, row: 0 };
      const result = validateKingMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('红方将向下移动一步有效', () => {
      // 红方将在 (4,9) 向下移动到 (4,8)（红方九宫格内）
      const from: BoardCoord = { col: 4, row: 9 };
      const to: BoardCoord = { col: 4, row: 8 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });
  });

  describe('九宫格边界', () => {
    it('黑方将不能离开九宫格（向左超出）', () => {
      // 黑方将在 (3,0) 向左移动到 (2,0)（列2不在九宫格内）
      const customBoard = createInitialBoard();
      // 将黑方将移动到 (3,0)
      customBoard[0][3] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 3, row: 0 } };
      customBoard[0][4] = null;
      const from: BoardCoord = { col: 3, row: 0 };
      const to: BoardCoord = { col: 2, row: 0 };
      const result = validateKingMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('将/帅不能离开九宫格');
    });

    it('红方将不能离开九宫格（向右超出）', () => {
      const customBoard = createInitialBoard();
      customBoard[9][5] = { type: PieceType.KING, side: PlayerSide.RED, coord: { col: 5, row: 9 } };
      customBoard[9][4] = null;
      const from: BoardCoord = { col: 5, row: 9 };
      const to: BoardCoord = { col: 6, row: 9 };
      const result = validateKingMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('将/帅不能离开九宫格');
    });

    it('黑方将在九宫格内移动有效', () => {
      // 黑方将在 (4,0) 移动到 (4,1)（仍在九宫格内）
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 1 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(true);
    });
  });

  describe('吃子验证', () => {
    it('吃对方棋子有效', () => {
      // 黑方将吃红方兵
      const customBoard = createInitialBoard();
      // 黑方将在 (4,0)，红方兵放在 (4,1)
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      customBoard[1][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 1 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 1 };
      const result = validateKingMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });

    it('吃己方棋子应返回无效', () => {
      const customBoard = createInitialBoard();
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      customBoard[1][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 1 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 1 };
      const result = validateKingMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('不能吃掉己方棋子');
    });
  });

  describe('将帅直接照面', () => {
    it('移动后导致将帅直接照面应返回无效', () => {
      // 创建自定义棋盘，黑方将在 (4,0)，红方将在 (4,9)，中间无棋子
      const customBoard = createInitialBoard();
      // 清空中间列上的所有棋子（列4，行1-8）
      for (let row = 1; row <= 8; row++) {
        customBoard[row][4] = null;
      }
      // 确保双方将位置
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      customBoard[9][4] = { type: PieceType.KING, side: PlayerSide.RED, coord: { col: 4, row: 9 } };
      // 黑方将向上移动一步到 (4,1)，导致直接照面（中间无棋子）
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 1 };
      const result = validateKingMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('将帅不能直接照面');
    });

    it('移动后不导致将帅直接照面有效', () => {
      // 初始棋盘中间有棋子，移动后不会照面
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 1 };
      const result = validateKingMove(board, from, to);
      expect(result.isValid).toBe(true);
    });

    it('将帅不在同一列不影响', () => {
      // 黑方将在 (4,0)，红方将在 (5,9)，移动黑方将不会照面
      const customBoard = createInitialBoard();
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      customBoard[9][5] = { type: PieceType.KING, side: PlayerSide.RED, coord: { col: 5, row: 9 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 1 };
      const result = validateKingMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
    });

    it('中间有棋子隔开不视为直接照面', () => {
      // 黑方将在 (4,0)，红方将在 (4,9)，中间有一个红方兵在 (4,5)
      const customBoard = createInitialBoard();
      // 清空列4的行1-8
      for (let row = 1; row <= 8; row++) {
        customBoard[row][4] = null;
      }
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      customBoard[9][4] = { type: PieceType.KING, side: PlayerSide.RED, coord: { col: 4, row: 9 } };
      // 放置一个红方兵在 (4,5)
      customBoard[5][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 5 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 1 };
      const result = validateKingMove(customBoard, from, to);
      expect(result.isValid).toBe(true); // 因为中间有棋子，不照面
    });
  });
});