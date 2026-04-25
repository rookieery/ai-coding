import { Router } from 'express';
import { gomokuController } from '../../controllers/gomoku.controller';
import { llmAiController } from '../../controllers/llm-ai.controller';
import { optionalAuthenticate } from '../../middleware/auth';
import { validateId } from '../../middleware/validation';

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

/**
 * @route   POST /api/games/gomoku/frontend
 * @desc    从前端格式创建五子棋棋谱（可选认证）
 * @access  Public (可选认证)
 */
router.post('/frontend', optionalAuthenticate, gomokuController.createGameFromFrontend.bind(gomokuController));

/**
 * @route   GET /api/games/gomoku/frontend
 * @desc    获取前端格式的五子棋棋谱列表
 * @access  Public (可选认证)
 */
router.get('/frontend', optionalAuthenticate, gomokuController.getGamesForFrontend.bind(gomokuController));

/**
 * @route   GET /api/games/gomoku/frontend/:id
 * @desc    获取单个前端格式的五子棋棋谱
 * @access  Public
 */
router.get('/frontend/:id', optionalAuthenticate, validateId(), gomokuController.getGameForFrontend.bind(gomokuController));

/**
 * @route   GET /api/games/gomoku/llm/health
 * @desc    LLM AI服务健康检查
 * @access  Public
 */
router.get('/llm/health', llmAiController.healthCheck.bind(llmAiController));

/**
 * @route   POST /api/games/gomoku/llm/move
 * @desc    使用LLM AI生成五子棋落子
 * @access  Public
 */
router.post('/llm/move', llmAiController.generateMove.bind(llmAiController));

export default router;