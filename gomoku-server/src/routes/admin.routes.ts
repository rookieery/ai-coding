import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateId } from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/admin/users
 * @desc    获取所有用户列表（仅管理员）
 * @access  Private (Admin only)
 */
router.get('/users', authenticate, requireAdmin, adminController.getUsers.bind(adminController));

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    删除用户（仅管理员）
 * @access  Private (Admin only)
 */
router.delete('/users/:id', authenticate, requireAdmin, validateId(), adminController.deleteUser.bind(adminController));

export default router;