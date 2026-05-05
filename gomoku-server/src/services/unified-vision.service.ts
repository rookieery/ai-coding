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

const STREAM_SYSTEM_PROMPT = `你是一个棋盘视觉标定系统。你需要先判断图片中的棋盘类型，然后进行详细分析。

**步骤1：判断棋盘类型**
检查图片中是五子棋（Gomoku）还是中国象棋（Chinese Chess）棋盘：
- 五子棋特征：15x15交叉线网格，圆形黑白棋子，星位标记点
- 中国象棋特征：9x10网格，中间有「楚河汉界」，带中文字符的圆形棋子

如果是五子棋棋盘，请按照五子棋识别规则进行分析（15x15矩阵，0=空位/1=黑子/2=白子）。
如果是中国象棋棋盘，请按照中国象棋识别规则进行分析（10x9矩阵，0-14编码）。

**步骤2：分析并输出**
无论哪种棋盘类型，结果必须包裹在 json 代码块中。
- 五子棋格式：\`{"boardType": "gomoku", "candidates": [15x15矩阵1, 15x15矩阵2, 15x15矩阵3]}\`
- 中国象棋格式：\`{"boardType": "chinese_chess", "candidates": [10x9矩阵1, 10x9矩阵2, 10x9矩阵3]}\`

请输出3组候选方案以覆盖可能的平移误差。

**重要提醒**：
- 忽略图片顶部和底部的UI界面，只锁定棋盘区域
- 通过棋子的视觉特征（位置、大小、中文字符等）准确判断类型和位置
- 中国象棋棋子编码：1=红帅,2=红仕,3=红相,4=红马,5=红车,6=红炮,7=红兵,8=黑将,9=黑士,10=黑象,11=黑马,12=黑车,13=黑炮,14=黑卒`;

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

  async createStreamRecognition(
    imageBase64: string,
    onEvent: (event: ChatStreamEvent) => void,
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Unified vision service not configured: missing API key or base URL');
    }

    if (!this.config.model) {
      throw new Error('Unified vision service not configured: missing model endpoint ID');
    }

    logger.info('Calling Doubao vision API for unified streaming recognition');

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: STREAM_SYSTEM_PROMPT },
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
      ],
      max_tokens: 4000,
      temperature: 0.4,
      top_p: 0.9,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if ((delta as Record<string, unknown>).reasoning_content) {
        onEvent({
          type: 'thinking',
          text: (delta as Record<string, unknown>).reasoning_content as string,
        });
      }

      if (delta.content) {
        onEvent({
          type: 'answer',
          text: delta.content,
        });
      }
    }
  }
}

export const unifiedVisionService = new UnifiedVisionService();
