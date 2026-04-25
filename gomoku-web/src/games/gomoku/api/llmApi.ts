/**
 * LLM AI API Service for Gomoku
 * Handles communication with the DeepSeek-powered AI backend
 */

import { API_BASE_URL } from '../../../config';

/**
 * Player color for LLM API
 */
export type LLMPlayerColor = 'black' | 'white';

/**
 * Request body for LLM move generation
 */
export interface LLMMoveRequest {
  board: number[][];
  currentPlayer: LLMPlayerColor;
  moveHistory: Array<{ r: number; c: number; player: number }>;
}

/**
 * Response from LLM move generation
 */
export interface LLMMoveResponse {
  x: number;
  y: number;
  reason: string;
  isFallback: boolean;
}

/**
 * Health check response
 */
export interface LLMHealthResponse {
  status: string;
  apiKeyConfigured: boolean;
  model: string;
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * LLM AI API Service class
 */
export class LLMApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get request headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Check LLM AI service health
   * @returns Health check response
   */
  async healthCheck(): Promise<LLMHealthResponse> {
    const response = await fetch(`${this.baseUrl}/games/gomoku/llm/health`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const result: ApiResponse<LLMHealthResponse> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || result.error || 'LLM health check failed');
    }

    return result.data;
  }

  /**
   * Generate a move using LLM AI
   * @param request - LLM move request with board state
   * @returns LLM move response with coordinates
   */
  async generateMove(request: LLMMoveRequest): Promise<LLMMoveResponse> {
    const response = await fetch(`${this.baseUrl}/games/gomoku/llm/move`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      credentials: 'include',
    });

    const result: ApiResponse<LLMMoveResponse> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || result.error || 'LLM move generation failed');
    }

    return result.data;
  }
}

/**
 * Default LLM API service instance
 */
export const llmApi = new LLMApiService();
