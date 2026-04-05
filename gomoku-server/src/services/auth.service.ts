import { Prisma } from '@prisma/client';
import { prisma } from '../app';
import { generateToken } from '../middleware/auth';
import { UserCreateInput, LoginCredentials, AuthResponse, User } from '../types';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

export class AuthService {
  /**
   * 用户注册
   */
  async register(userData: UserCreateInput): Promise<AuthResponse> {
    try {
      // 检查手机号是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { phone: userData.phone },
      });

      if (existingUser) {
        throw new Error('Phone number already registered');
      }

      // 检查用户名是否已存在
      const existingUsername = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (existingUsername) {
        throw new Error('Username already taken');
      }

      // 密码加密
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // 创建用户
      const user = await prisma.user.create({
        data: {
          phone: userData.phone,
          email: userData.email,
          username: userData.username,
          password: hashedPassword,
          avatar: userData.avatar,
          rating: 1200, // 默认等级分
        },
        select: {
          id: true,
          phone: true,
          email: true,
          username: true,
          avatar: true,
          rating: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 生成JWT令牌
      const token = generateToken(user.id, user.phone, user.username);

      logger.info(`User registered: ${user.phone} (${user.username})`);

      return {
        user: this.mapToUser(user),
        token,
        expiresIn: 7 * 24 * 60 * 60, // 7天，单位秒
      };
    } catch (error) {
      logger.error('Registration error:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // 处理Prisma唯一约束错误
        if (error.code === 'P2002') {
          const target = (error.meta as any)?.target?.[0];
          if (target === 'phone') {
            throw new Error('Phone number already registered');
          } else if (target === 'username') {
            throw new Error('Username already taken');
          } else if (target === 'email') {
            throw new Error('Email already registered');
          }
        }
      }
      throw error instanceof Error ? error : new Error('Registration failed');
    }
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // 查找用户（通过手机号）
      const user = await prisma.user.findUnique({
        where: { phone: credentials.phone },
        select: {
          id: true,
          phone: true,
          email: true,
          username: true,
          password: true,
          avatar: true,
          rating: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('Invalid phone or password');
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(credentials.password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid phone or password');
      }

      // 生成JWT令牌
      const token = generateToken(user.id, user.phone, user.username);

      logger.info(`User logged in: ${user.phone} (${user.username})`);

      // 移除密码字段
      const { password, ...userWithoutPassword } = user;

      return {
        user: this.mapToUser(userWithoutPassword),
        token,
        expiresIn: 7 * 24 * 60 * 60,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error instanceof Error ? error : new Error('Login failed');
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          email: true,
          username: true,
          avatar: true,
          rating: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return null;
      }

      return this.mapToUser(user);
    } catch (error) {
      logger.error('Get current user error:', error);
      throw new Error('Failed to get user information');
    }
  }

  /**
   * 更新用户信息（支持更新用户名、头像等）
   */
  async updateUser(userId: string, updateData: {
    username?: string;
    avatar?: string;
    email?: string;
  }): Promise<User> {
    try {
      // 如果更新用户名，检查是否已被占用
      if (updateData.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username: updateData.username,
            id: { not: userId },
          },
        });

        if (existingUser) {
          throw new Error('Username already taken');
        }
      }

      // 如果更新邮箱，检查是否已被占用
      if (updateData.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: updateData.email,
            id: { not: userId },
          },
        });

        if (existingUser) {
          throw new Error('Email already registered');
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(updateData.username && { username: updateData.username }),
          ...(updateData.avatar && { avatar: updateData.avatar }),
          ...(updateData.email && { email: updateData.email }),
        },
        select: {
          id: true,
          phone: true,
          email: true,
          username: true,
          avatar: true,
          rating: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info(`User updated: ${userId}`);

      return this.mapToUser(user);
    } catch (error) {
      logger.error('Update user error:', error);
      throw error instanceof Error ? error : new Error('Failed to update user');
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      // 获取用户当前密码
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 验证旧密码
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // 加密新密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // 更新密码
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      logger.info(`Password changed for user: ${userId}`);
    } catch (error) {
      logger.error('Change password error:', error);
      throw error instanceof Error ? error : new Error('Failed to change password');
    }
  }

  /**
   * 将Prisma用户对象转换为User类型
   */
  private mapToUser(user: any): User {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email || undefined,
      username: user.username,
      avatar: user.avatar || undefined,
      rating: user.rating,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();