/**
 * 中国象棋 AI Web Worker
 * 在后台线程中运行 AI 计算，避免阻塞主线程
 */

import { BoardState, PlayerSide } from '../types';
import { getAIMove } from './minimax';

// 上一次发送思考进度的时间戳
let lastPostTime = 0;

// Worker 消息处理
self.onmessage = async (e: MessageEvent) => {
  const { board, aiPlayer, difficulty } = e.data as {
    board: BoardState;
    aiPlayer: PlayerSide;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };

  try {
    // 调用 AI 算法获取最佳移动
    const move = getAIMove(board, aiPlayer, difficulty);

    // 返回结果
    self.postMessage({ type: 'result', move });
  } catch (error) {
    console.error('AI Worker error:', error);
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// 导出空对象以满足模块系统
export {};