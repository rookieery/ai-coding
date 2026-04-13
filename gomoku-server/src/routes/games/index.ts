import { Router } from 'express';
import gomokuRoutes from './gomoku.routes';
import chineseChessRoutes from './chinese-chess.routes';

const router = Router();

// 挂载游戏特定路由
router.use('/gomoku', gomokuRoutes);
router.use('/chinese-chess', chineseChessRoutes);

export default router;