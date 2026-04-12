import { OpenAI } from 'openai';

// 定义 DeepSeek 流式响应块类型
interface DeepSeekStreamChunk {
  choices: Array<{
    delta: {
      reasoning_content?: string;
      content?: string;
    };
    index: number;
    finish_reason: string | null;
  }>;
}

// 定义 SSE 事件类型
export interface ChatStreamEvent {
  type: 'thinking' | 'answer';
  text: string;
}

export class ChatService {
  private deepseekClient: OpenAI;
  private systemPrompt: string;

  constructor() {
    // 初始化 DeepSeek 客户端
    this.deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com',
    });

    // 系统提示
    this.systemPrompt = "你是一个专业的棋林通用棋类专家，精通五子棋（Gomoku/Renju）和中国象棋（Xiangqi）。你的任务是帮助用户解答关于五子棋和中国象棋的规则、开局、策略、技巧分析等问题。请使用专业但易懂的语言，态度友好。如果用户询问与棋类无关的问题，请委婉地引导回棋类话题。";
  }

  /**
   * 创建流式聊天响应
   * @param message 用户消息
   * @param history 对话历史
   * @returns 异步生成器，产出 ChatStreamEvent
   */
  async *createStreamResponse(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): AsyncGenerator<ChatStreamEvent, void, unknown> {
    // 构建消息数组
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt },
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // 调用 DeepSeek Reasoner 模型
    const stream = await this.deepseekClient.chat.completions.create({
      model: 'deepseek-reasoner',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // 处理流式响应
    for await (const chunk of stream) {
      const deepseekChunk = chunk as unknown as DeepSeekStreamChunk;
      const delta = deepseekChunk.choices[0]?.delta;

      if (!delta) continue;

      // 处理思考内容
      if (delta.reasoning_content) {
        yield {
          type: 'thinking',
          text: delta.reasoning_content,
        };
      }

      // 处理正式回答内容
      if (delta.content) {
        yield {
          type: 'answer',
          text: delta.content,
        };
      }
    }
  }

  /**
   * 创建非流式聊天响应（兼容旧接口）
   * @param message 用户消息
   * @param history 对话历史
   * @returns AI 响应文本
   */
  async createChatResponse(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt },
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await this.deepseekClient.chat.completions.create({
      model: 'deepseek-reasoner',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || '抱歉，我没有收到回复';
  }
}

// 创建默认实例
export const chatService = new ChatService();