import { Request, Response, NextFunction } from 'express';
import { ValidationError, validate } from '../utils/validator';
import {
  userCreateSchema,
  userUpdateSchema,
  loginSchema,
  gameCreateSchema,
  gameUpdateSchema,
  matchCreateSchema,
  gameQuerySchema,
  matchQuerySchema,
  chatMessageSchema,
} from '../utils/validator';

// 验证请求体的通用中间件
export function validateBody(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = validate(schema, req.body);
      req.body = validatedData; // 用验证后的数据替换原始数据
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error.message,
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Validation failed',
        });
      }
    }
  };
}

// 验证查询参数的通用中间件
export function validateQuery(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = validate(schema, req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error.message,
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Validation failed',
        });
      }
    }
  };
}

// 验证路径参数的通用中间件
export function validateParams(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = validate(schema, req.params);
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error.message,
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Validation failed',
        });
      }
    }
  };
}

// 具体的验证中间件
export const validateUserCreate = validateBody(userCreateSchema);
export const validateUserUpdate = validateBody(userUpdateSchema);
export const validateLogin = validateBody(loginSchema);
export const validateGameCreate = validateBody(gameCreateSchema);
export const validateGameUpdate = validateBody(gameUpdateSchema);
export const validateMatchCreate = validateBody(matchCreateSchema);
export const validateGameQuery = validateQuery(gameQuerySchema);
export const validateMatchQuery = validateQuery(matchQuerySchema);

// ID验证（CUID格式）
export function validateId(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];

    // 简单的CUID格式验证
    const cuidRegex = /^c[0-9a-z]{24}$/;
    if (!cuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: `Parameter ${paramName} must be a valid CUID`,
      });
      return;
    }

    next();
  };
}

// 聊天消息验证
export const validateChatMessage = validateBody(chatMessageSchema);