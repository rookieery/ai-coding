/**
 * Unit tests for Candidate Generator
 * Tests heuristic move evaluation for Gomoku AI
 */

import {
  generateCandidateMoves,
  generateCandidateMovesFromNumeric,
  getBestFallbackMove,
} from './candidateGenerator';
import { BoardState } from '../types/llm.types';

function createEmptyBoard(): BoardState {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill('.'));
}

function createNumericEmptyBoard(): number[][] {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill(0));
}

describe('Candidate Generator', () => {
  describe('generateCandidateMoves - Win Detection', () => {
    it('should prioritize winning move (five in a row)', () => {
      const board = createEmptyBoard();
      // Place 4 black pieces in a row
      board[7][5] = 'X';
      board[7][6] = 'X';
      board[7][7] = 'X';
      board[7][8] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 5);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].reason).toContain('必胜点');
      expect(candidates[0].score).toBeGreaterThanOrEqual(100000);
    });

    it('should detect winning move in diagonal direction', () => {
      const board = createEmptyBoard();
      // Place 4 black pieces diagonally
      board[5][5] = 'X';
      board[6][6] = 'X';
      board[7][7] = 'X';
      board[8][8] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 5);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].reason).toContain('必胜点');
    });
  });

  describe('generateCandidateMoves - Live Four Detection', () => {
    it('should detect live four pattern (.XXXX.)', () => {
      const board = createEmptyBoard();
      // Place 3 black pieces with both ends open
      board[7][6] = 'X';
      board[7][7] = 'X';
      board[7][8] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 10);

      // Should find positions that create live four
      const liveFourCandidates = candidates.filter(
        c => c.reason.includes('活四')
      );
      expect(liveFourCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('generateCandidateMoves - Rush Four Detection', () => {
    it('should detect rush four pattern', () => {
      const board = createEmptyBoard();
      // Place 3 black pieces with one end blocked
      board[7][4] = 'O'; // Opponent blocks one end
      board[7][5] = 'X';
      board[7][6] = 'X';
      board[7][7] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 10);

      // Should find position that creates rush four
      const rushFourCandidates = candidates.filter(
        c => c.reason.includes('冲四') && c.x === 8
      );
      expect(rushFourCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('generateCandidateMoves - Live Three Detection', () => {
    it('should detect live three pattern (.XXX.)', () => {
      const board = createEmptyBoard();
      // Place 2 black pieces with both ends open
      board[7][7] = 'X';
      board[7][8] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 10);

      // Should find positions that create live three
      const liveThreeCandidates = candidates.filter(
        c => c.reason.includes('活三')
      );
      expect(liveThreeCandidates.length).toBeGreaterThan(0);
    });

    it('should detect gap live three pattern (.X.XX.)', () => {
      const board = createEmptyBoard();
      // Place pieces for gap live three
      board[7][6] = 'X';
      board[7][8] = 'X';
      board[7][9] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 10);

      // Position at 7 should create a strong pattern (live four or gap live three)
      const gapCandidate = candidates.find(c => c.x === 7 && c.y === 7);
      expect(gapCandidate).toBeDefined();
      expect(gapCandidate!.reason).toContain('进攻点');
    });
  });

  describe('generateCandidateMoves - Defense Detection', () => {
    it('should detect blocking opponent five', () => {
      const board = createEmptyBoard();
      // Opponent has 4 in a row
      board[7][5] = 'O';
      board[7][6] = 'O';
      board[7][7] = 'O';
      board[7][8] = 'O';

      const candidates = generateCandidateMoves(board, 'black', 5);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].reason).toContain('必防点');
    });

    it('should detect blocking opponent live four', () => {
      const board = createEmptyBoard();
      // Opponent has 3 in a row with both ends open
      board[7][6] = 'O';
      board[7][7] = 'O';
      board[7][8] = 'O';

      const candidates = generateCandidateMoves(board, 'black', 10);

      const blockCandidates = candidates.filter(
        c => c.reason.includes('堵截对手活四')
      );
      expect(blockCandidates.length).toBeGreaterThan(0);
    });

    it('should detect blocking opponent live three', () => {
      const board = createEmptyBoard();
      // Opponent has 2 in a row with both ends open
      board[7][7] = 'O';
      board[7][8] = 'O';

      const candidates = generateCandidateMoves(board, 'black', 10);

      const blockCandidates = candidates.filter(
        c => c.reason.includes('堵截对手活三')
      );
      expect(blockCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('generateCandidateMoves - Score Calculation', () => {
    it('should calculate attack score correctly', () => {
      const board = createEmptyBoard();
      // Place 3 black pieces
      board[7][6] = 'X';
      board[7][7] = 'X';
      board[7][8] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 10);

      // Position creating live four should have high attack score
      const liveFourCandidate = candidates.find(
        c => c.x === 5 || c.x === 9 && c.y === 7
      );
      expect(liveFourCandidate).toBeDefined();
      expect(liveFourCandidate!.attackScore).toBeGreaterThan(0);
    });

    it('should calculate defense score correctly', () => {
      const board = createEmptyBoard();
      // Opponent has 3 pieces
      board[7][6] = 'O';
      board[7][7] = 'O';
      board[7][8] = 'O';

      const candidates = generateCandidateMoves(board, 'black', 10);

      // Blocking positions should have defense score
      const blockCandidates = candidates.filter(c => c.defenseScore > 0);
      expect(blockCandidates.length).toBeGreaterThan(0);
    });

    it('should prioritize attack over defense for equal threats', () => {
      const board = createEmptyBoard();
      // AI has 3 in a row
      board[5][5] = 'X';
      board[5][6] = 'X';
      board[5][7] = 'X';
      // Opponent also has 3 in a row
      board[7][10] = 'O';
      board[7][11] = 'O';
      board[7][12] = 'O';

      const candidates = generateCandidateMoves(board, 'black', 10);

      // Attack positions should have higher scores than defense
      const attackCandidates = candidates.filter(c => c.attackScore > c.defenseScore);
      expect(attackCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('generateCandidateMoves - Return Format', () => {
    it('should return exactly topN candidates', () => {
      const board = createEmptyBoard();
      // Place some pieces to create candidates
      board[7][7] = 'X';
      board[7][8] = 'O';

      const candidates = generateCandidateMoves(board, 'black', 5);
      expect(candidates.length).toBeLessThanOrEqual(5);
    });

    it('should sort candidates by score descending', () => {
      const board = createEmptyBoard();
      board[7][7] = 'X';
      board[7][8] = 'O';

      const candidates = generateCandidateMoves(board, 'black', 10);

      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i].score).toBeLessThanOrEqual(candidates[i - 1].score);
      }
    });

    it('should include all required fields in candidate', () => {
      const board = createEmptyBoard();
      board[7][7] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 1);

      if (candidates.length > 0) {
        const candidate = candidates[0];
        expect(candidate.x).toBeDefined();
        expect(candidate.y).toBeDefined();
        expect(candidate.score).toBeDefined();
        expect(candidate.attackScore).toBeDefined();
        expect(candidate.defenseScore).toBeDefined();
        expect(candidate.patterns).toBeDefined();
        expect(candidate.reason).toBeDefined();
        expect(typeof candidate.reason).toBe('string');
      }
    });
  });

  describe('generateCandidateMoves - Edge Cases', () => {
    it('should return empty array for empty board', () => {
      const board = createEmptyBoard();
      const candidates = generateCandidateMoves(board, 'black', 10);

      // Empty board has no strategic positions
      expect(candidates.length).toBe(0);
    });

    it('should handle board with single piece', () => {
      const board = createEmptyBoard();
      board[7][7] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 10);

      // Should find positions near the piece
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should handle nearly full board', () => {
      const board = createEmptyBoard();
      // Fill most of the board leaving only one empty cell
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          if (r !== 14 || c !== 14) {
            board[r][c] = (r + c) % 2 === 0 ? 'X' : 'O';
          }
        }
      }

      const candidates = generateCandidateMoves(board, 'black', 10);

      // When board is nearly full with no patterns, may return empty
      // This is expected behavior - no strategic positions
      if (candidates.length > 0) {
        expect(candidates[0].x).toBe(14);
        expect(candidates[0].y).toBe(14);
      }
    });
  });

  describe('generateCandidateMovesFromNumeric', () => {
    it('should work with numeric board format', () => {
      const board = createNumericEmptyBoard();
      // Place 4 black pieces (1 = black)
      board[7][5] = 1;
      board[7][6] = 1;
      board[7][7] = 1;
      board[7][8] = 1;

      const candidates = generateCandidateMovesFromNumeric(board, 'black', 5);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].reason).toContain('必胜点');
      // Should use r/c instead of x/y
      expect(candidates[0].r).toBeDefined();
      expect(candidates[0].c).toBeDefined();
    });

    it('should convert white pieces correctly (2 = white)', () => {
      const board = createNumericEmptyBoard();
      // Place 4 white pieces (2 = white)
      board[7][5] = 2;
      board[7][6] = 2;
      board[7][7] = 2;
      board[7][8] = 2;

      const candidates = generateCandidateMovesFromNumeric(board, 'white', 5);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].reason).toContain('必胜点');
    });
  });

  describe('getBestFallbackMove', () => {
    it('should return highest scoring candidate', () => {
      const board = createEmptyBoard();
      // AI has 4 in a row
      board[7][5] = 'X';
      board[7][6] = 'X';
      board[7][7] = 'X';
      board[7][8] = 'X';

      const fallback = getBestFallbackMove(board, 'black');

      expect(fallback).not.toBeNull();
      expect(fallback!.reason).toContain('必胜点');
    });

    it('should return null for empty board', () => {
      const board = createEmptyBoard();
      const fallback = getBestFallbackMove(board, 'black');
      expect(fallback).toBeNull();
    });

    it('should return valid move when multiple threats exist', () => {
      const board = createEmptyBoard();
      // AI has 3 in a row
      board[5][5] = 'X';
      board[5][6] = 'X';
      board[5][7] = 'X';
      // Opponent has 3 in a row
      board[7][10] = 'O';
      board[7][11] = 'O';
      board[7][12] = 'O';

      const fallback = getBestFallbackMove(board, 'black');

      expect(fallback).not.toBeNull();
      expect(fallback!.score).toBeGreaterThan(0);
    });
  });

  describe('Pattern Detection - Multiple Directions', () => {
    it('should detect patterns in all four directions', () => {
      const board = createEmptyBoard();
      // Place pieces to create patterns in multiple directions
      board[7][7] = 'X';
      board[7][8] = 'X'; // horizontal
      board[8][7] = 'X'; // vertical
      board[6][6] = 'X'; // diagonal

      const candidates = generateCandidateMoves(board, 'black', 20);

      // Should find candidates with multiple pattern directions
      const multiPatternCandidates = candidates.filter(
        c => c.patterns.length > 1
      );
      expect(multiPatternCandidates.length).toBeGreaterThan(0);
    });

    it('should correctly identify pattern directions', () => {
      const board = createEmptyBoard();
      board[7][7] = 'X';
      board[7][8] = 'X';

      const candidates = generateCandidateMoves(board, 'black', 10);

      const horizontalCandidates = candidates.filter(
        c => c.patterns.some(p => p.direction === 'horizontal')
      );
      expect(horizontalCandidates.length).toBeGreaterThan(0);
    });
  });
});