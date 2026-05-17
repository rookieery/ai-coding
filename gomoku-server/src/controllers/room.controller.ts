import { Request, Response } from 'express';
import { roomService } from '../services/room.service';
import { logger } from '../utils/logger';
import { ApiResponse, PaginatedResponse } from '../types';
import type { RoomInfo } from '../socket/types';

export class RoomController {
  /**
   * GET /api/rooms
   * Get a paginated list of public rooms.
   * Access: Public (optional auth).
   */
  async getRooms(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

      const result = await roomService.getRoomList(page, pageSize);

      const response: PaginatedResponse<RoomInfo> = {
        success: true,
        data: result.rooms,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get rooms error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch rooms',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/rooms/:id
   * Get room details by ID.
   * Access: Public (optional auth).
   */
  async getRoomById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await roomService.getRoomById(id);

      const response: ApiResponse<RoomInfo> = {
        success: true,
        data: room,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get room by ID error:', error);

      if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') {
        const response: ApiResponse = {
          success: false,
          error: 'Not Found',
          message: 'Room not found',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch room',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
}

export const roomController = new RoomController();
