import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateMoveResult } from '../gameLogic';
import { createInitialBoard, movePiece } from '../boardState';
import { PieceType, PlayerSide, type BoardState } from '../types';

describe('evaluateMoveResult', () => {
  let board: BoardState;

  beforeEach(() => {
    board = createInitialBoard();
  });

  describe('基本移动', () => {
    it('普通移动（非吃子）应返回正确状态', () => {
      // 红方兵向前移动一步（非吃子）
      const from = { col: 4, row: 6 };
      const to = { col: 4, row: 5 };
      board = movePiece(board, from, to);
      const result = evaluateMoveResult(board, PlayerSide.RED, false);

      expect(result.capture).toBe(false);
      expect(result.check).toBe(false);
      expect(result.checkmate).toBe(false);
      expect(result.stalemate).toBe(false);
      expect(result.gameOver).toBe(false);
    });

    it('吃子移动应返回 capture=true', () => {
      // 构造吃子局面：红方车吃黑方马，黑方将存在
      board = Array(10).fill(null).map(() => Array(9).fill(null));
      // 红方车在 (0, 0)
      board[0][0] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 0, row: 0 } };
      // 黑方马在 (0, 1)
      board[1][0] = { type: PieceType.KNIGHT, side: PlayerSide.BLACK, coord: { col: 0, row: 1 } };
      // 黑方将在 (4, 0) - 必须存在，否则游戏结束
      board[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      // 移动红方车吃黑方马
      const from = { col: 0, row: 0 };
      const to = { col: 0, row: 1 };
      board = movePiece(board, from, to);
      const result = evaluateMoveResult(board, PlayerSide.RED, true);

      expect(result.capture).toBe(true);
      expect(result.check).toBe(false); // 未将军
      expect(result.checkmate).toBe(false);
      expect(result.stalemate).toBe(false);
      expect(result.gameOver).toBe(false);
    });
  });

  describe('将军检测', () => {
    it('应将局面应返回 check=true', () => {
      // 构造将军局面：红方车将军黑方将，中间无阻挡
      board = Array(10).fill(null).map(() => Array(9).fill(null));
      // 红方车在 (0, 0)
      board[0][0] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 0, row: 0 } };
      // 黑方将在 (0, 9) - 注意：黑方将在顶部，行0-2；红方在底部，行7-9。这里为了简单，放在行9（红方底线）但将只能在自己的九宫移动。我们放在合法位置 (4,0)
      // 重新调整：黑方将在 (4,0)，红方车在 (4,8) 将军
      board = Array(10).fill(null).map(() => Array(9).fill(null));
      board[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      board[8][4] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 4, row: 8 } };
      // 移动红方车到 (4,1) 将军（未吃子）
      const from = { col: 4, row: 8 };
      const to = { col: 4, row: 1 };
      board = movePiece(board, from, to);
      const result = evaluateMoveResult(board, PlayerSide.RED, false);

      expect(result.check).toBe(true);
      expect(result.checkmate).toBe(false); // 黑方可能还有移动
      expect(result.gameOver).toBe(false);
    });
  });

  describe('绝杀检测', () => {
    it('绝杀局面应返回 checkmate=true 和 gameOver=true', () => {
      // 构造绝杀局面：红方双车将死黑方将
      board = Array(10).fill(null).map(() => Array(9).fill(null));
      // 黑方将在 (4,0)
      board[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      // 红方车在 (3,0) 和 (5,0) 将军，黑方将无法移动
      board[0][3] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 3, row: 0 } };
      board[0][5] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 5, row: 0 } };
      // 红方刚移动完，将军
      const result = evaluateMoveResult(board, PlayerSide.RED, false);

      expect(result.check).toBe(true);
      expect(result.checkmate).toBe(true);
      expect(result.gameOver).toBe(true);
    });
  });

  describe('困毙检测', () => {
    it('困毙局面应返回 stalemate=true 和 gameOver=true', () => {
      // 构造困毙局面：黑方将无子可动且未被将军
      board = Array(10).fill(null).map(() => Array(9).fill(null));
      board[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      // 红方车放在 (5,1)，控制黑方将的移动
      board[1][5] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 5, row: 1 } };
      // 红方刚移动完，轮到黑方走棋
      const result = evaluateMoveResult(board, PlayerSide.RED, false);

      expect(result.check).toBe(false);
      expect(result.stalemate).toBe(true);
      expect(result.gameOver).toBe(true);
    });
  });
});