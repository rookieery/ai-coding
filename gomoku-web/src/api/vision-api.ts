import { API_BASE_URL } from '../config';

export interface RecognitionResult {
  boardType: string;
  candidates: number[][][];
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

  async recognizeBoardFromBase64(imageBase64: string): Promise<RecognitionResult> {
    const response = await fetch(`${this.baseUrl}/vision/recognize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ imageBase64 }),
      credentials: 'include',
    });

    const result: VisionApiResponse<RecognitionResult> = await response.json();

    if (!result.success) {
      throw new Error(result.message || result.error || 'Failed to recognize board');
    }

    return result.data!;
  }
}

export const visionApi = new VisionApiService();
