import { API_BASE_URL } from '../../../config';

export interface ChessLLMPosition {
  row: number;
  col: number;
}

export interface ChessLLMMoveRecord {
  from: ChessLLMPosition;
  to: ChessLLMPosition;
  piece: number;
  capturedPiece?: number;
  notation?: string;
}

export interface ChessLLMMoveRequest {
  board: number[][];
  currentPlayer: 'red' | 'black';
  moveHistory: ChessLLMMoveRecord[];
}

export interface ChessLLMMoveResponse {
  move: {
    from: ChessLLMPosition;
    to: ChessLLMPosition;
  };
  reason: string;
  situationAnalysis?: string;
  isFallback: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export class ChessLLMApiService {
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

  async generateMove(request: ChessLLMMoveRequest): Promise<ChessLLMMoveResponse> {
    const response = await fetch(`${this.baseUrl}/games/chinese-chess/llm/move`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      credentials: 'include',
    });

    const result: ApiResponse<ChessLLMMoveResponse> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || result.error || 'Chess LLM move generation failed');
    }

    return result.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/games/chinese-chess/llm/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const result: ApiResponse<unknown> = await response.json();
      return result.success === true;
    } catch {
      return false;
    }
  }
}

export const chessLlmApi = new ChessLLMApiService();
