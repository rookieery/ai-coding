import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/rooms
 * @desc    Get a paginated list of public rooms
 * @access  Public (optional auth)
 */
router.get('/', optionalAuthenticate, roomController.getRooms.bind(roomController));

/**
 * @route   GET /api/rooms/:id
 * @desc    Get room details by ID
 * @access  Public (optional auth)
 */
router.get('/:id', optionalAuthenticate, roomController.getRoomById.bind(roomController));

export default router;
