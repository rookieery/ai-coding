import { Router } from 'express';
import { gomokuController } from '../../controllers/gomoku.controller';

const router = Router();

/**
 * @route   GET /api/games/gomoku/health
 * @desc    五子棋模块健康检查
 * @access  Public
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Gomoku module is healthy',
    timestamp: new Date().toISOString(),
  });
});

// 五子棋前端格式棋谱路由
/**
 * @route   POST /api/games/gomoku/frontend
 * @desc    从前端格式创建五子棋棋谱（可选认证）
 * @access  Public (可选认证)
 */
router.post('/frontend', gomokuController.createGameFromFrontend.bind(gomokuController));

/**
 * @route   GET /api/games/gomoku/frontend
 * @desc    获取前端格式的五子棋棋谱列表
 * @access  Public
 */
router.get('/frontend', gomokuController.getGamesForFrontend.bind(gomokuController));

/**
 * @route   GET /api/games/gomoku/frontend/:id
 * @desc    获取单个前端格式的五子棋棋谱
 * @access  Public
 */
router.get('/frontend/:id', gomokuController.getGameForFrontend.bind(gomokuController));

// 将来添加其他五子棋专属路由：
// router.post('/move', validateMove, gomokuController.makeMove);
// router.get('/ai/suggest', gomokuController.suggestMove);
// router.post('/ai/move', gomokuController.aiMove);

export default router;