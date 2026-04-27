/**
 * Vision Service for Board Recognition
 * Integrates with Doubao (Volcengine) multimodal API for board image parsing
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';

interface BoardRecognitionResult {
  boardType: string;
  pieces: number[][];
}

interface VisionConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_VISION_CONFIG: VisionConfig = {
  apiKey: process.env.VOLCENGINE_API_KEY || '',
  baseUrl: process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  model: process.env.DOUBAO_VISION_ENDPOINT_ID || '',
};

const VISION_SYSTEM_PROMPT = `你是一个追求绝对零误差的五子棋视觉标定系统。你必须按以下严格顺序思考：

**步骤1：【全局盘点】**
首先，用肉眼全局扫描整个棋盘区域，明确写出画面中【黑子总数】和【白子总数】。
例如：黑子总数 = 5，白子总数 = 4

**步骤2：【坐标系画图】**
以星位为锚点，画出 15x15 的 ASCII 字符画：
- 用 . 表示空位
- 用 B 表示黑子
- 用 W 表示白子
- 用 * 表示星位（天元和四个角星）

示例格式：
\`\`\`
  0 1 2 3 4 5 6 7 8 9 10 11 12 13 14
0 . . . . . . . * . . .  .  .  .  .
1 . . . . . . . . . . .  .  .  .  .
...
\`\`\`

**步骤3：【自我校验】**
统计你画出的字符画中 B 和 W 的数量，必须与步骤1的全局盘点总数绝对一致！
- 如果不一致，说明你漏看或多看了，必须重新扫描纠正。
- 只有校验通过后，才能进入下一步。

**步骤4：【输出JSON】**
只有在校验通过后，才将字符画转换为 JSON 输出。结果必须包裹在 json 代码块中，格式严格为：
\`\`\`json
{"boardType": "gomoku", "pieces": [[...], ...]}
\`\`\`
其中：
- 0 代表空位
- 1 代表黑子
- 2 代表白子

请务必输出完整的15x15二维数组，每个子数组代表一行，包含15个元素。

**重要提醒**：
- 忽略图片顶部和底部的UI界面（如标题栏、按钮、状态文字等），只锁定包含交叉线的木质棋盘区域。
- 行号从上到下为 0-14，列号从左到右为 0-14。`;

export class VisionService {
  private config: VisionConfig;
  private client: OpenAI | null = null;

  constructor(config: Partial<VisionConfig> = {}) {
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
    this.initializeClient();
  }

  private initializeClient(): void {
    if (this.config.apiKey && this.config.baseUrl) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
      });
      logger.info('Vision service initialized with Doubao API');
    } else {
      logger.warn('Vision service not initialized: missing API key or base URL');
    }
  }

  async recognizeBoard(imageBase64: string): Promise<BoardRecognitionResult> {
    if (!this.client) {
      throw new Error('Vision service not configured: missing API key or base URL');
    }

    if (!this.config.model) {
      throw new Error('Vision service not configured: missing model endpoint ID');
    }

    logger.info('Calling Doubao vision API for board recognition');

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: VISION_SYSTEM_PROMPT,
          },
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
        max_tokens: 2000,
        temperature: 0.0,
        top_p: 0.01,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from vision API');
      }

      logger.info('Vision API response received, parsing JSON');

      const result = this.parseVisionResponse(content);

      if (!result) {
        throw new Error('Failed to parse vision API response as valid board state');
      }

      logger.info('Board recognition successful', { boardType: result.boardType });
      return result;
    } catch (error) {
      logger.error('Vision API call failed:', error);
      throw error;
    }
  }

  private parseVisionResponse(content: string): BoardRecognitionResult | null {
    try {
      // First, try to extract JSON from markdown code blocks (```json ... ```)
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        logger.info('Found JSON in markdown code block');
        const result = this.validateAndParseJson(codeBlockMatch[1].trim());
        if (result) return result;
      }

      // Fallback: try to find raw JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*"boardType"[\s\S]*"pieces"[\s\S]*\}/);

      if (!jsonMatch) {
        logger.warn('No valid JSON found in vision response');
        return null;
      }

      const result = this.validateAndParseJson(jsonMatch[0]);
      return result;
    } catch (error) {
      logger.error('Failed to parse vision response JSON:', error);
      return null;
    }
  }

  private validateAndParseJson(jsonString: string): BoardRecognitionResult | null {
    try {
      const parsed = JSON.parse(jsonString);

      // Allow missing boardType, default to "gomoku"
      const boardType = typeof parsed.boardType === 'string' ? parsed.boardType : 'gomoku';

      // Handle case where API returns the pieces array directly (not wrapped in an object)
      let pieces: number[][];
      if (Array.isArray(parsed) && parsed.length === 15) {
        pieces = parsed;
      } else if (Array.isArray(parsed.pieces)) {
        pieces = parsed.pieces;
      } else {
        logger.warn('Invalid pieces array in vision response');
        return null;
      }

      if (pieces.length !== 15) {
        logger.warn(`Invalid pieces dimensions: expected 15 rows, got ${pieces.length}`);
        return null;
      }

      for (let i = 0; i < pieces.length; i++) {
        if (!Array.isArray(pieces[i]) || pieces[i].length !== 15) {
          logger.warn(`Invalid pieces row ${i}: expected 15 columns`);
          return null;
        }

        for (let j = 0; j < pieces[i].length; j++) {
          const cell = pieces[i][j];
          if (cell !== 0 && cell !== 1 && cell !== 2) {
            logger.warn(`Invalid cell value at [${i}][${j}]: ${cell}`);
            return null;
          }
        }
      }

      return {
        boardType,
        pieces,
      };
    } catch (error) {
      logger.warn('JSON parse failed in validateAndParseJson:', error);
      return null;
    }
  }
}

export const visionService = new VisionService();
