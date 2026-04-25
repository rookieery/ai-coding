/**
 * Integration Tests for LLM AI Service
 * Tests the complete flow: threat interceptor -> candidate generator -> LLM -> fallback
 */

import { LLMAIService, validateMove } from '../services/llm-ai.service';
import { BoardState, LLMMoveRequest } from '../types/llm.types';

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('LLMAIService Integration', () => {
  let service: LLMAIService;

  beforeEach(() => {
    service = new LLMAIService({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com/v1',
      model: 'test-model',
      maxTokens: 500,
      temperature: 0.7,
    });
    mockFetch.mockReset();
  });

  describe('validateMove', () => {
    const emptyBoard: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));

    it('should validate a correct move', () => {
      const result = validateMove(emptyBoard, 'H8');
      expect(result.isValid).toBe(true);
      expect(result.x).toBe(7);
      expect(result.y).toBe(7);
    });

    it('should reject invalid coordinate format', () => {
      const result = validateMove(emptyBoard, 'Z99');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid coordinate format');
    });

    it('should reject out of bounds coordinate', () => {
      // Column P is out of bounds (A-O only)
      const result = validateMove(emptyBoard, 'P1');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid coordinate');
    });

    it('should reject occupied cell', () => {
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));
      board[7][7] = 'X';
      const result = validateMove(board, 'H8');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('already occupied');
    });
  });

  describe('Critical Move Interception', () => {
    it('should intercept winning move without calling LLM', async () => {
      // Board where AI (black/X) can win with one move
      // Place 4 black pieces in a row: columns 3,4,5,6 on row 7
      // Winning move is at column 2 (x=2) or column 7 (x=7)
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));
      board[7][3] = 'X';
      board[7][4] = 'X';
      board[7][5] = 'X';
      board[7][6] = 'X';

      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      expect(result.isFallback).toBe(true);
      expect(result.move.isValid).toBe(true);
      // Winning move should be at column 2 or 7 on row 7
      expect([2, 7]).toContain(result.move.x);
      expect(result.move.y).toBe(7);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should intercept blocking move for opponent rush four', async () => {
      // Board where opponent (white/O) has a rush four
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));
      // Place 4 white pieces with one end open
      board[7][3] = 'O';
      board[7][4] = 'O';
      board[7][5] = 'O';
      board[7][6] = 'O';
      board[7][2] = 'X'; // Block one end

      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      expect(result.isFallback).toBe(true);
      expect(result.move.isValid).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should intercept blocking move for opponent live three', async () => {
      // Board where opponent (white/O) has a live three
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));
      board[7][5] = 'O';
      board[7][6] = 'O';
      board[7][7] = 'O';

      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      expect(result.isFallback).toBe(true);
      expect(result.move.isValid).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Candidate Generator Fallback', () => {
    it('should use best candidate when LLM returns invalid JSON', async () => {
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));
      board[7][7] = 'X'; // Center occupied

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'This is not valid JSON' } }],
        }),
      });

      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      expect(result.isFallback).toBe(true);
      expect(result.move.isValid).toBe(true);
      expect(result.reason).toContain('Failed to parse LLM response');
    });

    it('should use best candidate when LLM returns occupied cell', async () => {
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));
      board[7][7] = 'X'; // Center occupied

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                move: 'H8', // Already occupied
                reason: 'Test',
              }),
            },
          }],
        }),
      });

      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      expect(result.isFallback).toBe(true);
      expect(result.move.isValid).toBe(true);
      expect(result.reason).toContain('LLM suggested invalid move');
    });

    it('should use best candidate when LLM chooses non-candidate position', async () => {
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));
      board[7][7] = 'X'; // Center occupied

      // LLM returns a valid but strategically poor position
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                move: 'A1', // Corner - likely not in top candidates
                reason: 'Test',
              }),
            },
          }],
        }),
      });

      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      // Should fallback to best candidate since A1 is not in the candidate list
      expect(result.isFallback).toBe(true);
      expect(result.move.isValid).toBe(true);
    });

    it('should use best candidate when API call fails', async () => {
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));
      board[7][7] = 'X'; // Center occupied

      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      expect(result.isFallback).toBe(true);
      expect(result.move.isValid).toBe(true);
      expect(result.reason).toContain('API Error');
    });
  });

  describe('Successful LLM Response', () => {
    it('should accept valid LLM move from candidate list', async () => {
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));
      board[7][7] = 'X'; // Center occupied by black
      board[7][8] = 'X'; // Adjacent

      // Mock LLM to return a strategically good move
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                situation_analysis: {
                  my_threats: ['活三威胁'],
                  opponent_threats: [],
                  strategy: '进攻',
                },
                move: 'H9', // Should be in candidate list
                candidate_index: 1,
                reason: '扩展活三',
              }),
            },
          }],
        }),
      });

      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      expect(result.isFallback).toBe(false);
      expect(result.move.isValid).toBe(true);
      expect(result.situation_analysis).toBeDefined();
      expect(result.situation_analysis?.strategy).toBe('进攻');
    });
  });

  describe('Empty Board Handling', () => {
    it('should handle empty board without critical moves', async () => {
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('.'));

      // On empty board, no candidates are generated (no patterns to detect)
      // So the service falls back to random empty position
      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      // Should get a valid move (random fallback)
      expect(result.move.isValid).toBe(true);
      expect(result.isFallback).toBe(true);
      expect(result.reason).toContain('No strategic positions');
    });
  });

  describe('Full Board Edge Case', () => {
    it('should handle full board gracefully', async () => {
      const board: BoardState = Array(15).fill(null).map(() => Array(15).fill('X'));

      const request: LLMMoveRequest = {
        board,
        currentPlayer: 'black',
        history: [],
      };

      const result = await service.generateMove(request);

      expect(result.move.isValid).toBe(false);
      expect(result.reason).toContain('No strategic positions');
    });
  });
});
