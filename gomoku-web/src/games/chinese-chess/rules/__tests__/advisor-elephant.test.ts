import { describe, it, expect, beforeEach } from 'vitest';
import { validateAdvisorMove, validateElephantMove } from '../advisor-elephant';
import { createInitialBoard } from '../../boardState';
import { PieceType, PlayerSide, BoardCoord } from '../../types';

describe('validateAdvisorMove', () => {
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
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('终点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: 3, row: 0 };
      const to: BoardCoord = { col: 3, row: 10 };
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('起点没有棋子应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 4 }; // 空位置
      const to: BoardCoord = { col: 5, row: 5 };
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('起点没有棋子');
    });

    it('棋子类型不是士应返回无效', () => {
      // 使用黑方车的位置 (0,0)
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 1, row: 1 };
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('棋子类型不是士');
    });

    it('起点终点相同应返回无效', () => {
      const from: BoardCoord = { col: 3, row: 0 };
      const to: BoardCoord = { col: 3, row: 0 };
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('未移动');
    });
  });

  describe('移动方向验证', () => {
    it('非斜线移动应返回无效', () => {
      // 黑方士在 (3,0)，尝试直线移动
      const from: BoardCoord = { col: 3, row: 0 };
      const to: BoardCoord = { col: 3, row: 1 };
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('士只能斜向移动一步');
    });

    it('斜线移动一步有效', () => {
      // 黑方士在 (3,0)，移动到 (4,1)
      const from: BoardCoord = { col: 3, row: 0 };
      const to: BoardCoord = { col: 4, row: 1 };
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('斜线移动两步应返回无效', () => {
      const from: BoardCoord = { col: 3, row: 0 };
      const to: BoardCoord = { col: 5, row: 2 };
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('士只能斜向移动一步');
    });
  });

  describe('九宫格边界', () => {
    it('黑方士不能离开九宫格', () => {
      // 尝试斜向移动到九宫格外 (2,1)（列2不在九宫格内）
      const from: BoardCoord = { col: 3, row: 0 };
      const to: BoardCoord = { col: 2, row: 1 };
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('士不能离开九宫格');
    });

    it('红方士不能离开九宫格', () => {
      // 红方士在 (3,9)，尝试斜向移动到九宫格外 (2,8)（列2不在九宫格内）
      const from: BoardCoord = { col: 3, row: 9 };
      const to: BoardCoord = { col: 2, row: 8 };
      const result = validateAdvisorMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('士不能离开九宫格');
    });

    it('黑方士在九宫格内斜线移动有效', () => {
      // 创建自定义棋盘，黑方士在 (4,0)，移动到 (3,1)（仍在九宫格内）
      const customBoard = createInitialBoard();
      customBoard[0][4] = { type: PieceType.ADVISOR, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 3, row: 1 };
      const result = validateAdvisorMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
    });
  });

  describe('吃子验证', () => {
    it('吃对方棋子有效', () => {
      // 自定义棋盘，黑方士吃红方兵
      const customBoard = createInitialBoard();
      // 移除黑方士原来的位置，放置黑方士在 (4,0)
      customBoard[0][4] = { type: PieceType.ADVISOR, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      // 在 (5,1) 放置红方兵
      customBoard[1][5] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 5, row: 1 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 5, row: 1 };
      const result = validateAdvisorMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });

    it('吃己方棋子应返回无效', () => {
      const customBoard = createInitialBoard();
      customBoard[0][4] = { type: PieceType.ADVISOR, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      // 在 (5,1) 放置黑方兵
      customBoard[1][5] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 5, row: 1 } };
      const from: BoardCoord = { col: 4, row: 0 };
      const to: BoardCoord = { col: 5, row: 1 };
      const result = validateAdvisorMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('不能吃掉己方棋子');
    });
  });
});

describe('validateElephantMove', () => {
  let board = createInitialBoard();

  beforeEach(() => {
    board = createInitialBoard();
  });

  describe('基本验证', () => {
    it('起点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: -1, row: 0 };
      const to: BoardCoord = { col: 1, row: 2 };
      const result = validateElephantMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('终点超出棋盘应返回无效', () => {
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 2, row: 10 };
      const result = validateElephantMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('超出棋盘范围');
    });

    it('起点没有棋子应返回无效', () => {
      const from: BoardCoord = { col: 4, row: 4 }; // 空位置
      const to: BoardCoord = { col: 6, row: 6 };
      const result = validateElephantMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('起点没有棋子');
    });

    it('棋子类型不是象应返回无效', () => {
      // 使用黑方车的位置 (0,0)
      const from: BoardCoord = { col: 0, row: 0 };
      const to: BoardCoord = { col: 2, row: 2 };
      const result = validateElephantMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('棋子类型不是象');
    });

    it('起点终点相同应返回无效', () => {
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 2, row: 0 };
      const result = validateElephantMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('未移动');
    });
  });

  describe('移动方向验证', () => {
    it('非田字移动应返回无效', () => {
      // 黑方象在 (2,0)，尝试直线移动
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 2, row: 1 };
      const result = validateElephantMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('象只能田字移动');
    });

    it('田字移动有效', () => {
      // 黑方象在 (2,0)，移动到 (0,2)（左上）
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 0, row: 2 };
      // 需要清空塞象眼位置 (1,1)
      const customBoard = createInitialBoard();
      customBoard[1][1] = null;
      const result = validateElephantMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(false);
    });

    it('田字移动但步长不对应返回无效', () => {
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 1, row: 2 };
      const result = validateElephantMove(board, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('象只能田字移动');
    });
  });

  describe('过河验证', () => {
    it('象不能过河', () => {
      // 黑方象在 (4,3)（靠近河），尝试移动到 (6,5)（过河，田字移动）
      const customBoard = createInitialBoard();
      customBoard[3][4] = { type: PieceType.ELEPHANT, side: PlayerSide.BLACK, coord: { col: 4, row: 3 } };
      // 清空塞象眼 (5,4)
      customBoard[4][5] = null;
      const from: BoardCoord = { col: 4, row: 3 };
      const to: BoardCoord = { col: 6, row: 5 };
      const result = validateElephantMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('象不能过河');
    });

    it('红方象不能过河', () => {
      const customBoard = createInitialBoard();
      customBoard[6][4] = { type: PieceType.ELEPHANT, side: PlayerSide.RED, coord: { col: 4, row: 6 } };
      // 清空塞象眼 (5,5)
      customBoard[5][5] = null;
      const from: BoardCoord = { col: 4, row: 6 };
      const to: BoardCoord = { col: 2, row: 4 };
      const result = validateElephantMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('象不能过河');
    });

    it('象在河同侧移动有效', () => {
      // 黑方象在 (2,0) 移动到 (0,2)，同侧
      const customBoard = createInitialBoard();
      customBoard[0][2] = { type: PieceType.ELEPHANT, side: PlayerSide.BLACK, coord: { col: 2, row: 0 } };
      customBoard[1][1] = null;
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 0, row: 2 };
      const result = validateElephantMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
    });
  });

  describe('塞象眼验证', () => {
    it('塞象眼应返回无效', () => {
      // 黑方象在 (2,0)，塞象眼位置 (1,1) 有棋子
      const customBoard = createInitialBoard();
      // 确保象在 (2,0)（原本就是象）
      customBoard[0][2] = { type: PieceType.ELEPHANT, side: PlayerSide.BLACK, coord: { col: 2, row: 0 } };
      // 在塞象眼位置 (1,1) 放置一个棋子
      customBoard[1][1] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 1, row: 1 } };
      // 确保目标位置 (0,2) 为空
      customBoard[2][0] = null;
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 0, row: 2 };
      const result = validateElephantMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('塞象眼');
    });

    it('塞象眼位置有对方棋子也应阻挡', () => {
      const customBoard = createInitialBoard();
      customBoard[0][2] = { type: PieceType.ELEPHANT, side: PlayerSide.BLACK, coord: { col: 2, row: 0 } };
      // 在 (1,1) 放置红方兵
      customBoard[1][1] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 1, row: 1 } };
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 0, row: 2 };
      const result = validateElephantMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('塞象眼');
    });

    it('无塞象眼移动有效', () => {
      const customBoard = createInitialBoard();
      customBoard[0][2] = { type: PieceType.ELEPHANT, side: PlayerSide.BLACK, coord: { col: 2, row: 0 } };
      customBoard[1][1] = null;
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 0, row: 2 };
      const result = validateElephantMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
    });
  });

  describe('吃子验证', () => {
    it('吃对方棋子有效', () => {
      const customBoard = createInitialBoard();
      customBoard[0][2] = { type: PieceType.ELEPHANT, side: PlayerSide.BLACK, coord: { col: 2, row: 0 } };
      // 目标位置 (0,2) 放置红方兵
      customBoard[2][0] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 0, row: 2 } };
      // 清空塞象眼
      customBoard[1][1] = null;
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 0, row: 2 };
      const result = validateElephantMove(customBoard, from, to);
      expect(result.isValid).toBe(true);
      expect(result.isCapture).toBe(true);
    });

    it('吃己方棋子应返回无效', () => {
      const customBoard = createInitialBoard();
      customBoard[0][2] = { type: PieceType.ELEPHANT, side: PlayerSide.BLACK, coord: { col: 2, row: 0 } };
      customBoard[2][0] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 0, row: 2 } };
      customBoard[1][1] = null;
      const from: BoardCoord = { col: 2, row: 0 };
      const to: BoardCoord = { col: 0, row: 2 };
      const result = validateElephantMove(customBoard, from, to);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('不能吃掉己方棋子');
    });
  });
});