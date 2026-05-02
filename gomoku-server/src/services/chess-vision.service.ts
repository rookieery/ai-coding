import OpenAI from 'openai';
import { logger } from '../utils/logger';

interface ChessBoardRecognitionResult {
  boardType: 'chinese_chess';
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

const CHESS_VISION_SYSTEM_PROMPT = `你是一个追求绝对零误差的中国象棋视觉标定系统。你必须按以下严格顺序思考：

**步骤1：【棋盘类型确认】**
通过以下特征确认棋盘为中国象棋：
- 中间是否有「楚河汉界」文字
- 是否存在九宫格斜线（帅/将的活动区域）
- 棋子是否为圆形且带有中文字符

如果以上特征不匹配，说明这不是中国象棋棋盘，请输出空结果。

**步骤2：【坐标系约定】**
- row 0 为黑方底线（画面上方）
- row 9 为红方底线（画面下方）
- col 0 为最左列
- col 8 为最右列

棋子编码规则（通过棋子上的中文字符确定类型和阵营，而非颜色深浅）：
- 0 = 空位
- 1 = 红帅（红色方，带"帅"字的棋子）
- 2 = 红仕（红色方，带"仕"字的棋子）
- 3 = 红相（红色方，带"相"字的棋子）
- 4 = 红马（红色方，带"马"字的棋子）
- 5 = 红车（红色方，带"车"字的棋子）
- 6 = 红炮（红色方，带"炮"字的棋子）
- 7 = 红兵（红色方，带"兵"字的棋子）
- 8 = 黑将（黑色方，带"将"字的棋子）
- 9 = 黑士（黑色方，带"士"字的棋子）
- 10 = 黑象（黑色方，带"象"字的棋子）
- 11 = 黑马（黑色方，带"马"字的棋子）
- 12 = 黑车（黑色方，带"车"字的棋子）
- 13 = 黑炮（黑色方，带"炮"字的棋子）
- 14 = 黑卒（黑色方，带"卒"字的棋子）

**步骤3：【ASCII 字符画标注】**
画出 10×9 的 ASCII 字符画用于坐标标注：
- 用 . 表示空位
- 用数字和字母简写表示棋子（如 R_K=红帅, B_K=黑将, R_M=红马, B_C=黑车 等）

示例格式：
\`\`\`
     0   1   2   3   4   5   6   7   8
  0  B_C B_M B_E B_A B_K B_A B_E B_M B_C
  1  .   .   .   .   .   .   .   .   .
  2  .   B_C .   .   .   .   .   B_C .
  3  B_P .   B_P .   B_P .   B_P .   B_P
  4  .   .   .   .   .   .   .   .   .
  ...
\`\`\`

**步骤4：【自我校验】**
严格检查以下约束：
- 红方必须恰好有 1 个帅（编码1）
- 黑方必须恰好有 1 个将（编码8）
- 每方的仕/士不超过 2 个
- 每方的相/象不超过 2 个
- 每方的马不超过 2 个
- 每方的车不超过 2 个
- 每方的炮不超过 2 个
- 每方的兵/卒不超过 5 个
如果校验不通过，必须重新检查纠正！

**步骤5：【输出 3 组候选矩阵】**
由于网格识别存在 1-2 格的物理偏移风险（拍摄角度、透视变形或裁切误差），你必须输出 3 组候选矩阵：
- 方案1：基于你当前识别的位置（最可能）
- 方案2：假设整体向上偏移 1 格后的位置
- 方案3：假设整体向下偏移 1 格后的位置

偏移时，空出的行全部填 0，超出的行丢弃。

结果必须包裹在 json 代码块中，格式严格为：
\`\`\`json
{"boardType": "chinese_chess", "candidates": [matrix1, matrix2, matrix3]}
\`\`\`

其中每个 matrix 都是 10×9 的二维数组（10行9列），值域为 0-14。
每个子数组代表一行，包含 9 个元素。

**重要提醒**：
- 忽略图片顶部和底部的UI界面（如标题栏、按钮、状态文字等），只锁定包含交叉线的棋盘区域。
- 通过中文字符（帅/将、仕/士、相/象、马、车、炮、兵/卒）判断棋子类型和阵营，不要依赖颜色深浅。
- row 0 = 画面上方（黑方底线），row 9 = 画面下方（红方底线）。`;

export class ChessVisionService {
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
      logger.info('Chess vision service initialized with Doubao API');
    } else {
      logger.warn('Chess vision service not initialized: missing API key or base URL');
    }
  }

  async recognizeChessBoard(imageBase64: string): Promise<ChessBoardRecognitionResult> {
    if (!this.client) {
      throw new Error('Chess vision service not configured: missing API key or base URL');
    }

    if (!this.config.model) {
      throw new Error('Chess vision service not configured: missing model endpoint ID');
    }

    logger.info('Calling Doubao vision API for Chinese chess board recognition');

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: CHESS_VISION_SYSTEM_PROMPT,
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
        throw new Error('Empty response from chess vision API');
      }

      logger.info('Chess vision API response received, parsing JSON');

      const result = this.parseVisionResponse(content);

      if (!result) {
        throw new Error('Failed to parse chess vision API response as valid board state');
      }

      logger.info('Chinese chess board recognition successful', {
        candidatesCount: result.candidates.length,
      });
      return result;
    } catch (error) {
      logger.error('Chess vision API call failed:', error);
      throw error;
    }
  }

  private parseVisionResponse(content: string): ChessBoardRecognitionResult | null {
    try {
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        logger.info('Found JSON in markdown code block');
        const result = this.validateAndParseJson(codeBlockMatch[1].trim());
        if (result) return result;
      }

      const jsonMatch = content.match(/\{[\s\S]*"boardType"[\s\S]*\}/);

      if (!jsonMatch) {
        logger.warn('No valid JSON found in chess vision response');
        return null;
      }

      return this.validateAndParseJson(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse chess vision response JSON:', error);
      return null;
    }
  }

  private validateAndParseJson(jsonString: string): ChessBoardRecognitionResult | null {
    try {
      const parsed = JSON.parse(jsonString);

      const boardType = parsed.boardType;
      if (boardType !== 'chinese_chess') {
        logger.warn('Unexpected boardType in chess vision response', { boardType });
      }

      if (!Array.isArray(parsed.candidates)) {
        logger.warn('Invalid candidates array in chess vision response');
        return null;
      }

      const candidates: number[][][] = [];

      for (let c = 0; c < parsed.candidates.length; c++) {
        const matrix = parsed.candidates[c];

        if (!Array.isArray(matrix) || matrix.length !== 10) {
          logger.warn(`Invalid candidate ${c} dimensions: expected 10 rows, got ${Array.isArray(matrix) ? matrix.length : 'non-array'}`);
          return null;
        }

        const validatedMatrix: number[][] = [];

        for (let i = 0; i < matrix.length; i++) {
          if (!Array.isArray(matrix[i]) || matrix[i].length !== 9) {
            logger.warn(`Invalid candidate ${c} row ${i}: expected 9 columns, got ${Array.isArray(matrix[i]) ? matrix[i].length : 'non-array'}`);
            return null;
          }

          const validatedRow: number[] = [];
          for (let j = 0; j < matrix[i].length; j++) {
            const cell = matrix[i][j];
            if (!Number.isInteger(cell) || cell < 0 || cell > 14) {
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
        logger.warn('No valid candidates found in chess vision response');
        return null;
      }

      return {
        boardType: 'chinese_chess',
        candidates,
      };
    } catch (error) {
      logger.warn('JSON parse failed in chess validateAndParseJson:', error);
      return null;
    }
  }
}

export const chessVisionService = new ChessVisionService();
