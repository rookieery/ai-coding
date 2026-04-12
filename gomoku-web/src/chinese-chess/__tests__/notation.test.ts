import { describe, it, expect } from 'vitest';
import { moveToNotation, movesToNotations } from '../notation';
import { MoveHistory, PlayerSide, PieceType } from '../types';

describe('中国象棋记谱法', () => {
  describe('moveToNotation', () => {
    it('红方炮平移动', () => {
      const move: MoveHistory = {
        from: { col: 1, row: 9 }, // 红方炮初始位置 (col 1, row 9)
        to: { col: 4, row: 9 },   // 平移到 col 4
        piece: PieceType.CANNON,
        side: PlayerSide.RED,
        timestamp: Date.now(),
      };

      const notation = moveToNotation(move);
      // 红方炮，col 1 对应“八”（从右到左：0=九, 1=八, 2=七, ...）
      // 平移动，目标列 col 4 对应“五”
      // 期望结果：pieceRedCannon八平五
      expect(notation).toBe('pieceRedCannon八平五');
    });

    it('黑方马前进', () => {
      const move: MoveHistory = {
        from: { col: 1, row: 0 }, // 黑方马初始位置 (col 1, row 0)
        to: { col: 2, row: 2 },   // 马跳日字
        piece: PieceType.KNIGHT,
        side: PlayerSide.BLACK,
        timestamp: Date.now(),
      };

      const notation = moveToNotation(move);
      // 黑方马，col 1 对应“2”（从左到右：0=1, 1=2, 2=3, ...）
      // 纵向移动，方向为“进”（黑方向前是 row 增加）
      // 列不同，返回目标列名称 col 2 对应“3”
      // 期望结果：pieceBlackKnight2进3
      expect(notation).toBe('pieceBlackKnight2进3');
    });

    it('红方兵前进（同列）', () => {
      const move: MoveHistory = {
        from: { col: 0, row: 6 }, // 红方兵过河前位置 (col 0, row 6)
        to: { col: 0, row: 5 },   // 向前移动一步
        piece: PieceType.PAWN,
        side: PlayerSide.RED,
        timestamp: Date.now(),
      };

      const notation = moveToNotation(move);
      // 红方兵，col 0 对应“九”
      // 纵向移动，方向为“进”（红方向前是 row 减小）
      // 同列，返回步数 1
      // 期望结果：pieceRedPawn九进1
      expect(notation).toBe('pieceRedPawn九进1');
    });

    it('黑方车后退', () => {
      const move: MoveHistory = {
        from: { col: 8, row: 2 }, // 黑方车位置
        to: { col: 8, row: 0 },   // 向后移动两步
        piece: PieceType.ROOK,
        side: PlayerSide.BLACK,
        timestamp: Date.now(),
      };

      const notation = moveToNotation(move);
      // 黑方车，col 8 对应“9”
      // 纵向移动，方向为“退”（黑方向后是 row 减小）
      // 同列，返回步数 2
      // 期望结果：pieceBlackRook9退2
      expect(notation).toBe('pieceBlackRook9退2');
    });

    it('红方士斜向移动', () => {
      const move: MoveHistory = {
        from: { col: 3, row: 9 }, // 红方士初始位置
        to: { col: 4, row: 8 },   // 斜向移动
        piece: PieceType.ADVISOR,
        side: PlayerSide.RED,
        timestamp: Date.now(),
      };

      const notation = moveToNotation(move);
      // 红方士，col 3 对应“六”
      // 列不同，纵向移动，方向为“进”（row 减小）
      // 目标列 col 4 对应“五”
      // 期望结果：pieceRedAdvisor六进五
      expect(notation).toBe('pieceRedAdvisor六进五');
    });

    it('黑方将横向移动', () => {
      const move: MoveHistory = {
        from: { col: 4, row: 0 }, // 黑方将初始位置
        to: { col: 5, row: 0 },   // 横向移动
        piece: PieceType.KING,
        side: PlayerSide.BLACK,
        timestamp: Date.now(),
      };

      const notation = moveToNotation(move);
      // 黑方将，col 4 对应“5”
      // 横向移动，方向为“平”
      // 目标列 col 5 对应“6”
      // 期望结果：pieceBlackKing5平6
      expect(notation).toBe('pieceBlackKing5平6');
    });
  });

  describe('movesToNotations', () => {
    it('批量转换移动历史', () => {
      const moves: MoveHistory[] = [
        {
          from: { col: 1, row: 9 },
          to: { col: 4, row: 9 },
          piece: PieceType.CANNON,
          side: PlayerSide.RED,
          timestamp: Date.now(),
        },
        {
          from: { col: 1, row: 0 },
          to: { col: 2, row: 2 },
          piece: PieceType.KNIGHT,
          side: PlayerSide.BLACK,
          timestamp: Date.now(),
        },
      ];

      const notations = movesToNotations(moves);
      expect(notations).toHaveLength(2);
      expect(notations[0]).toBe('pieceRedCannon八平五');
      expect(notations[1]).toBe('pieceBlackKnight2进3');
    });
  });

  // 测试列坐标映射
  describe('列坐标映射', () => {
    it('红方列映射正确', () => {
      // 测试一些关键点
      // col 0 -> 九
      // col 4 -> 五
      // col 8 -> 一
      // 我们无法直接测试内部函数，但可以通过移动测试
      const move1: MoveHistory = {
        from: { col: 0, row: 9 },
        to: { col: 0, row: 8 },
        piece: PieceType.PAWN,
        side: PlayerSide.RED,
        timestamp: Date.now(),
      };
      expect(moveToNotation(move1)).toBe('pieceRedPawn九进1');

      const move2: MoveHistory = {
        from: { col: 4, row: 9 },
        to: { col: 4, row: 8 },
        piece: PieceType.PAWN,
        side: PlayerSide.RED,
        timestamp: Date.now(),
      };
      expect(moveToNotation(move2)).toBe('pieceRedPawn五进1');

      const move3: MoveHistory = {
        from: { col: 8, row: 9 },
        to: { col: 8, row: 8 },
        piece: PieceType.PAWN,
        side: PlayerSide.RED,
        timestamp: Date.now(),
      };
      expect(moveToNotation(move3)).toBe('pieceRedPawn一进1');
    });

    it('黑方列映射正确', () => {
      const move1: MoveHistory = {
        from: { col: 0, row: 0 },
        to: { col: 0, row: 1 },
        piece: PieceType.PAWN,
        side: PlayerSide.BLACK,
        timestamp: Date.now(),
      };
      expect(moveToNotation(move1)).toBe('pieceBlackPawn1进1');

      const move2: MoveHistory = {
        from: { col: 4, row: 0 },
        to: { col: 4, row: 1 },
        piece: PieceType.PAWN,
        side: PlayerSide.BLACK,
        timestamp: Date.now(),
      };
      expect(moveToNotation(move2)).toBe('pieceBlackPawn5进1');

      const move3: MoveHistory = {
        from: { col: 8, row: 0 },
        to: { col: 8, row: 1 },
        piece: PieceType.PAWN,
        side: PlayerSide.BLACK,
        timestamp: Date.now(),
      };
      expect(moveToNotation(move3)).toBe('pieceBlackPawn9进1');
    });
  });
});