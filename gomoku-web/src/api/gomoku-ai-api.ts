import { API_BASE_URL } from '../config';

export interface GomokuAiMoveRequest {
  board: number[][];
  currentPlayer: 'black' | 'white';
  moveHistory: Array<{ r: number; c: number; player: number }>;
}

export interface GomokuAiMoveResponse {
  success: boolean;
  data?: {
    x: number;
    y: number;
    reason: string;
    isFallback: boolean;
  };
  error?: string;
  message?: string;
}

export class GomokuAiApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

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

  async generateMove(request: GomokuAiMoveRequest, signal?: AbortSignal): Promise<GomokuAiMoveResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/games/gomoku/llm/move`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
        credentials: 'include',
        signal,
      });

      const result: GomokuAiMoveResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to generate AI move');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/games/gomoku/llm/health`);
      const result = await response.json();
      return result.success && result.data?.apiKeyConfigured;
    } catch {
      return false;
    }
  }
}

export const gomokuAiApi = new GomokuAiApiService();
