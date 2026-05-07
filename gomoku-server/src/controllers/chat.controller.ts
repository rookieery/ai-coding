import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';

export class ChatController {
  /**
   * 处理聊天消息（非流式）
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

      const aiResponse = await chatService.createChatResponse(message, history);

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
   * 处理流式聊天消息
   */
  async chatStream(req: Request, res: Response): Promise<void> {
    // 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let clientDisconnected = false;

    req.on('close', () => {
      clientDisconnected = true;
    });

    try {
      const { message, history = [] } = req.body;

      if (!message || typeof message !== 'string') {
        res.write(`data: ${JSON.stringify({ error: 'Bad Request', message: 'Message is required' })}\n\n`);
        res.end();
        return;
      }

      // 创建流式响应生成器
      const stream = chatService.createStreamResponse(message, history);

      // 处理流式事件
      for await (const event of stream) {
        if (clientDisconnected) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // 发送完成标记
      if (!clientDisconnected) {
        res.write(`data: [DONE]\n\n`);
      }
      res.end();
      return;
    } catch (error: any) {
      if (!clientDisconnected) {
        console.error('DeepSeek Stream Error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Internal Server Error', message: error.message })}\n\n`);
      }
      res.end();
      return;
    }
  }
}

export const chatController = new ChatController();