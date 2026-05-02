/**
 * Chinese Chess (Xiangqi) LLM AI Service
 * Integrates with DeepSeek API for intelligent move generation
 */

import type {
  ChessLLMMoveRequest,
  ChessLLMMoveResponse,
  ChessCandidateMove,
  ChessPosition,
} from '../types/chess-llm.types';
import type { LLMConfig } from '../types/llm.types';
import { findCriticalMove } from '../utils/chessThreatDetector';
import {
  generateCandidateMoves,
  generateAllLegalMoves,
  isFriendly,
} from '../utils/chessCandidateGenerator';
import { buildChessSystemPrompt } from '../utils/chessBoardPromptUtils';
import { logger } from '../utils/logger';

const DEFAULT_LLM_CONFIG: LLMConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  maxTokens: 4000,
  temperature: 0.3,
};

/** Parsed raw response from DeepSeek for chess move */
interface RawChessLLMResponse {
  move: { from: ChessPosition; to: ChessPosition };
  reason: string;
  situationAnalysis?: string;
}

/**
 * Parse LLM response text into a structured chess move.
 * Tolerates markdown code fences and surrounding text.
 */
function parseLLMResponse(text: string): RawChessLLMResponse | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*"move"[\s\S]*"reason"[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (
      !parsed.move ||
      typeof parsed.move.from?.row !== 'number' ||
      typeof parsed.move.from?.col !== 'number' ||
      typeof parsed.move.to?.row !== 'number' ||
      typeof parsed.move.to?.col !== 'number' ||
      typeof parsed.reason !== 'string'
    ) {
      return null;
    }

    return {
      move: {
        from: { row: parsed.move.from.row, col: parsed.move.from.col },
        to: { row: parsed.move.to.row, col: parsed.move.to.col },
      },
      reason: parsed.reason,
      situationAnalysis:
        typeof parsed.situationAnalysis === 'string'
          ? parsed.situationAnalysis
          : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Validate that a move is legal on the given board for the player.
 * Checks: from has friendly piece, move is in legal list, no self-check after.
 */
function isMoveLegal(
  board: number[][],
  from: ChessPosition,
  to: ChessPosition,
  player: 'red' | 'black',
): boolean {
  const piece = board[from.row]?.[from.col];
  if (!piece || !isFriendly(piece, player)) return false;

  if (from.row < 0 || from.row > 9 || from.col < 0 || from.col > 8) return false;
  if (to.row < 0 || to.row > 9 || to.col < 0 || to.col > 8) return false;

  const legalMoves = generateAllLegalMoves(board, player);
  return legalMoves.some(m =>
    m.from.row === from.row &&
    m.from.col === from.col &&
    m.to.row === to.row &&
    m.to.col === to.col,
  );
}

export class ChessLLMService {
  private config: LLMConfig;

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
  }

  private async callDeepSeekAPI(
    systemPrompt: string,
    userPrompt: string,
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

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content || '';
  }

  async generateMove(request: ChessLLMMoveRequest): Promise<ChessLLMMoveResponse> {
    const { board, currentPlayer } = request;

    // Step 1: Threat interception — bypass LLM for critical moves
    const criticalMove = findCriticalMove(board, currentPlayer);
    if (criticalMove) {
      logger.info(`Chess critical move: (${criticalMove.from.row},${criticalMove.from.col})->(${criticalMove.to.row},${criticalMove.to.col}) - ${criticalMove.reason}`);
      return {
        move: { from: criticalMove.from, to: criticalMove.to },
        reason: criticalMove.reason,
        isFallback: true,
      };
    }

    // Step 2: Generate top 15 candidate moves
    const candidates = generateCandidateMoves(board, currentPlayer);

    if (candidates.length === 0) {
      logger.warn('Chess: no candidate moves available');
      throw new Error('No legal moves available for current player');
    }

    try {
      // Step 3: Build prompt with board state and candidates
      const systemPrompt = buildChessSystemPrompt(board, currentPlayer, candidates);
      const userPrompt = '请分析当前局面并选择最优走法。';

      logger.info('Calling DeepSeek API for chess move generation');
      const responseText = await this.callDeepSeekAPI(systemPrompt, userPrompt);

      const parsed = parseLLMResponse(responseText);

      if (!parsed) {
        logger.warn('Chess: failed to parse LLM response, using best candidate fallback');
        return buildFallbackResponse(candidates);
      }

      // Step 4: Validate the LLM's move
      const { from, to } = parsed.move;

      // Check if in candidate list
      const candidateMatch = candidates.find(
        c => c.from.row === from.row && c.from.col === from.col &&
             c.to.row === to.row && c.to.col === to.col,
      );

      if (candidateMatch) {
        logger.info(`Chess: LLM chose candidate move #${candidates.indexOf(candidateMatch) + 1}`);
        return {
          move: { from, to },
          reason: parsed.reason,
          situationAnalysis: parsed.situationAnalysis,
          isFallback: false,
        };
      }

      // Move is outside candidate list — validate legality
      if (isMoveLegal(board, from, to, currentPlayer)) {
        logger.info('Chess: LLM chose legal move outside candidate list');
        return {
          move: { from, to },
          reason: parsed.reason,
          situationAnalysis: parsed.situationAnalysis,
          isFallback: false,
        };
      }

      // Move is illegal — fallback
      logger.warn(`Chess: LLM returned illegal move (${from.row},${from.col})->(${to.row},${to.col}), using fallback`);
      return buildFallbackResponse(candidates);
    } catch (error) {
      logger.error('Chess LLM API call failed:', error);
      return buildFallbackResponse(candidates);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.config.apiKey) return false;
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

function buildFallbackResponse(candidates: ChessCandidateMove[]): ChessLLMMoveResponse {
  const best = candidates[0];
  return {
    move: { from: best.from, to: best.to },
    reason: `大模型返回非法走法，已启用兜底策略。备选: ${best.reason}`,
    isFallback: true,
  };
}

export const chessLlmService = new ChessLLMService();
