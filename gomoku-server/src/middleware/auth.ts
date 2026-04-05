import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { config } from '../config';
import { logger } from '../utils/logger';

// 扩展Request类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        email?: string;
        username: string;
      };
      token?: string;
    }
  }
}

// 生成JWT令牌
export function generateToken(userId: string, phone: string, username: string): string {
  return jwt.sign(
    { id: userId, phone, username },
    config.jwt.secret as string,
    { expiresIn: config.jwt.expiresIn as any }
  );
}

// 验证JWT令牌
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, config.jwt.secret as string);
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
}

// 认证中间件
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided or invalid token format',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    // 检查用户是否仍然存在
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, phone: true, email: true, username: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User no longer exists',
      });
      return;
    }

    // 将用户信息附加到请求对象（处理null值）
    req.user = {
      id: user.id,
      phone: user.phone,
      email: user.email || undefined,
      username: user.username,
    };
    req.token = token;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

// 可选认证（不强制要求，但有用户信息时会附加）
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (decoded) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, phone: true, email: true, username: true },
        });

        if (user) {
          req.user = {
            id: user.id,
            phone: user.phone,
            email: user.email || undefined,
            username: user.username,
          };
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next(); // 不阻止请求继续
  }
}

// 管理员权限检查
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin privileges required',
      });
      return;
    }

    // 查询数据库检查用户角色
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin privileges required',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to verify admin privileges',
    });
  }
}