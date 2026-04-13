import { Router } from 'express';
import { gameController } from '../controllers/game.controller';
import { gomokuController } from '../controllers/gomoku.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import {
  validateGameCreate,
  validateGameUpdate,
  validateGameQuery,
  validateId,
} from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/games
 * @desc    获取棋谱列表
 * @access  Public (可选认证)
 */
router.get('/', optionalAuthenticate, validateGameQuery, gameController.getGames.bind(gameController));

/**
 * @route   GET /api/games/my
 * @desc    获取当前用户的棋谱
 * @access  Private
 */
router.get('/my', authenticate, gameController.getMyGames.bind(gameController));

/**
 * @route   POST /api/games/frontend
 * @desc    从前端格式创建棋谱（可选认证）
 * @access  Public (可选认证)
 */
router.post('/frontend', optionalAuthenticate, gomokuController.createGameFromFrontend.bind(gomokuController));

/**
 * @route   GET /api/games/frontend
 * @desc    获取前端格式的棋谱列表
 * @access  Public
 */
router.get('/frontend', gomokuController.getGamesForFrontend.bind(gomokuController));

/**
 * @route   GET /api/games/:id
 * @desc    获取单个棋谱
 * @access  Public
 */
router.get('/:id', validateId(), gameController.getGame.bind(gameController));

/**
 * @route   POST /api/games
 * @desc    创建新棋谱
 * @access  Private
 */
router.post('/', authenticate, validateGameCreate, gameController.createGame.bind(gameController));

/**
 * @route   PUT /api/games/:id
 * @desc    更新棋谱
 * @access  Private (仅作者或管理员)
 */
router.put('/:id', optionalAuthenticate, validateId(), validateGameUpdate, gameController.updateGame.bind(gameController));

/**
 * @route   DELETE /api/games/:id
 * @desc    删除棋谱
 * @access  Private (仅作者或管理员)
 */
router.delete('/:id', optionalAuthenticate, validateId(), gameController.deleteGame.bind(gameController));


/**
 * @route   GET /api/games/frontend/:id
 * @desc    获取单个前端格式的棋谱
 * @access  Public
 */
router.get('/frontend/:id', validateId(), gomokuController.getGameForFrontend.bind(gomokuController));

export default router;