import { Router } from 'express';
import gameRoutes from './game.routes';
import chatRoutes from './chat.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import gamesRoutes from './games';
import visionRoutes from './vision.routes';

const router = Router();

// 挂载路由
router.use('/games', gameRoutes);
router.use('/games', gamesRoutes);
router.use('/chat', chatRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/vision', visionRoutes);

export default router;