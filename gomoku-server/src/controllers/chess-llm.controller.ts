import { Request, Response } from 'express';
import { chessLlmService } from '../services/chess-llm.service';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { ChessLLMMoveRequest, ChessPlayerColor, ChessMoveRecord } from '../types/chess-llm.types';

interface ChessLLMMoveRequestBody {
  board: number[][];
  currentPlayer: ChessPlayerColor;
  moveHistory: ChessMoveRecord[];
}

export class ChessLLMController {
  async generateMove(req: Request, res: Response) {
    try {
      const { board, currentPlayer, moveHistory } = req.body as ChessLLMMoveRequestBody;

      if (!board || !Array.isArray(board) || board.length !== 10 || !board.every(row => Array.isArray(row) && row.length === 9)) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Invalid board: must be a 10x9 array',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      if (!currentPlayer || !['red', 'black'].includes(currentPlayer)) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Invalid currentPlayer: must be "red" or "black"',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      if (moveHistory && !Array.isArray(moveHistory)) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Invalid moveHistory: must be an array',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      logger.info(`Chess LLM move request: player=${currentPlayer}, history=${moveHistory?.length ?? 0} moves`);

      const request: ChessLLMMoveRequest = { board, currentPlayer, moveHistory: moveHistory ?? [] };
      const result = await chessLlmService.generateMove(request);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: result.isFallback
          ? 'Fallback move generated (critical threat intercepted or illegal LLM move corrected)'
          : 'LLM move generated successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Chess LLM move generation error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to generate chess LLM move',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }

  async healthCheck(_req: Request, res: Response) {
    try {
      const isHealthy = await chessLlmService.healthCheck();

      const response: ApiResponse = {
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'degraded',
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        },
        message: isHealthy
          ? 'Chess LLM service is healthy'
          : 'Chess LLM service is available but API connectivity check failed',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Chess LLM health check error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Service Unavailable',
        message: 'Chess LLM service health check failed',
        timestamp: new Date().toISOString(),
      };
      return res.status(503).json(response);
    }
  }
}

export const chessLlmController = new ChessLLMController();
