import { Request, Response } from 'express';
import { prisma } from '../app';
import { logger } from '../utils/logger';
import { ApiResponse, PaginatedResponse } from '../types';

export class AdminController {
  /**
   * 获取所有用户列表（仅管理员）
   */
  async getUsers(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      // 检查用户是否为管理员
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!currentUser || currentUser.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Admin privileges required',
          timestamp: new Date().toISOString(),
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const skip = (page - 1) * pageSize;

      // 获取用户列表（排除管理员自身）
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            id: { not: userId }, // 排除当前管理员
          },
          select: {
            id: true,
            phone: true,
            email: true,
            username: true,
            avatar: true,
            rating: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({
          where: {
            id: { not: userId },
          },
        }),
      ]);

      // 获取每个用户的私有棋谱数量
      const usersWithPrivateGameCount = await Promise.all(
        users.map(async (user) => {
          const privateGameCount = await prisma.game.count({
            where: {
              authorId: user.id,
              isPublic: false,
            },
          });

          return {
            ...user,
            privateGameCount,
          };
        })
      );

      const response: PaginatedResponse<any> = {
        success: true,
        data: usersWithPrivateGameCount,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Get users error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get users',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }

  /**
   * 删除用户（仅管理员）
   */
  async deleteUser(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const targetUserId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      // 检查当前用户是否为管理员
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!currentUser || currentUser.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Admin privileges required',
          timestamp: new Date().toISOString(),
        });
      }

      // 检查目标用户是否存在
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true },
      });

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        });
      }

      // 不允许删除管理员
      if (targetUser.role === 'ADMIN') {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Cannot delete admin users',
          timestamp: new Date().toISOString(),
        });
      }

      // 删除用户的所有棋谱
      await prisma.game.deleteMany({
        where: { authorId: targetUserId },
      });

      // 删除用户
      await prisma.user.delete({
        where: { id: targetUserId },
      });

      logger.info(`User deleted: ${targetUserId} by admin ${userId}`);

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Delete user error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete user',
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  }
}

export const adminController = new AdminController();