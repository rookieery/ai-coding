/**
 * LLM AI Controller for Gomoku
 * Handles HTTP requests for LLM-powered AI move generation
 */

import { Request, Response } from 'express';
import { llmAIService } from '../services/llm-ai.service';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { PlayerColor } from '../types/llm.types';

/**
 * Request body for LLM move endpoint
 */
interface LLMMoveRequestBody {
  board: number[][];
  currentPlayer: PlayerColor;
  moveHistory: Array<{ r: number; c: number; player: number }>;
}

export class LLMAIController {
  /**
   * Generate an AI move using LLM
   * @route POST /api/games/gomoku/llm/move
   */
  async generateMove(req: Request, res: Response) {
    try {
      const { board, currentPlayer, moveHistory } = req.body as LLMMoveRequestBody;

      if (!board || !Array.isArray(board) || board.length !== 15) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Invalid board: must be a 15x15 array',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      if (!currentPlayer || !['black', 'white'].includes(currentPlayer)) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Invalid currentPlayer: must be "black" or "white"',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      if (!moveHistory || !Array.isArray(moveHistory)) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Invalid moveHistory: must be an array',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      logger.info(`LLM move request: player=${currentPlayer}, history=${moveHistory.length} moves`);

      const result = await llmAIService.generateMoveFromFrontend(
        board,
        currentPlayer,
        moveHistory
      );

      if (!result.move.isValid) {
        const response: ApiResponse = {
          success: false,
          error: 'No Valid Move',
          message: result.move.reason || 'No valid move available',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          x: result.move.x,
          y: result.move.y,
          reason: result.reason,
          isFallback: result.isFallback,
        },
        message: result.isFallback
          ? 'Fallback move generated (LLM hallucination detected)'
          : 'LLM move generated successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('LLM move generation error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to generate LLM move',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }

  /**
   * Health check for LLM AI service
   * @route GET /api/games/gomoku/llm/health
   */
  async healthCheck(_req: Request, res: Response) {
    const hasApiKey = !!process.env.DEEPSEEK_API_KEY;

    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        apiKeyConfigured: hasApiKey,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      },
      message: hasApiKey
        ? 'LLM AI service is ready'
        : 'LLM AI service is available but API key is not configured',
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  }
}

export const llmAiController = new LLMAIController();
