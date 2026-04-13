import { Router } from 'express';
import { chineseChessController } from '../../controllers/chinese-chess.controller';

const router = Router();

/**
 * @route   GET /api/games/chinese-chess/health
 * @desc    中国象棋模块健康检查
 * @access  Public
 */
router.get('/health', chineseChessController.healthCheck.bind(chineseChessController));

// 将来添加中国象棋专属路由：
// router.post('/move', validateChessMove, chineseChessController.makeMove);
// router.get('/ai/suggest', chineseChessController.suggestMove);
// router.post('/ai/move', chineseChessController.aiMove);
// router.post('/validate', chineseChessController.validateMove);

// 中国象棋前端格式棋谱路由（如果需要）
// router.post('/frontend', chineseChessController.createGameFromFrontend.bind(chineseChessController));
// router.get('/frontend', chineseChessController.getGamesForFrontend.bind(chineseChessController));
// router.get('/frontend/:id', chineseChessController.getGameForFrontend.bind(chineseChessController));

export default router;