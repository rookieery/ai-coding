import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import {
  validateRegister,
  validateLogin,
  validateUpdateUser,
  validateChangePassword,
} from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', validateRegister, authController.register.bind(authController));

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', validateLogin, authController.login.bind(authController));

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser.bind(authController));

/**
 * @route   PUT /api/auth/me
 * @desc    更新当前用户信息（用户名、头像、邮箱）
 * @access  Private
 */
router.put('/me', authenticate, validateUpdateUser, authController.updateUser.bind(authController));

/**
 * @route   POST /api/auth/change-password
 * @desc    修改密码
 * @access  Private
 */
router.post('/change-password', authenticate, validateChangePassword, authController.changePassword.bind(authController));

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出（客户端删除token）
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;