import { Router } from 'express';
import gameRoutes from './game.routes';
import chatRoutes from './chat.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
// 将来添加其他路由
// import userRoutes from './user.routes';
// import matchRoutes from './match.routes');

const router = Router();

// 挂载路由
router.use('/games', gameRoutes);
router.use('/chat', chatRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
// router.use('/users', userRoutes);
// router.use('/matches', matchRoutes);

export default router;