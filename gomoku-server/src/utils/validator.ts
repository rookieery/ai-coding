import { z } from 'zod';

// 用户验证
export const userCreateSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  avatar: z.string().url('Invalid URL format').optional(),
});

export const userUpdateSchema = userCreateSchema.partial();

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// 棋谱验证
export const moveSchema = z.object({
  x: z.number().int().min(0).max(14), // 假设15x15棋盘
  y: z.number().int().min(0).max(14),
  color: z.enum(['black', 'white']),
  step: z.number().int().min(1),
  timestamp: z.number().int().optional(),
});

export const gameCreateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
  boardSize: z.number().int().min(5).max(30).default(15),
  moves: z.array(moveSchema).default([]),
  result: z.enum(['black_win', 'white_win', 'draw']).optional(),
  playerBlack: z.string().max(100).optional(),
  playerWhite: z.string().max(100).optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string().max(50)).default([]),
});

export const gameUpdateSchema = gameCreateSchema.partial();

// 对局验证
export const matchCreateSchema = z.object({
  type: z.enum(['human-vs-human', 'human-vs-ai', 'ai-vs-ai']),
  mode: z.enum(['standard', 'renju', 'free-style']),
  boardSize: z.number().int().min(5).max(30).default(15),

  // 玩家信息
  playerBlackId: z.string().cuid().optional().nullable(),
  playerBlackName: z.string().min(1, 'Black player name is required').max(100),
  playerBlackType: z.enum(['human', 'ai']),
  playerWhiteId: z.string().cuid().optional().nullable(),
  playerWhiteName: z.string().min(1, 'White player name is required').max(100),
  playerWhiteType: z.enum(['human', 'ai']),

  // AI配置
  aiLevelBlack: z.number().int().min(1).max(10).optional(),
  aiLevelWhite: z.number().int().min(1).max(10).optional(),

  // 对局数据
  moves: z.array(moveSchema).min(1, 'At least one move is required'),
  result: z.enum(['black_win', 'white_win', 'draw']).optional(),
  duration: z.number().int().min(0).optional(),

  // 统计
  blackCaptures: z.number().int().min(0).default(0),
  whiteCaptures: z.number().int().min(0).default(0),
});

// 查询参数验证
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const gameQuerySchema = paginationSchema.extend({
  authorId: z.string().cuid().optional(),
  isPublic: z.coerce.boolean().optional(),
  tags: z.string().transform(str => str.split(',')).optional(),
  search: z.string().optional(),
});

export const matchQuerySchema = paginationSchema.extend({
  playerId: z.string().cuid().optional(),
  type: z.enum(['human-vs-human', 'human-vs-ai', 'ai-vs-ai']).optional(),
  mode: z.enum(['standard', 'renju', 'free-style']).optional(),
  result: z.string().optional(),
});

// 聊天消息验证
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be at most 2000 characters'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]).optional(),
});

// 验证函数
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', errors);
    }
    throw error;
  }
}

// 自定义错误类
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}