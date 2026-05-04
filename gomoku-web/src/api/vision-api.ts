import { API_BASE_URL } from '../config';

export type BoardType = 'gomoku' | 'chinese_chess';

export interface RecognitionResult {
  boardType: BoardType;
  candidates: number[][][];
}

export interface VisionStreamChunk {
  type: 'thinking' | 'answer' | 'board_data';
  text?: string;
  data?: RecognitionResult;
}

interface VisionApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class VisionApiService {
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

  async recognizeBoardFromBase64(imageBase64: string, signal?: AbortSignal): Promise<RecognitionResult> {
    const response = await fetch(`${this.baseUrl}/vision/recognize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ imageBase64 }),
      credentials: 'include',
      signal,
    });

    const result: VisionApiResponse<RecognitionResult> = await response.json();

    if (!result.success) {
      throw new Error(result.message || result.error || 'Failed to recognize board');
    }

    return result.data!;
  }

  async recognizeBoardStream(
    imageBase64: string,
    onChunk: (chunk: VisionStreamChunk) => void,
    onError: (error: Error) => void,
    onComplete: (boardData?: RecognitionResult) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/vision/recognize/stream`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ imageBase64 }),
        credentials: 'include',
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let boardData: RecognitionResult | undefined;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data: ')) continue;

            const data = line.substring(6);
            if (data === '[DONE]') {
              onComplete(boardData);
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.message || parsed.error);
              }

              if (parsed.type === 'board_data' && parsed.data) {
                boardData = {
                  boardType: parsed.data.boardType,
                  candidates: parsed.data.candidates,
                };
                onChunk({ type: 'board_data', data: boardData });
              } else if (parsed.type === 'thinking' || parsed.type === 'answer') {
                onChunk({ type: parsed.type, text: parsed.text });
              }
            } catch (e) {
              if (e instanceof Error && e.message && !e.message.startsWith('Unexpected')) {
                throw e;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      onComplete(boardData);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error;
      }
      onError(error as Error);
    }
  }
}

export const visionApi = new VisionApiService();
