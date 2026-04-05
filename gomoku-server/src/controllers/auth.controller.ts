import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export class AuthController {
  /**
   * 用户注册
   */
  async register(req: Request, res: Response) {
    try {
      const { phone, email, username, password, avatar } = req.body;

      // 验证必要字段
      if (!phone || !username || !password) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Missing required fields: phone, username, password',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      // 验证手机号格式（简单验证）
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Invalid phone number format',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      // 验证密码长度
      if (password.length < 6) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Password must be at least 6 characters',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      const authResponse = await authService.register({
        phone,
        email,
        username,
        password,
        avatar,
      });

      const response: ApiResponse = {
        success: true,
        data: authResponse,
        message: 'Registration successful',
        timestamp: new Date().toISOString(),
      };

      return res.status(201).json(response);
    } catch (error) {
      logger.error('Registration error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Registration failed',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }

  /**
   * 用户登录
   */
  async login(req: Request, res: Response) {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Missing required fields: phone, password',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      const authResponse = await authService.login({
        phone,
        password,
      });

      const response: ApiResponse = {
        success: true,
        data: authResponse,
        message: 'Login successful',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      const statusCode = errorMessage.includes('Invalid') ? 401 : 500;

      const response: ApiResponse = {
        success: false,
        error: statusCode === 401 ? 'Unauthorized' : 'Internal Server Error',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      };

      return res.status(statusCode).json(response);
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required',
          timestamp: new Date().toISOString(),
        };
        return res.status(401).json(response);
      }

      const user = await authService.getCurrentUser(userId);

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'Not Found',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Get current user error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get user information',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { username, avatar, email } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required',
          timestamp: new Date().toISOString(),
        };
        return res.status(401).json(response);
      }

      // 至少提供一个更新字段
      if (!username && !avatar && !email) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'At least one field (username, avatar, email) must be provided',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      const user = await authService.updateUser(userId, { username, avatar, email });

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User updated successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Update user error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      const statusCode = errorMessage.includes('already') ? 409 : 500;

      const response: ApiResponse = {
        success: false,
        error: statusCode === 409 ? 'Conflict' : 'Internal Server Error',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      };

      return res.status(statusCode).json(response);
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { oldPassword, newPassword } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required',
          timestamp: new Date().toISOString(),
        };
        return res.status(401).json(response);
      }

      if (!oldPassword || !newPassword) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'Missing required fields: oldPassword, newPassword',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      if (newPassword.length < 6) {
        const response: ApiResponse = {
          success: false,
          error: 'Bad Request',
          message: 'New password must be at least 6 characters',
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      await authService.changePassword(userId, oldPassword, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Change password error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      const statusCode = errorMessage.includes('incorrect') || errorMessage.includes('not found') ? 400 : 500;

      const response: ApiResponse = {
        success: false,
        error: statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      };

      return res.status(statusCode).json(response);
    }
  }

  /**
   * 用户登出（客户端需删除token）
   */
  async logout(_req: Request, res: Response) {
    // 由于JWT是无状态的，服务器端不需要特殊处理
    // 客户端只需删除存储的token即可
    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  }
}

export const authController = new AuthController();