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

const VISION_SYSTEM_PROMPT = `你是一个五子棋视觉解析专家。请严格按照以下步骤分析图片中的15x15棋盘：

**步骤1：定位棋盘区域**
忽略图片顶部和底部的UI界面（如标题栏、按钮、状态文字等），只锁定包含交叉线的木质棋盘区域。

**步骤2：建立坐标系**
识别棋盘四个角和中心的特殊标记点（星位），以此为基准建立坐标系：
- 行号：从上到下为 0-14
- 列号：从左到右为 0-14

**步骤3：逐行扫描**
逐行扫描棋盘，在思考过程中写下每一个发现的棋子坐标。例如：
- 第0行：发现黑子于(0,7)，白子于(0,9)...
- 第1行：发现白子于(1,6)...

**步骤4：确认并输出结果**
确认所有棋子坐标无误后，提取最终结果。结果必须包裹在 json 代码块中，格式严格为：
\`\`\`json
{"boardType": "gomoku", "pieces": [[...], ...]}
\`\`\`
其中：
- 0 代表空位
- 1 代表黑子
- 2 代表白子

请务必输出完整的15x15二维数组，每个子数组代表一行，包含15个元素。`;

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

      if (typeof parsed.boardType !== 'string') {
        logger.warn('Invalid boardType in vision response');
        return null;
      }

      if (!Array.isArray(parsed.pieces)) {
        logger.warn('Invalid pieces array in vision response');
        return null;
      }

      if (parsed.pieces.length !== 15) {
        logger.warn(`Invalid pieces dimensions: expected 15 rows, got ${parsed.pieces.length}`);
        return null;
      }

      for (let i = 0; i < parsed.pieces.length; i++) {
        if (!Array.isArray(parsed.pieces[i]) || parsed.pieces[i].length !== 15) {
          logger.warn(`Invalid pieces row ${i}: expected 15 columns`);
          return null;
        }

        for (let j = 0; j < parsed.pieces[i].length; j++) {
          const cell = parsed.pieces[i][j];
          if (cell !== 0 && cell !== 1 && cell !== 2) {
            logger.warn(`Invalid cell value at [${i}][${j}]: ${cell}`);
            return null;
          }
        }
      }

      return {
        boardType: parsed.boardType,
        pieces: parsed.pieces,
      };
    } catch (error) {
      logger.warn('JSON parse failed in validateAndParseJson:', error);
      return null;
    }
  }
}

export const visionService = new VisionService();
