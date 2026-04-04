import { Request, Response } from 'express';
import OpenAI from 'openai';

// 系统提示
const SYSTEM_PROMPT = "你是一个专业的五子棋（Gomoku/Renju）大师和智能助手。你的任务是帮助用户解答关于五子棋的规则、开局流派（如花月、浦月等）、对局策略、技巧分析等问题。请使用专业但易懂的语言，态度友好。如果用户询问与五子棋无关的问题，请委婉地引导回五子棋话题。";

// 初始化DeepSeek客户端
const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com',
});

export class ChatController {
  /**
   * 处理聊天消息
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, history = [] } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Message is required and must be a string',
        });
        return;
      }

      // 构建消息数组，包含系统提示和对话历史
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ];

      const completion = await deepseekClient.chat.completions.create({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const aiResponse = completion.choices[0]?.message?.content || '抱歉，我没有收到回复';

      res.json({
        success: true,
        response: aiResponse,
      });
      return;
    } catch (error: any) {
      console.error('DeepSeek API Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'Failed to process chat request',
      });
      return;
    }
  }

  /**
   * 处理流式聊天消息（可选，未来扩展）
   */
  async chatStream(req: Request, res: Response): Promise<void> {
    // 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const { message, history = [] } = req.body;

      if (!message || typeof message !== 'string') {
        res.write(`data: ${JSON.stringify({ error: 'Bad Request', message: 'Message is required' })}\n\n`);
        res.end();
        return;
      }

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ];

      const stream = await deepseekClient.chat.completions.create({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    } catch (error: any) {
      console.error('DeepSeek Stream Error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Internal Server Error', message: error.message })}\n\n`);
      res.end();
      return;
    }
  }
}

export const chatController = new ChatController();