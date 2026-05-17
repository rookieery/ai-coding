import { prisma } from '../app';
import { verifyToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import type { TypedSocket } from './types';
import type { SocketUserData } from './types';

type SocketIOMiddleware = (socket: TypedSocket, next: (err?: Error) => void) => void;

/**
 * Extract JWT from socket handshake.
 * Checks socket.handshake.auth.token first, then falls back to Authorization header.
 */
function extractToken(socket: TypedSocket): string | null {
  const auth = socket.handshake.auth;
  if (auth?.token && typeof auth.token === 'string') {
    return auth.token;
  }

  const header = socket.handshake.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }

  return null;
}

/**
 * Build SocketUserData from decoded JWT payload and DB user record.
 */
function toSocketUserData(dbUser: {
  id: string;
  phone: string;
  email: string | null;
  username: string;
  role: string | null;
}): SocketUserData {
  return {
    id: dbUser.id,
    phone: dbUser.phone,
    email: dbUser.email ?? undefined,
    username: dbUser.username,
    role: dbUser.role ?? undefined,
  };
}

/**
 * Mandatory Socket.io authentication middleware.
 * Rejects the connection if the JWT is missing, invalid, or the user does not exist.
 */
export const socketAuth: SocketIOMiddleware = async (socket, next) => {
  try {
    const token = extractToken(socket);

    if (!token) {
      logger.warn(`Socket auth failed: no token provided (socket ${socket.id})`);
      next(new Error('Authentication error'));
      return;
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      logger.warn(`Socket auth failed: invalid token (socket ${socket.id})`);
      next(new Error('Authentication error'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, phone: true, email: true, username: true, role: true },
    });

    if (!user) {
      logger.warn(`Socket auth failed: user not found (socket ${socket.id}, userId ${decoded.id})`);
      next(new Error('Authentication error'));
      return;
    }

    socket.data.user = toSocketUserData(user);
    next();
  } catch (error) {
    logger.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
};

/**
 * Optional Socket.io authentication middleware.
 * Attempts to verify the JWT and attach user info, but does NOT reject the connection on failure.
 * Useful for spectator and room browsing scenarios where guests are allowed.
 */
export const optionalSocketAuth: SocketIOMiddleware = async (socket, next) => {
  try {
    const token = extractToken(socket);

    if (!token) {
      next();
      return;
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, phone: true, email: true, username: true, role: true },
    });

    if (user) {
      socket.data.user = toSocketUserData(user);
    }

    next();
  } catch (error) {
    logger.error('Optional socket auth error:', error);
    next();
  }
};
