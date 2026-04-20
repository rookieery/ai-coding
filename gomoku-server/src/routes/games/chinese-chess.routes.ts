import { Router } from 'express';
import { chineseChessController } from '../../controllers/chinese-chess.controller';
import { optionalAuthenticate, authenticate } from '../../middleware/auth';
import { validateId } from '../../middleware/validation';

const router = Router();

/**
 * @route   GET /api/games/chinese-chess/health
 * @desc    中国象棋模块健康检查
 * @access  Public
 */
router.get('/health', chineseChessController.healthCheck.bind(chineseChessController));

/**
 * @route   POST /api/games/chinese-chess/frontend
 * @desc    从前端格式创建中国象棋棋谱（可选认证）
 * @access  Public (可选认证)
 */
router.post('/frontend', optionalAuthenticate, chineseChessController.createGameFromFrontend.bind(chineseChessController));

/**
 * @route   GET /api/games/chinese-chess/frontend
 * @desc    获取前端格式的中国象棋棋谱列表
 * @access  Public (可选认证)
 */
router.get('/frontend', optionalAuthenticate, chineseChessController.getGamesForFrontend.bind(chineseChessController));

/**
 * @route   GET /api/games/chinese-chess/frontend/:id
 * @desc    获取单个前端格式的中国象棋棋谱
 * @access  Public
 */
router.get('/frontend/:id', optionalAuthenticate, validateId(), chineseChessController.getGameForFrontend.bind(chineseChessController));

/**
 * @route   DELETE /api/games/chinese-chess/:id
 * @desc    删除中国象棋棋谱
 * @access  Private (仅作者或管理员)
 */
router.delete('/:id', authenticate, validateId(), chineseChessController.deleteGame.bind(chineseChessController));

export default router;
