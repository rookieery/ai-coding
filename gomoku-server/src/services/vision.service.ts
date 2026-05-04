/**
 * Vision Service for Board Recognition
 * Integrates with Doubao (Volcengine) multimodal API for board image parsing
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { ChatStreamEvent } from './chat.service';

interface BoardRecognitionResult {
  boardType: string;
  candidates: number[][][];
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
你必须使用棋盘上的 5 个定位黑点（星位）作为绝对参考系！
在 15x15（行0-14，列0-14）的标准棋盘中，它们的绝对坐标是：
- 左上角星位：[3, 3]
- 右上角星位：[3, 11]
- 天元（正中心）：[7, 7]
- 左下角星位：[11, 3]
- 右下角星位：[11, 11]

你在扫描任何一颗棋子时，必须先寻找离它最近的星位，然后通过计算与该星位的相对行数和列数（偏移量）来得出最终的绝对坐标！千万不要从边缘强行数格子。

画出 15x15 的 ASCII 字符画：
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

**步骤4：【输出多组候选方案】**
**重要警告**：网格识别存在 1-2 格的物理偏移风险！由于拍摄角度、透视变形或裁切误差，你识别的棋盘位置可能与真实位置存在整体平移。

因此，你必须输出 3 组最可能的候选方案：
- 方案1：基于你当前识别的位置（最可能）
- 方案2：假设整体向某个方向平移 1 格后的位置（次可能）
- 方案3：假设整体向另一个方向平移 1 格后的位置（第三可能）

结果必须包裹在 json 代码块中，格式严格为：
\`\`\`json
{"boardType": "gomoku", "candidates": [matrix1, matrix2, matrix3]}
\`\`\`

其中每个 matrix 都是 15x15 的二维数组：
- 0 代表空位
- 1 代表黑子
- 2 代表白子

请务必输出完整的 15x15 二维数组，每个子数组代表一行，包含 15 个元素。

**重要提醒**：
- 忽略图片顶部和底部的UI界面（如标题栏、按钮、状态文字等），只锁定包含交叉线的木质棋盘区域。
- 行号从上到下为 0-14，列号从左到右为 0-14。
- 三个候选方案必须覆盖不同的平移假设，为前端提供纠错空间。`;

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
        max_tokens: 4000,
        temperature: 0.4,
        top_p: 0.9,
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

      logger.info('Board recognition successful', { boardType: result.boardType, candidatesCount: result.candidates.length });
      return result;
    } catch (error) {
      logger.error('Vision API call failed:', error);
      throw error;
    }
  }

  async *createStreamRecognition(imageBase64: string): AsyncGenerator<ChatStreamEvent, void, unknown> {
    if (!this.client) {
      throw new Error('Vision service not configured: missing API key or base URL');
    }

    if (!this.config.model) {
      throw new Error('Vision service not configured: missing model endpoint ID');
    }

    logger.info('Calling Doubao vision API for streaming board recognition');

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
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
        yield {
          type: 'thinking',
          text: (delta as Record<string, unknown>).reasoning_content as string,
        };
      }

      if (delta.content) {
        yield {
          type: 'answer',
          text: delta.content,
        };
      }
    }
  }

  parseVisionResponse(content: string): BoardRecognitionResult | null {
    try {
      // First, try to extract JSON from markdown code blocks (```json ... ```)
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        logger.info('Found JSON in markdown code block');
        const result = this.validateAndParseJson(codeBlockMatch[1].trim());
        if (result) return result;
      }

      // Fallback: try to find raw JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*"boardType"[\s\S]*\}/);

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

      // Validate candidates array
      if (!Array.isArray(parsed.candidates)) {
        logger.warn('Invalid candidates array in vision response');
        return null;
      }

      const candidates: number[][][] = [];

      for (let c = 0; c < parsed.candidates.length; c++) {
        const matrix = parsed.candidates[c];

        if (!Array.isArray(matrix) || matrix.length !== 15) {
          logger.warn(`Invalid candidate ${c} dimensions: expected 15 rows`);
          return null;
        }

        const validatedMatrix: number[][] = [];

        for (let i = 0; i < matrix.length; i++) {
          if (!Array.isArray(matrix[i]) || matrix[i].length !== 15) {
            logger.warn(`Invalid candidate ${c} row ${i}: expected 15 columns`);
            return null;
          }

          const validatedRow: number[] = [];
          for (let j = 0; j < matrix[i].length; j++) {
            const cell = matrix[i][j];
            if (cell !== 0 && cell !== 1 && cell !== 2) {
              logger.warn(`Invalid cell value in candidate ${c} at [${i}][${j}]: ${cell}`);
              return null;
            }
            validatedRow.push(cell);
          }
          validatedMatrix.push(validatedRow);
        }

        candidates.push(validatedMatrix);
      }

      if (candidates.length === 0) {
        logger.warn('No valid candidates found in vision response');
        return null;
      }

      return {
        boardType,
        candidates,
      };
    } catch (error) {
      logger.warn('JSON parse failed in validateAndParseJson:', error);
      return null;
    }
  }
}

export const visionService = new VisionService();
