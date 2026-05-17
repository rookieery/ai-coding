import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/users/leaderboard
 * @desc    Get leaderboard (Top 50 by rating)
 * @access  Public (optional auth)
 */
router.get('/leaderboard', optionalAuthenticate, userController.getLeaderboard.bind(userController));

/**
 * @route   GET /api/users/:id/rating
 * @desc    Get user rating info (rating, games, win rate)
 * @access  Public (optional auth)
 */
router.get('/:id/rating', optionalAuthenticate, userController.getUserRating.bind(userController));

export default router;
