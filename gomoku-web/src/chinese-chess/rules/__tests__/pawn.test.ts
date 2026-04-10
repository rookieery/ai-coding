import { describe, it, expect, beforeEach } from 'vitest';
import { validatePawnMove } from '../pawn';
import { createInitialBoard } from '../../boardState';
import { PieceType, PlayerSide, BoardCoord } from '../../types';

describe('validatePawnMove', () => {
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
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('终点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: 0, row: 3 };
      const to: BoardCoord = { col: 0, row: 10 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('起点没有棋子应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 4 }; // 空位置
      const to: BoardCoord = { col: 4, row: 5 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('起点没有棋子');
    });

    it('棋子类型不是兵应返回无效', () => {
      // 使用黑方车的位置 (0,0)
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 0, row: 1 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('棋子类型不是兵/卒');
    });

    it('起点终点相同应返回无效', () => {
      const from: BoardCoord = { col: 0, row: 3 };
      const to: BoardCoord = { col: 0, row: 3 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('未移动');
    });
  });

  describe('黑方兵（未过河）', () => {
    it('向前移动一步有效', () => {
      // 黑方兵在 (0,3)（初始位置），向前一步到 (0,4)
      const from: BoardCoord = { col: 0, row: 3 };
      const to: BoardCoord = { col: 0, row: 4 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('向后移动应返回无效', () => {
      // 黑方兵在 (0,3)，尝试向后移动到 (0,2)
      const from: BoardCoord = { col: 0, row: 3 };
      const to: BoardCoord = { col: 0, row: 2 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('兵过河前只能向前移动一步');
    });

    it('横向移动应返回无效（未过河）', () => {
      const from: BoardCoord = { col: 0, row: 3 };
      const to: BoardCoord = { col: 1, row: 3 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('兵过河前只能向前移动一步');
    });

    it('斜线移动应返回无效', () => {
      const from: BoardCoord = { col: 0, row: 3 };
      const to: BoardCoord = { col: 1, row: 4 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
    });

    it('移动两步应返回无效', () => {
      const from: BoardCoord = { col: 0, row: 3 };
      const to: BoardCoord = { col: 0, row: 5 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
    });
  });

  describe('红方兵（未过河）', () => {
    it('向前移动一步有效', () => {
      // 红方兵在 (0,6)（初始位置），向前一步（向上）到 (0,5)
      const from: BoardCoord = { col: 0, row: 6 };
      const to: BoardCoord = { col: 0, row: 5 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('向后移动应返回无效', () => {
      // 红方兵在 (0,6)，向后移动到 (0,7)
      const from: BoardCoord = { col: 0, row: 6 };
      const to: BoardCoord = { col: 0, row: 7 };
      const result = validatePawnMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('兵过河前只能向前移动一步');
    });
  });

  describe('过河后移动', () => {
    it('黑方兵过河后可以横向移动', () => {
      // 创建自定义棋盘，黑方兵在 (4,5)（已经过河）
      const customBoard = createInitialBoard();
      customBoard[5][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 5 } };
      const from: BoardCoord = { col: 4, row: 5 };
      const to: BoardCoord = { col: 5, row: 5 };
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('黑方兵过河后可以向前移动', () => {
      const customBoard = createInitialBoard();
      customBoard[5][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 5 } };
      const from: BoardCoord = { col: 4, row: 5 };
      const to: BoardCoord = { col: 4, row: 6 };
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
    });

    it('黑方兵过河后不能向后移动', () => {
      const customBoard = createInitialBoard();
      customBoard[5][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 5 } };
      const from: BoardCoord = { col: 4, row: 5 };
      const to: BoardCoord = { col: 4, row: 4 };
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('兵过河后只能向前或左右移动一步');
    });

    it('红方兵过河后可以横向移动', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 4 } };
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 5, row: 4 };
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
    });

    it('红方兵过河后可以向前移动', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 4 } };
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 4, row: 3 };
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
    });

    it('红方兵过河后不能向后移动', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 4 } };
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 4, row: 5 };
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
    });
  });

  describe('吃子验证', () => {
    it('黑方兵可以吃前方的红方棋子', () => {
      const customBoard = createInitialBoard();
      // 黑方兵在 (4,4)，前方 (4,5) 有红方兵
      customBoard[4][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      customBoard[5][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 5 } };
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 4, row: 5 };
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });

    it('黑方兵过河后可以吃左侧的红方棋子', () => {
      const customBoard = createInitialBoard();
      customBoard[5][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 5 } };
      customBoard[5][5] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 5, row: 5 } };
      const from: BoardCoord = { col: 4, row: 5 };
      const to: BoardCoord = { col: 5, row: 5 };
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });

    it('不能吃掉己方棋子', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      customBoard[5][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 5 } };
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 4, row: 5 };
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('不能吃掉己方棋子');
    });
  });

  describe('边界条件', () => {
    it('黑方兵在底线（row=9）仍然可以向前移动（实际上不可能，因为兵不能后退）', () => {
      const customBoard = createInitialBoard();
      customBoard[9][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 9 } };
      const from: BoardCoord = { col: 4, row: 9 };
      const to: BoardCoord = { col: 4, row: 10 }; // 超出棋盘，应该无效
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('红方兵在底线（row=0）仍然可以向前移动', () => {
      const customBoard = createInitialBoard();
      customBoard[0][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 0 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: -1 }; // 超出棋盘
      const result = validatePawnMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });
  });
});