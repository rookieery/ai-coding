import { describe, it, expect, beforeEach } from 'vitest';
import { validateCannonMove } from '../cannon';
import { createInitialBoard } from '../../boardState';
import { PieceType, PlayerSide, BoardCoord } from '../../types';

describe('validateCannonMove', () => {
  // 初始棋盘（黑方在顶部，红方在底部）
  let board = createInitialBoard();

  beforeEach(() => {
    // 每个测试前重置棋盘
    board = createInitialBoard();
  });

  describe('基本验证', () => {
    it('起点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: -1, row: 2 };
      const to: BoardCoord = { col: 1, row: 2 };
      const result = validateCannonMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('终点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 1, row: 10 };
      const result = validateCannonMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('起点没有棋子应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 4 }; // 空位置
      const to: BoardCoord = { col: 4, row: 5 };
      const result = validateCannonMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('起点没有棋子');
    });

    it('棋子类型不是炮应返回无效', () => {
      // 使用黑方马的位置 (1,0)
      const from: BoardCoord = { col: 1, row: 0 };
      const to: BoardCoord = { col: 1, row: 1 };
      const result = validateCannonMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('棋子类型不是炮');
    });

    it('起点终点相同应返回无效', () => {
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 1, row: 2 };
      const result = validateCannonMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('未移动');
    });
  });

  describe('移动方向验证', () => {
    it('斜线移动应返回无效', () => {
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 2, row: 3 };
      const result = validateCannonMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('炮只能直线移动');
    });

    it('水平移动有效（不吃子）', () => {
      // 创建自定义棋盘，炮在 (4,2)，水平路径无棋子
      const customBoard = createInitialBoard();
      // 在 (4,2) 放置黑方炮
      customBoard[2][4] = { type: PieceType.CANNON, side: PlayerSide.BLACK, coord: { col: 4, row: 2 } };
      // 移除右侧棋子 (5,2) (6,2) (7,2) (8,2)
      for (let col = 5; col <= 8; col++) {
        customBoard[2][col] = null;
      }
      const from: BoardCoord = { col: 4, row: 2 };
      const to: BoardCoord = { col: 8, row: 2 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('垂直移动有效（不吃子）', () => {
      const customBoard = createInitialBoard();
      // 炮在 (4,2)，垂直向下移动，清空路径
      customBoard[2][4] = { type: PieceType.CANNON, side: PlayerSide.BLACK, coord: { col: 4, row: 2 } };
      for (let row = 3; row <= 5; row++) {
        customBoard[row][4] = null;
      }
      const from: BoardCoord = { col: 4, row: 2 };
      const to: BoardCoord = { col: 4, row: 5 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });
  });

  describe('不吃子移动验证', () => {
    it('路径上有棋子应返回无效', () => {
      // 初始棋盘黑方炮在 (1,2)，右侧有黑方兵 (2,2)？实际上 (2,2) 是空位，我们放置一个棋子
      const customBoard = createInitialBoard();
      // 在 (2,2) 放置一个棋子
      customBoard[2][2] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 2, row: 2 } };
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 3, row: 2 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('不吃子时不能越过其他棋子');
    });

    it('路径上无棋子有效', () => {
      const customBoard = createInitialBoard();
      // 清空 (2,2) (3,2)
      customBoard[2][2] = null;
      customBoard[2][3] = null;
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 4, row: 2 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });
  });

  describe('吃子移动验证', () => {
    it('吃子时没有炮架（零个中间棋子）应返回无效', () => {
      // 炮在 (1,2)，目标位置有对方棋子，中间无棋子
      const customBoard = createInitialBoard();
      // 清空 (2,2)
      customBoard[2][2] = null;
      // 在 (3,2) 放置红方兵
      customBoard[2][3] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 3, row: 2 } };
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 3, row: 2 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('吃子时必须有炮架');
    });

    it('吃子时恰好有一个炮架有效', () => {
      const customBoard = createInitialBoard();
      // 炮在 (1,2)，中间 (2,2) 有任意棋子（炮架），目标 (3,2) 有红方兵
      customBoard[2][2] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 2, row: 2 } };
      customBoard[2][3] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 3, row: 2 } };
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 3, row: 2 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });

    it('吃子时有两个中间棋子应返回无效', () => {
      const customBoard = createInitialBoard();
      // 炮在 (1,2)，中间 (2,2) 和 (3,2) 都有棋子，目标 (4,2) 有红方兵
      customBoard[2][2] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 2, row: 2 } };
      customBoard[2][3] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 3, row: 2 } };
      customBoard[2][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 2 } };
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 4, row: 2 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('吃子时只能隔一个棋子');
    });

    it('吃己方棋子应返回无效（即使有炮架）', () => {
      const customBoard = createInitialBoard();
      // 炮在 (1,2)，中间 (2,2) 有棋子，目标 (3,2) 有黑方兵
      customBoard[2][2] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 2, row: 2 } };
      customBoard[2][3] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 3, row: 2 } };
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 3, row: 2 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('不能吃掉己方棋子');
    });
  });

  describe('综合场景', () => {
    it('炮架可以是任意一方的棋子', () => {
      const customBoard = createInitialBoard();
      // 炮在 (1,2)，中间 (2,2) 放红方棋子（对方），目标 (3,2) 放红方兵
      customBoard[2][2] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 2, row: 2 } };
      customBoard[2][3] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 3, row: 2 } };
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 3, row: 2 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });

    it('炮架和目标可以是同一方的棋子（但目标必须是对方）', () => {
      // 炮架是黑方，目标是红方，合法
      const customBoard = createInitialBoard();
      customBoard[2][2] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 2, row: 2 } };
      customBoard[2][3] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 3, row: 2 } };
      const from: BoardCoord = { col: 1, row: 2 };
      const to: BoardCoord = { col: 3, row: 2 };
      const result = validateCannonMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });
  });
});