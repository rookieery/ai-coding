/**
 * Unit tests for Threat Detector
 * Tests critical move detection for Gomoku AI
 */

import { findCriticalMove, findCriticalMoveFromNumeric } from './threatDetector';
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

describe('Threat Detector', () => {
  describe('findCriticalMove - AI Win Detection', () => {
    it('should detect immediate win for black AI', () => {
      const board = createEmptyBoard();
      // Place 4 black pieces in a row
      board[7][5] = 'X';
      board[7][6] = 'X';
      board[7][7] = 'X';
      board[7][8] = 'X';

      const result = findCriticalMove(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('win');
      expect(result!.y).toBe(7);
      expect(result!.x === 4 || result!.x === 9).toBe(true);
    });

    it('should detect immediate win for white AI', () => {
      const board = createEmptyBoard();
      // Place 4 white pieces in a row
      board[7][5] = 'O';
      board[7][6] = 'O';
      board[7][7] = 'O';
      board[7][8] = 'O';

      const result = findCriticalMove(board, 'white');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('win');
      expect(result!.y).toBe(7);
      expect(result!.x === 4 || result!.x === 9).toBe(true);
    });

    it('should detect diagonal win', () => {
      const board = createEmptyBoard();
      // Place 4 black pieces diagonally
      board[5][5] = 'X';
      board[6][6] = 'X';
      board[7][7] = 'X';
      board[8][8] = 'X';

      const result = findCriticalMove(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('win');
      // Should complete at either end
      expect(
        (result!.y === 4 && result!.x === 4) || (result!.y === 9 && result!.x === 9)
      ).toBe(true);
    });
  });

  describe('findCriticalMove - Rush Four Blocking', () => {
    it('should block opponent rush four (blocked on one end)', () => {
      const board = createEmptyBoard();
      // AI is black, opponent is white
      // Place AI piece to block one end
      board[7][4] = 'X';
      // Place 4 white pieces
      board[7][5] = 'O';
      board[7][6] = 'O';
      board[7][7] = 'O';
      board[7][8] = 'O';

      const result = findCriticalMove(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('block-rush-four');
      expect(result!.y).toBe(7);
      expect(result!.x).toBe(9); // Block the open end
    });

    it('should block opponent open four (both ends open)', () => {
      const board = createEmptyBoard();
      // Place 4 white pieces with both ends open
      board[7][5] = 'O';
      board[7][6] = 'O';
      board[7][7] = 'O';
      board[7][8] = 'O';

      const result = findCriticalMove(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('block-rush-four');
      expect(result!.y).toBe(7);
      // Should block one of the ends
      expect(result!.x === 4 || result!.x === 9).toBe(true);
    });

    it('should block gap four pattern (O.OOO)', () => {
      const board = createEmptyBoard();
      // Create gap four: O.OOO
      board[7][5] = 'O';
      board[7][6] = '.';
      board[7][7] = 'O';
      board[7][8] = 'O';
      board[7][9] = 'O';

      const result = findCriticalMove(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('block-rush-four');
      expect(result!.y).toBe(7);
      expect(result!.x).toBe(6); // Block the gap
    });
  });

  describe('findCriticalMove - Live Three Blocking', () => {
    it('should block opponent live three (.OOO.)', () => {
      const board = createEmptyBoard();
      // Place 3 white pieces with both ends open
      board[7][6] = 'O';
      board[7][7] = 'O';
      board[7][8] = 'O';

      const result = findCriticalMove(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('block-live-three');
      expect(result!.y).toBe(7);
      // Should block one of the ends
      expect(result!.x === 5 || result!.x === 9).toBe(true);
    });

    it('should block gap live three (.O.OO.)', () => {
      const board = createEmptyBoard();
      // Create gap live three: .O.OO.
      board[7][6] = 'O';
      board[7][8] = 'O';
      board[7][9] = 'O';

      const result = findCriticalMove(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('block-live-three');
      expect(result!.y).toBe(7);
      expect(result!.x).toBe(7); // Block the gap
    });
  });

  describe('findCriticalMove - Priority Order', () => {
    it('should prioritize AI win over blocking threats', () => {
      const board = createEmptyBoard();
      // AI (black) has 4 in a row
      board[7][5] = 'X';
      board[7][6] = 'X';
      board[7][7] = 'X';
      board[7][8] = 'X';
      // Opponent (white) also has 4 in a row
      board[5][5] = 'O';
      board[5][6] = 'O';
      board[5][7] = 'O';
      board[5][8] = 'O';

      const result = findCriticalMove(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('win'); // AI should win, not block
      expect(result!.y).toBe(7);
    });

    it('should prioritize blocking rush four over live three', () => {
      const board = createEmptyBoard();
      // Opponent has rush four
      board[5][5] = 'O';
      board[5][6] = 'O';
      board[5][7] = 'O';
      board[5][8] = 'O';
      board[5][4] = 'X'; // Blocked on one end
      // Opponent also has live three elsewhere
      board[7][10] = 'O';
      board[7][11] = 'O';
      board[7][12] = 'O';

      const result = findCriticalMove(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('block-rush-four');
      expect(result!.y).toBe(5);
    });
  });

  describe('findCriticalMove - No Critical Move', () => {
    it('should return null when no critical move exists', () => {
      const board = createEmptyBoard();
      const result = findCriticalMove(board, 'black');
      expect(result).toBeNull();
    });

    it('should return null for scattered pieces', () => {
      const board = createEmptyBoard();
      board[3][3] = 'X';
      board[5][5] = 'O';
      board[7][7] = 'X';
      board[9][9] = 'O';

      const result = findCriticalMove(board, 'black');
      expect(result).toBeNull();
    });
  });

  describe('findCriticalMoveFromNumeric', () => {
    it('should work with numeric board format', () => {
      const board = createNumericEmptyBoard();
      // Place 4 black pieces (1 = black)
      board[7][5] = 1;
      board[7][6] = 1;
      board[7][7] = 1;
      board[7][8] = 1;

      const result = findCriticalMoveFromNumeric(board, 'black');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('win');
      expect(result!.r).toBe(7);
      expect(result!.c === 4 || result!.c === 9).toBe(true);
    });

    it('should convert white pieces correctly (2 = white)', () => {
      const board = createNumericEmptyBoard();
      // Place 4 white pieces (2 = white)
      board[7][5] = 2;
      board[7][6] = 2;
      board[7][7] = 2;
      board[7][8] = 2;

      const result = findCriticalMoveFromNumeric(board, 'white');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('win');
      expect(result!.r).toBe(7);
    });
  });
});
