import { Request, Response } from 'express';
import { ApiResponse } from '../types';

export class ChineseChessController {
  /**
   * 健康检查
   */
  healthCheck(_req: Request, res: Response) {
    const response: ApiResponse = {
      success: true,
      data: { status: 'healthy' },
      message: 'Chinese Chess module is healthy',
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json(response);
  }

  // 将来添加中国象棋专属方法：
  // async validateMove(req: Request, res: Response) { ... }
  // async suggestMove(req: Request, res: Response) { ... }
  // async aiMove(req: Request, res: Response) { ... }
}

export const chineseChessController = new ChineseChessController();