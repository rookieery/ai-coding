import { describe, it, expect, beforeEach } from 'vitest';
import { validateRookMove } from '../rook';
import { createInitialBoard } from '../../boardState';
import { PieceType, PlayerSide, BoardCoord } from '../../types';

describe('validateRookMove', () => {
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
      const result = validateRookMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('终点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 0, row: 10 };
      const result = validateRookMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('起点没有棋子应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 4 }; // 空位置
      const to: BoardCoord = { col: 4, row: 5 };
      const result = validateRookMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('起点没有棋子');
    });

    it('棋子类型不是车应返回无效', () => {
      // 使用黑方马的位置 (1,0)
      const from: BoardCoord = { col: 1, row: 0 };
      const to: BoardCoord = { col: 1, row: 1 };
      const result = validateRookMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('棋子类型不是车');
    });

    it('起点终点相同应返回无效', () => {
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 0, row: 0 };
      const result = validateRookMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('未移动');
    });
  });

  describe('移动方向验证', () => {
    it('斜线移动应返回无效', () => {
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 1, row: 1 };
      const result = validateRookMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('车只能直线移动');
    });

    it('水平移动有效', () => {
      // 清空路径上的棋子，方便测试
      // 将黑方车从 (0,0) 移动到 (3,0)，路径上原本有士、象等棋子，需要先清空
      // 这里我们创建一个自定义棋盘
      const customBoard = createInitialBoard();
      // 移除 (1,0) (2,0) (3,0) 的棋子
      customBoard[0][1] = null;
      customBoard[0][2] = null;
      customBoard[0][3] = null;
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 3, row: 0 };
      const result = validateRookMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('垂直移动有效', () => {
      // 创建自定义棋盘，车在 (4,0)，下方无棋子
      const customBoard = createInitialBoard();
      // 在 (4,0) 放置黑方车，移除原来的将
      customBoard[0][4] = { type: PieceType.ROOK, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 3 };
      // 清空路径上的棋子以及目标位置
      customBoard[1][4] = null;
      customBoard[2][4] = null;
      customBoard[3][4] = null; // 目标位置原本有黑方兵
      const result = validateRookMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });
  });

  describe('路径阻塞验证', () => {
    it('水平移动路径上有棋子应返回无效', () => {
      // 初始棋盘 (0,0) 车右侧有马 (1,0)，移动会被阻挡
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 2, row: 0 };
      const result = validateRookMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('移动路径上有其他棋子');
    });

    it('垂直移动路径上有棋子应返回无效', () => {
      // 创建自定义棋盘，车在 (4,0)，下方有兵 (4,3)
      const customBoard = createInitialBoard();
      customBoard[0][4] = { type: PieceType.ROOK, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      // 在 (4,3) 放置一个黑方兵
      customBoard[3][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 3 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 4, row: 5 };
      const result = validateRookMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('移动路径上有其他棋子');
    });
  });

  describe('吃子验证', () => {
    it('吃对方棋子有效', () => {
      // 黑方车吃红方兵
      const customBoard = createInitialBoard();
      // 将黑方车放在 (4,4)，红方兵放在 (4,6)
      customBoard[4][4] = { type: PieceType.ROOK, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      customBoard[6][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 6 } };
      // 清空路径上的棋子
      customBoard[5][4] = null;
      const from: BoardCoord = { col: 4, row: 4 };
      const to: BoardCoord = { col: 4, row: 6 };
      const result = validateRookMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });

    it('吃己方棋子应返回无效', () => {
      const customBoard = createInitialBoard();
      // 黑方车吃黑方马
      customBoard[0][0] = { type: PieceType.ROOK, side: PlayerSide.BLACK, coord: { col: 0, row: 0 } };
      customBoard[0][1] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 1, row: 0 } };
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 1, row: 0 };
      const result = validateRookMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('不能吃掉己方棋子');
    });
  });
});