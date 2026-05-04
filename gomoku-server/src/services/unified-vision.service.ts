import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { visionService } from './vision.service';
import { chessVisionService } from './chess-vision.service';
import { ChatStreamEvent } from './chat.service';

type BoardType = 'gomoku' | 'chinese_chess';

interface UnifiedRecognitionResult {
  boardType: BoardType;
  candidates: number[][][];
}

interface DetectionConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  apiKey: process.env.VOLCENGINE_API_KEY || '',
  baseUrl: process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  model: process.env.DOUBAO_VISION_ENDPOINT_ID || '',
};

const DETECTION_SYSTEM_PROMPT = 'You are a board game image classifier. Respond with exactly one word.';

const DETECTION_USER_PROMPT = `Determine whether this image shows a Gomoku (Five-in-a-Row) board or a Chinese Chess (Xiangqi) board.

Gomoku features: 15x15 grid of intersecting lines, round black and white stones, star point markers.
Chinese Chess features: 9x10 grid, "river" dividing line with text in the middle, circular pieces with Chinese characters.

Reply with ONLY one word: gomoku or chinese_chess`;

export class UnifiedVisionService {
  private config: DetectionConfig;
  private client: OpenAI | null = null;

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_DETECTION_CONFIG, ...config };
    this.initializeClient();
  }

  private initializeClient(): void {
    if (this.config.apiKey && this.config.baseUrl) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
      });
      logger.info('Unified vision service initialized');
    } else {
      logger.warn('Unified vision service not initialized: missing API key or base URL');
    }
  }

  async detectBoardType(imageBase64: string): Promise<BoardType> {
    if (!this.client) {
      throw new Error('Unified vision service not configured: missing API key or base URL');
    }

    if (!this.config.model) {
      throw new Error('Unified vision service not configured: missing model endpoint ID');
    }

    logger.info('Detecting board type via Doubao vision API');

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: DETECTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:')
                  ? imageBase64
                  : `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
        { role: 'user', content: DETECTION_USER_PROMPT },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content?.trim().toLowerCase() ?? '';

    if (content.includes('chinese_chess')) {
      logger.info('Board type detected: chinese_chess');
      return 'chinese_chess';
    }

    logger.info('Board type detected: gomoku', { rawResponse: content });
    return 'gomoku';
  }

  async recognizeBoard(imageBase64: string): Promise<UnifiedRecognitionResult> {
    const boardType = await this.detectBoardType(imageBase64);

    if (boardType === 'chinese_chess') {
      const result = await chessVisionService.recognizeChessBoard(imageBase64);
      return { boardType: 'chinese_chess', candidates: result.candidates };
    }

    const result = await visionService.recognizeBoard(imageBase64);
    return { boardType: 'gomoku', candidates: result.candidates };
  }

  async createStreamRecognition(imageBase64: string): Promise<{
    boardType: BoardType;
    stream: AsyncGenerator<ChatStreamEvent, void, unknown>;
  }> {
    const boardType = await this.detectBoardType(imageBase64);

    if (boardType === 'chinese_chess') {
      return {
        boardType,
        stream: chessVisionService.createStreamChessRecognition(imageBase64),
      };
    }

    return {
      boardType,
      stream: visionService.createStreamRecognition(imageBase64),
    };
  }
}

export const unifiedVisionService = new UnifiedVisionService();
