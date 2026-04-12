import { describe, it, expect, beforeEach } from 'vitest';
import { getLegalMovesForPiece } from '../engine';
import { createInitialBoard } from '../boardState';
import { PieceType, PlayerSide, BoardCoord } from '../types';

describe('getLegalMovesForPiece', () => {
  // 初始棋盘（黑方在顶部，红方在底部）
  let board = createInitialBoard();

  beforeEach(() => {
    board = createInitialBoard();
  });

  describe('基本验证', () => {
    it('空位置应返回空数组', () => {
      const coord: BoardCoord = { col: 4, row: 4 }; // 空位置
      const moves = getLegalMovesForPiece(board, coord);
      expect(moves).toEqual([]);
    });

    it('坐标超出棋盘应返回空数组', () => {
      const coord: BoardCoord = { col: -1, row: 0 };
      const moves = getLegalMovesForPiece(board, coord);
      expect(moves).toEqual([]);
    });
  });

  describe('车 (Rook) 的合法移动', () => {
    it('黑方车在初始位置可以向下移动两格', () => {
      // 黑方车在 (0,0)，右侧有黑方马阻挡，左侧无路，下方有空格
      // 可以向下移动两格（row 1 和 row 2），因为 row 3 有己方兵阻挡
      const coord: BoardCoord = { col: 0, row: 0 };
      const moves = getLegalMovesForPiece(board, coord);
      // 可以移动到 (0,1) 和 (0,2)
      expect(moves).toHaveLength(2);
      expect(moves).toContainEqual({ col: 0, row: 1 });
      expect(moves).toContainEqual({ col: 0, row: 2 });
    });

    it('清除阻挡后车可以水平移动', () => {
      // 创建自定义棋盘，只有黑方车在 (0,0)，下方有己方兵阻挡垂直移动，右侧清空
      const customBoard = createInitialBoard();
      // 清空整个棋盘
      for (let row = 0; row < customBoard.length; row++) {
        for (let col = 0; col < customBoard[row].length; col++) {
          customBoard[row][col] = null;
        }
      }
      // 放置黑方车在 (0,0)
      customBoard[0][0] = { type: PieceType.ROOK, side: PlayerSide.BLACK, coord: { col: 0, row: 0 } };
      // 在 (0,1) 放置黑方兵，阻挡垂直移动
      customBoard[1][0] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 0, row: 1 } };
      const coord: BoardCoord = { col: 0, row: 0 };
      const moves = getLegalMovesForPiece(customBoard, coord);
      // 可以向右移动至 (1,0)、(2,0)、(3,0)、(4,0)... (8,0)，但不能超过棋盘边界
      // 因为左侧是边界，不能向左；下方被己方兵阻挡；上方超出棋盘
      expect(moves).toContainEqual({ col: 1, row: 0 });
      expect(moves).toContainEqual({ col: 2, row: 0 });
      expect(moves).toContainEqual({ col: 3, row: 0 });
      expect(moves).toContainEqual({ col: 4, row: 0 });
      expect(moves).toContainEqual({ col: 5, row: 0 });
      expect(moves).toContainEqual({ col: 6, row: 0 });
      expect(moves).toContainEqual({ col: 7, row: 0 });
      expect(moves).toContainEqual({ col: 8, row: 0 });
      // 不能向左（超出棋盘）
      expect(moves).not.toContainEqual({ col: -1, row: 0 });
      // 不能垂直移动
      expect(moves).not.toContainEqual({ col: 0, row: 1 });
    });

    it('车可以吃对方棋子', () => {
      const customBoard = createInitialBoard();
      // 黑方车放在 (4,4)，红方兵放在 (4,6)，中间清空
      customBoard[4][4] = { type: PieceType.ROOK, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      customBoard[6][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 6 } };
      customBoard[5][4] = null;
      const coord: BoardCoord = { col: 4, row: 4 };
      const moves = getLegalMovesForPiece(customBoard, coord);
      expect(moves).toContainEqual({ col: 4, row: 6 });
    });

    it('车不能吃己方棋子', () => {
      const customBoard = createInitialBoard();
      // 黑方车放在 (4,4)，黑方马放在 (4,5)
      customBoard[4][4] = { type: PieceType.ROOK, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      customBoard[5][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 5 } };
      const coord: BoardCoord = { col: 4, row: 4 };
      const moves = getLegalMovesForPiece(customBoard, coord);
      expect(moves).not.toContainEqual({ col: 4, row: 5 });
    });
  });

  describe('马 (Knight) 的合法移动', () => {
    it('马在空旷位置有8个可能移动（不考虑绊马腿）', () => {
      const customBoard = createInitialBoard();
      // 清空棋盘，放置黑方马在 (4,4)
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
          customBoard[row][col] = null;
        }
      }
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      const coord: BoardCoord = { col: 4, row: 4 };
      const moves = getLegalMovesForPiece(customBoard, coord);
      // 马可以跳到的8个位置（日字）
      const expected = [
        { col: 3, row: 2 }, { col: 5, row: 2 },
        { col: 2, row: 3 }, { col: 6, row: 3 },
        { col: 2, row: 5 }, { col: 6, row: 5 },
        { col: 3, row: 6 }, { col: 5, row: 6 },
      ];
      expect(moves).toHaveLength(expected.length);
      expected.forEach(pos => {
        expect(moves).toContainEqual(pos);
      });
    });

    it('绊马腿阻挡移动', () => {
      const customBoard = createInitialBoard();
      // 清空棋盘，放置黑方马在 (4,4)，正上方 (4,3) 有棋子（绊马腿）
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
          customBoard[row][col] = null;
        }
      }
      customBoard[4][4] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 4, row: 4 } };
      customBoard[3][4] = { type: PieceType.PAWN, side: PlayerSide.RED, coord: { col: 4, row: 3 } };
      const coord: BoardCoord = { col: 4, row: 4 };
      const moves = getLegalMovesForPiece(customBoard, coord);
      // 被绊马腿，不能跳到 (3,2) 和 (5,2)
      expect(moves).not.toContainEqual({ col: 3, row: 2 });
      expect(moves).not.toContainEqual({ col: 5, row: 2 });
      // 其他方向仍可跳
      expect(moves).toContainEqual({ col: 2, row: 3 });
    });
  });

  describe('将 (King) 的合法移动', () => {
    it('将在九宫格内可以移动一步', () => {
      const customBoard = createInitialBoard();
      // 清空棋盘，放置黑方将在 (4,0)（初始位置）
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
          customBoard[row][col] = null;
        }
      }
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      const coord: BoardCoord = { col: 4, row: 0 };
      const moves = getLegalMovesForPiece(customBoard, coord);
      // 九宫格内可移动的位置: (3,0), (5,0), (4,1)
      const expected = [
        { col: 3, row: 0 }, { col: 5, row: 0 },
        { col: 4, row: 1 },
      ];
      expect(moves).toHaveLength(expected.length);
      expected.forEach(pos => {
        expect(moves).toContainEqual(pos);
      });
    });

    it('将不能移动到九宫格外', () => {
      const customBoard = createInitialBoard();
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      const coord: BoardCoord = { col: 4, row: 0 };
      const moves = getLegalMovesForPiece(customBoard, coord);
      moves.forEach(move => {
        const inPalace = [3,4,5].includes(move.col) && [0,1,2].includes(move.row);
        expect(inPalace).toBe(true);
      });
    });
  });

  describe('将军约束', () => {
    it('移动后导致己方被将军的移动应被过滤', () => {
      // 构造一个局面：黑方将被红方车将军，黑方马可以移动到阻挡位置，但移动后仍被将军？
      // 简化：黑方将位于 (4,0)，红方车位于 (4,5)，中间无棋子，将军。
      // 黑方士位于 (3,1)，可以移动到 (4,1) 阻挡，但移动后是否解除将军？
      // 我们测试移动后仍被将军的情况：移动士到另一个位置，仍被将军，该移动应被过滤。
      // 这里我们使用一个更简单的场景：黑方将，红方车在同一列，黑方车在中间，移动黑方车导致将军。
      const customBoard = createInitialBoard();
      // 清空棋盘
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
          customBoard[row][col] = null;
        }
      }
      // 黑方将 (4,0)
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      // 红方车 (4,5) 将军
      customBoard[5][4] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 4, row: 5 } };
      // 黑方车 (4,2) 在中间，可以移动，但移动后黑方将被将军（因为红车直接攻击）
      customBoard[2][4] = { type: PieceType.ROOK, side: PlayerSide.BLACK, coord: { col: 4, row: 2 } };
      const coord: BoardCoord = { col: 4, row: 2 };
      const moves = getLegalMovesForPiece(customBoard, coord);
      // 黑方车不能离开这一列，因为移动后将军仍然存在（红车直接攻击将）
      // 实际上任何移动都会导致将军，所以合法移动应该为空（除非移动后阻挡红车）
      // 黑方车可以移动到 (4,3) 或 (4,4) 阻挡红车？但红车在 (4,5)，中间有空格。
      // 移动黑方车到 (4,3) 会阻挡红车，解除将军，所以这个移动应该是合法的。
      // 我们需要验证 (4,3) 在合法移动中
      expect(moves).toContainEqual({ col: 4, row: 3 });
      expect(moves).toContainEqual({ col: 4, row: 4 });
      // 不能移动到其他列，因为那样红车仍然将军
      moves.forEach(move => {
        expect(move.col).toBe(4); // 只能在同一列
      });
    });
  });
});