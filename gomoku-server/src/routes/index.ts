import { Router } from 'express';
import gameRoutes from './game.routes';
// 将来添加其他路由
// import authRoutes from './auth.routes';
// import userRoutes from './user.routes';
// import matchRoutes from './match.routes';

const router = Router();

// 挂载路由
router.use('/games', gameRoutes);
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/matches', matchRoutes);

export default router;