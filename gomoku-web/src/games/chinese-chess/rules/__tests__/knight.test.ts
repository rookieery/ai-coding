import { describe, it, expect, beforeEach } from 'vitest';
import { validateKnightMove } from '../knight';
import { createInitialBoard } from '../../boardState';
import { PieceType, PlayerSide, BoardCoord } from '../../types';

describe('validateKnightMove', () => {
  // 初始棋盘（黑方在顶部，红方在底部）
  let board = createInitialBoard();

  beforeEach(() => {
    // 每个测试前重置棋盘
    board = createInitialBoard();
  });

  describe('基本验证', () => {
    it('起点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: -1, row: 0 };
      const to: BoardCoord = { col: 1, row: 2 };
      const result = validateKnightMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('终点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: 1, row: 0 };
      const to: BoardCoord = { col: 0, row: 10 };
      const result = validateKnightMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('起点没有棋子应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 4 }; // 空位置
      const to: BoardCoord = { col: 3, row: 6 };
      const result = validateKnightMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('起点没有棋子');
    });

    it('棋子类型不是马应返回无效', () => {
      // 使用黑方车的位置 (0,0)
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 2, row: 1 };
      const result = validateKnightMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('棋子类型不是马');
    });

    it('起点终点相同应返回无效', () => {
      const from: BoardCoord = { col: 1, row: 0 };
      const to: BoardCoord = { col: 1, row: 0 };
      const result = validateKnightMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('未移动');
    });
  });

  describe('移动方向验证', () => {
    it('非日字移动应返回无效', () => {
      // 黑方马在 (1,0)，尝试直线移动
      const from: BoardCoord = { col: 1, row: 0 };
      const to: BoardCoord = { col: 1, row: 1 };
      const result = validateKnightMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('马的移动必须为日字形');
    });

    it('日字移动有效（横向两格，纵向一格）', () => {
      // 创建自定义棋盘，马在 (4,4)，周围无绊马腿
      const customBoard = createInitialBoard();
      // 在 (4,4) 放置黑方马
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      // 清除可能阻挡的棋子
      customBoard[4][5] = null; // 右侧横向中间位置
      customBoard[4][6] = null; // 目标位置右侧两格
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 6, row: 5 }; // 右两格，下一格
      const result = validateKnightMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('日字移动有效（纵向两格，横向一格）', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      // 清除绊马腿位置 (4,5) 和下方目标位置 (5,6)
      customBoard[5][4] = null; // 纵向中间位置
      customBoard[6][5] = null; // 目标位置
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 5, row: 6 }; // 右一格，下两格
      const result = validateKnightMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('所有八个方向移动有效', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      // 清空所有可能阻挡的棋子
      const blockingCoords = [
        { col: 5, row: 4 }, { col: 3, row: 4 }, // 左右横向中间
        { col: 4, row: 5 }, { col: 4, row: 3 }, // 上下纵向中间
      ];
      blockingCoords.forEach(coord => {
        customBoard[coord.row][coord.col] = null;
      });
      const moves = [
        { to: { col: 6, row: 5 }, block: { col: 5, row: 4 } },
        { to: { col: 6, row: 3 }, block: { col: 5, row: 4 } },
        { to: { col: 2, row: 5 }, block: { col: 3, row: 4 } },
        { to: { col: 2, row: 3 }, block: { col: 3, row: 4 } },
        { to: { col: 5, row: 6 }, block: { col: 4, row: 5 } },
        { to: { col: 3, row: 6 }, block: { col: 4, row: 5 } },
        { to: { col: 5, row: 2 }, block: { col: 4, row: 3 } },
        { to: { col: 3, row: 2 }, block: { col: 4, row: 3 } },
      ];
      moves.forEach(({ to, block }) => {
        // 确保目标位置为空
        customBoard[to.row][to.col] = null;
        const result = validateKnightMove(customBoard, { col: 4, row: 4 }, to);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('绊马腿验证', () => {
    it('横向两格移动时，横向中间有棋子应返回无效', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      // 在横向中间位置 (5,4) 放置一个棋子
      customBoard[4][5] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 5, row: 4 } };
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 6, row: 5 };
      const result = validateKnightMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('绊马腿');
    });

    it('纵向两格移动时，纵向中间有棋子应返回无效', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      // 在纵向中间位置 (4,5) 放置一个棋子
      customBoard[5][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 5 } };
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 5, row: 6 };
      const result = validateKnightMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('绊马腿');
    });

    it('绊马腿位置有对方棋子也应阻挡', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      // 在横向中间位置 (5,4) 放置红方棋子
      customBoard[4][5] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 5, row: 4 } };
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 6, row: 5 };
      const result = validateKnightMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('绊马腿');
    });
  });

  describe('吃子验证', () => {
    it('吃对方棋子有效', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      // 目标位置放置红方兵
      customBoard[5][6] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 6, row: 5 } };
      // 清空绊马腿位置
      customBoard[5][4] = null; // 纵向中间
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 6, row: 5 };
      const result = validateKnightMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });

    it('吃己方棋子应返回无效', () => {
      const customBoard = createInitialBoard();
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      // 目标位置放置黑方兵
      customBoard[5][6] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 6, row: 5 } };
      customBoard[5][4] = null;
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 6, row: 5 };
      const result = validateKnightMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('不能吃掉己方棋子');
    });
  });
});