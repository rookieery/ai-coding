import { describe, it, expect, beforeEach } from 'vitest';
import { isCheck, getCheckingPieces } from '../check';
import { isCheckmate, isStalemate, isLosing } from '../checkmate';
import { createInitialBoard } from '../../boardState';
import { PieceType, PlayerSide, BoardCoord } from '../../types';

describe('isCheck', () => {
  // 初始棋盘（黑方在顶部，红方在底部）
  let board = createInitialBoard();

  beforeEach(() => {
    // 每个测试前重置棋盘
    board = createInitialBoard();
  });

  describe('基本验证', () => {
    it('初始棋盘双方均未被将军', () => {
      expect(isCheck(board, PlayerSide.BLACK)).toBe(false);
      expect(isCheck(board, PlayerSide.RED)).toBe(false);
    });

    it('黑方将被红方车将军', () => {
      // 创建自定义棋盘：红方车在 (4,1)，黑方将在 (4,0)，中间无棋子
      const customBoard = createInitialBoard();
      // 清空黑方将前方的棋子（列4，行1-8）
      for (let row = 1; row <= 8; row++) {
        customBoard[row][4] = null;
      }
      // 将红方车放在 (4,1)
      customBoard[1][4] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 4, row: 1 } };
      // 黑方将被将军
      expect(isCheck(customBoard, PlayerSide.BLACK)).toBe(true);
      // 红方未被将军
      expect(isCheck(customBoard, PlayerSide.RED)).toBe(false);
    });

    it('红方将被黑方炮将军', () => {
      // 黑方炮在 (4,1)，红方将在 (4,9)，中间恰好有一个炮架（黑方兵）
      const customBoard = createInitialBoard();
      // 清空列4的行2-8，只保留一个炮架在 (4,5)（黑方兵）
      for (let row = 2; row <= 8; row++) {
        customBoard[row][4] = null;
      }
      // 放置黑方炮在 (4,1)
      customBoard[1][4] = { type: PieceType.CANNON, side: PlayerSide.BLACK, coord: { col: 4, row: 1 } };
      // 放置炮架（黑方兵）在 (4,5)
      customBoard[5][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 5 } };
      // 红方将被将军
      expect(isCheck(customBoard, PlayerSide.RED)).toBe(true);
      // 黑方未被将军
      expect(isCheck(customBoard, PlayerSide.BLACK)).toBe(false);
    });

    it('将军但中间有棋子阻挡应无效', () => {
      // 红方车在 (0,0)，黑方将在 (4,0)，中间有黑方兵在 (2,0) 阻挡
      const customBoard = createInitialBoard();
      // 清空第0行所有棋子
      for (let col = 0; col <= 8; col++) {
        customBoard[0][col] = null;
      }
      // 放置红方车在 (0,0)
      customBoard[0][0] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 0, row: 0 } };
      // 放置黑方将在 (4,0)
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      // 放置黑方兵在 (2,0) 阻挡
      customBoard[0][2] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 2, row: 0 } };
      // 黑方未被将军
      expect(isCheck(customBoard, PlayerSide.BLACK)).toBe(false);
    });

    it('将帅直接照面不算将军（中间无棋子）', () => {
      // 将帅在同一列，中间无棋子，但将帅不能直接照面，这不算将军（因为将/帅不能移动过去）
      const customBoard = createInitialBoard();
      // 清空列4的行1-8
      for (let row = 1; row <= 8; row++) {
        customBoard[row][4] = null;
      }
      // 黑方将在 (4,0)，红方将在 (4,9)
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      customBoard[9][4] = { type: PieceType.KING, side: PlayerSide.RED, coord: { col: 4, row: 9 } };
      // 双方均未被将军（因为将/帅不能直接攻击对方）
      expect(isCheck(customBoard, PlayerSide.BLACK)).toBe(false);
      expect(isCheck(customBoard, PlayerSide.RED)).toBe(false);
    });
  });

  describe('多子将军', () => {
    it('双车将军', () => {
      const customBoard = createInitialBoard();
      // 清空黑方将周围
      for (let row = 1; row <= 8; row++) {
        customBoard[row][4] = null;
      }
      // 红方车在 (4,1) 和 (3,0) 同时将军（横向和纵向）
      customBoard[1][4] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 4, row: 1 } };
      customBoard[0][3] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 3, row: 0 } };
      // 黑方被将军
      expect(isCheck(customBoard, PlayerSide.BLACK)).toBe(true);
    });

    it('马和炮同时将军', () => {
      // 黑方将在 (4,0)，红方马在 (2,1)，红方炮在 (4,2)，中间有炮架（黑方兵在 (4,1)）
      const customBoard = createInitialBoard();
      // 清空必要位置
      // 清除黑方将周围
      customBoard[0][4] = null;
      customBoard[1][4] = null;
      customBoard[2][4] = null;
      // 清除马腿位置 (3,1) 和 (2,0)
      customBoard[1][3] = null;
      customBoard[0][2] = null;
      // 放置黑方将在 (4,0)
      customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
      // 放置红方马在 (2,1)（可以将军）
      customBoard[1][2] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 2, row: 1 } };
      // 放置炮架（黑方兵）在 (4,1)
      customBoard[1][4] = { type: PieceType.PAWN, side: PlayerSide.BLACK, coord: { col: 4, row: 1 } };
      // 放置红方炮在 (4,2)
      customBoard[2][4] = { type: PieceType.CANNON, side: PlayerSide.RED, coord: { col: 4, row: 2 } };
      // 黑方被将军
      expect(isCheck(customBoard, PlayerSide.BLACK)).toBe(true);
    });
  });
});

describe('getCheckingPieces', () => {
  let board = createInitialBoard();

  beforeEach(() => {
    board = createInitialBoard();
  });

  it('初始棋盘无将军棋子', () => {
    expect(getCheckingPieces(board, PlayerSide.BLACK)).toHaveLength(0);
    expect(getCheckingPieces(board, PlayerSide.RED)).toHaveLength(0);
  });

  it('返回正在将军的棋子列表', () => {
    const customBoard = createInitialBoard();
    // 清空列4的行1-8
    for (let row = 1; row <= 8; row++) {
      customBoard[row][4] = null;
    }
    // 清空马腿位置 (3,1) 和 (2,0)
    customBoard[1][3] = null;
    customBoard[0][2] = null;
    // 红方车在 (4,1) 将军
    customBoard[1][4] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 4, row: 1 } };
    // 红方马在 (2,1) 同时将军（需要清空绊马腿）
    customBoard[1][2] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 2, row: 1 } };
    const checkingPieces = getCheckingPieces(customBoard, PlayerSide.BLACK);
    expect(checkingPieces).toHaveLength(2);
    expect(checkingPieces.map(p => p.type)).toContain(PieceType.ROOK);
    expect(checkingPieces.map(p => p.type)).toContain(PieceType.KNIGHT);
  });
});

describe('isCheckmate', () => {
  let board = createInitialBoard();

  beforeEach(() => {
    board = createInitialBoard();
  });

  it('初始棋盘不是将死', () => {
    expect(isCheckmate(board, PlayerSide.BLACK)).toBe(false);
    expect(isCheckmate(board, PlayerSide.RED)).toBe(false);
  });

  it('单车将死', () => {
    // 黑方将在 (4,0)，红方车在 (4,1) 将军，红方车在 (5,1) 保护，红方马在 (2,2) 攻击 (3,0)
    const customBoard = createInitialBoard();
    // 清空黑方将周围所有棋子
    for (let row = 0; row <= 2; row++) {
      for (let col = 3; col <= 5; col++) {
        customBoard[row][col] = null;
      }
    }
    // 清空马腿位置 (2,1)
    customBoard[1][2] = null;
    // 放置黑方将在 (4,0)
    customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
    // 红方车在 (4,1) 将军
    customBoard[1][4] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 4, row: 1 } };
    // 红方车在 (5,1) 保护 (4,1) 并攻击 (5,0)
    customBoard[1][5] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 5, row: 1 } };
    // 红方马在 (2,2) 攻击 (3,0)
    customBoard[2][2] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 2, row: 2 } };
    // 黑方被将死
    expect(isCheckmate(customBoard, PlayerSide.BLACK)).toBe(true);
  });

  it('被将军但有解不是将死', () => {
    // 黑方将在 (4,0)，红方车在 (4,1)，但黑方有士可以垫将
    const customBoard = createInitialBoard();
    // 清空黑方将前方 (4,1)
    customBoard[1][4] = null;
    // 红方车在 (4,2) 将军
    customBoard[2][4] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 4, row: 2 } };
    // 黑方士在 (3,1) 可以移动到 (4,1) 挡将
    customBoard[1][3] = { type: PieceType.ADVISOR, side: PlayerSide.BLACK, coord: { col: 3, row: 1 } };
    // 不是将死
    expect(isCheckmate(customBoard, PlayerSide.BLACK)).toBe(false);
  });
});

describe('isStalemate', () => {
  let board = createInitialBoard();

  beforeEach(() => {
    board = createInitialBoard();
  });

  it('初始棋盘不是困毙', () => {
    expect(isStalemate(board, PlayerSide.BLACK)).toBe(false);
    expect(isStalemate(board, PlayerSide.RED)).toBe(false);
  });

  it('困毙场景', () => {
    // 黑方将在 (4,0)，无任何合法移动，且未被将军
    const customBoard = createInitialBoard();
    // 清空黑方所有棋子，只保留将在 (4,0)
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        customBoard[row][col] = null;
      }
    }
    // 放置黑方将在 (4,0)
    customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
    // 红方马在 (2,2) 攻击 (3,0) 和 (4,1)（需清空绊马腿 (2,1) 和 (3,2)）
    customBoard[2][2] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 2, row: 2 } };
    customBoard[1][2] = null; // 马腿 (2,1)
    customBoard[2][3] = null; // 马腿 (3,2)
    // 红方马在 (4,3) 攻击 (3,1) 和 (5,1)（需清空绊马腿 (4,2)）
    customBoard[3][4] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 4, row: 3 } };
    customBoard[2][4] = null; // 马腿 (4,2)
    // 红方马在 (6,2) 攻击 (5,0)（需清空绊马腿 (6,1)）
    customBoard[2][6] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 6, row: 2 } };
    customBoard[1][6] = null; // 马腿 (6,1)
    // 红方将在 (4,9)（远离）
    customBoard[9][4] = { type: PieceType.KING, side: PlayerSide.RED, coord: { col: 4, row: 9 } };
    // 黑方将无法移动（所有相邻格子被攻击），且未被将军，属于困毙
    expect(isStalemate(customBoard, PlayerSide.BLACK)).toBe(true);
  });

  it('有合法移动不是困毙', () => {
    // 初始棋盘有合法移动
    expect(isStalemate(board, PlayerSide.BLACK)).toBe(false);
  });
});

describe('isLosing', () => {
  let board = createInitialBoard();

  beforeEach(() => {
    board = createInitialBoard();
  });

  it('将死时返回 true', () => {
    // 复用单车将死的棋盘（更新后）
    const customBoard = createInitialBoard();
    for (let row = 0; row <= 2; row++) {
      for (let col = 3; col <= 5; col++) {
        customBoard[row][col] = null;
      }
    }
    customBoard[1][2] = null; // 马腿位置
    customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
    customBoard[1][4] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 4, row: 1 } };
    customBoard[1][5] = { type: PieceType.ROOK, side: PlayerSide.RED, coord: { col: 5, row: 1 } };
    customBoard[2][2] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 2, row: 2 } };
    expect(isLosing(customBoard, PlayerSide.BLACK)).toBe(true);
  });

  it('困毙时返回 true', () => {
    // 复用困毙场景的棋盘（更新后）
    const customBoard = createInitialBoard();
    for (let row = 0; row < customBoard.length; row++) {
      for (let col = 0; col < customBoard[row].length; col++) {
        customBoard[row][col] = null;
      }
    }
    // 放置黑方将在 (4,0)
    customBoard[0][4] = { type: PieceType.KING, side: PlayerSide.BLACK, coord: { col: 4, row: 0 } };
    // 红方马在 (2,2) 攻击 (3,0) 和 (4,1)（需清空绊马腿 (2,1) 和 (3,2)）
    customBoard[2][2] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 2, row: 2 } };
    customBoard[1][2] = null; // 马腿 (2,1)
    customBoard[2][3] = null; // 马腿 (3,2)
    // 红方马在 (4,3) 攻击 (3,1) 和 (5,1)（需清空绊马腿 (4,2)）
    customBoard[3][4] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 4, row: 3 } };
    customBoard[2][4] = null; // 马腿 (4,2)
    // 红方马在 (6,2) 攻击 (5,0)（需清空绊马腿 (6,1)）
    customBoard[2][6] = { type: PieceType.KNIGHT, side: PlayerSide.RED, coord: { col: 6, row: 2 } };
    customBoard[1][6] = null; // 马腿 (6,1)
    // 红方将在 (4,9)（远离）
    customBoard[9][4] = { type: PieceType.KING, side: PlayerSide.RED, coord: { col: 4, row: 9 } };
    // 黑方困毙
    expect(isLosing(customBoard, PlayerSide.BLACK)).toBe(true);
  });

  it('未被将死且未困毙时返回 false', () => {
    expect(isLosing(board, PlayerSide.BLACK)).toBe(false);
  });
});