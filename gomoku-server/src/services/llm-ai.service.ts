/**
 * LLM AI Service for Gomoku
 * Integrates with DeepSeek API for intelligent move generation
 */

import {
  BoardState,
  PlayerColor,
  LLMMoveRequest,
  LLMMoveResponse,
  ValidatedMove,
  LLMConfig,
} from '../types/llm.types';
import {
  buildSystemPrompt,
  buildUserPrompt,
  notationToCoordinates,
  getRandomEmptyPosition,
} from '../utils/boardPromptUtils';
import { logger } from '../utils/logger';

/**
 * Default LLM configuration for DeepSeek
 */
const DEFAULT_LLM_CONFIG: LLMConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  maxTokens: 500,
  temperature: 0.7,
};

/**
 * Validate a move from LLM response
 * Checks if the coordinate is valid and the cell is empty
 * @param board - Current board state
 * @param move - Move coordinate string (e.g., "H8")
 * @returns ValidatedMove with validation result
 */
export function validateMove(board: BoardState, move: string): ValidatedMove {
  const coords = notationToCoordinates(move);

  if (!coords) {
    return {
      x: -1,
      y: -1,
      isValid: false,
      reason: `Invalid coordinate format: ${move}`,
    };
  }

  const { x, y } = coords;

  if (x < 0 || x > 14 || y < 0 || y > 14) {
    return {
      x: -1,
      y: -1,
      isValid: false,
      reason: `Coordinate out of bounds: ${move}`,
    };
  }

  if (board[y][x] !== '.') {
    return {
      x: -1,
      y: -1,
      isValid: false,
      reason: `Cell ${move} is already occupied`,
    };
  }

  return {
    x,
    y,
    isValid: true,
    reason: 'Valid move',
  };
}

/**
 * Parse LLM response JSON
 * Handles various response formats and extracts move data
 * @param responseText - Raw response text from LLM
 * @returns Parsed LLMMoveResponse or null
 */
function parseLLMResponse(responseText: string): LLMMoveResponse | null {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*"move"[\s\S]*"reason"[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.move === 'string' && typeof parsed.reason === 'string') {
      return {
        move: parsed.move.toUpperCase(),
        reason: parsed.reason,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get fallback move when LLM produces invalid output
 * Returns a random empty position on the board
 * @param board - Current board state
 * @returns ValidatedMove with random empty position
 */
function getFallbackMove(board: BoardState): ValidatedMove {
  const randomPos = getRandomEmptyPosition(board);

  if (!randomPos) {
    return {
      x: -1,
      y: -1,
      isValid: false,
      reason: 'No empty cells available',
    };
  }

  return {
    x: randomPos.x,
    y: randomPos.y,
    isValid: true,
    reason: 'Fallback: random empty position (LLM hallucination detected)',
  };
}

export class LLMAIService {
  private config: LLMConfig;

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
  }

  /**
   * Call DeepSeek API to generate a move
   * @param systemPrompt - System prompt for the LLM
   * @param userPrompt - User prompt for the LLM
   * @returns Raw response text from the API
   */
  private async callDeepSeekAPI(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Generate a move using LLM AI
   * @param request - LLM move request with board state
   * @returns Validated move with coordinates
   */
  async generateMove(request: LLMMoveRequest): Promise<{
    move: ValidatedMove;
    reason: string;
    isFallback: boolean;
  }> {
    const { board } = request;

    try {
      const systemPrompt = buildSystemPrompt(request);
      const userPrompt = buildUserPrompt(request);

      logger.info('Calling DeepSeek API for move generation');
      const responseText = await this.callDeepSeekAPI(systemPrompt, userPrompt);

      const llmResponse = parseLLMResponse(responseText);

      if (!llmResponse) {
        logger.warn('Failed to parse LLM response, using fallback');
        const fallbackMove = getFallbackMove(board);
        return {
          move: fallbackMove,
          reason: 'Failed to parse LLM response',
          isFallback: true,
        };
      }

      const validatedMove = validateMove(board, llmResponse.move);

      if (!validatedMove.isValid) {
        logger.warn(`LLM hallucination detected: ${llmResponse.move} - ${validatedMove.reason}`);
        const fallbackMove = getFallbackMove(board);
        return {
          move: fallbackMove,
          reason: `LLM suggested invalid move: ${llmResponse.move}. ${validatedMove.reason}`,
          isFallback: true,
        };
      }

      logger.info(`LLM generated valid move: ${llmResponse.move}`);
      return {
        move: validatedMove,
        reason: llmResponse.reason,
        isFallback: false,
      };
    } catch (error) {
      logger.error('LLM API call failed:', error);
      const fallbackMove = getFallbackMove(board);
      return {
        move: fallbackMove,
        reason: error instanceof Error ? error.message : 'Unknown error',
        isFallback: true,
      };
    }
  }

  /**
   * Generate a move from frontend game state
   * Convenience method that handles conversion from frontend format
   * @param numericBoard - Numeric board (0/1/2)
   * @param currentPlayer - Current player color
   * @param moveHistory - Array of frontend moves
   * @returns Validated move with coordinates
   */
  async generateMoveFromFrontend(
    numericBoard: number[][],
    currentPlayer: PlayerColor,
    moveHistory: Array<{ r: number; c: number; player: number }>
  ): Promise<{
    move: ValidatedMove;
    reason: string;
    isFallback: boolean;
  }> {
    const {
      createLLMRequest,
    } = await import('../utils/boardPromptUtils');
    const request = createLLMRequest(numericBoard, currentPlayer, moveHistory);
    return this.generateMove(request);
  }
}

export const llmAIService = new LLMAIService();
