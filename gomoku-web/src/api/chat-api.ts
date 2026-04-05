// API配置
const API_BASE_URL = 'http://localhost:3003/api';

/**
 * 聊天消息接口
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 聊天请求参数
 */
export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

/**
 * 聊天响应
 */
export interface ChatResponse {
  success: boolean;
  response: string;
  error?: string;
  message?: string;
}

/**
 * 流式聊天响应块
 */
export interface ChatStreamChunk {
  content: string;
  done?: boolean;
  error?: string;
}

/**
 * 聊天API服务
 */
export class ChatApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 发送聊天消息并获取AI回复
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result: ChatResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to get chat response');
      }

      return result;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  /**
   * 发送流式聊天消息
   */
  async sendMessageStream(
    request: ChatRequest,
    onChunk: (chunk: ChatStreamChunk) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                onComplete?.();
                return;
              }

              try {
                const parsed = JSON.parse(data) as ChatStreamChunk;
                onChunk(parsed);
              } catch (e) {
                console.error('Error parsing SSE data:', e, data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error in stream chat:', error);
      onError?.(error as Error);
      onChunk({ content: '', error: (error as Error).message });
    }
  }

  /**
   * 检查后端连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 创建默认实例
export const chatApi = new ChatApiService();