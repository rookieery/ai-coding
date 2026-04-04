import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { optionalAuthenticate } from '../middleware/auth';
import { validateChatMessage } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/chat
 * @desc    发送聊天消息并获取AI回复
 * @access  Public (可选认证)
 */
router.post('/', optionalAuthenticate, validateChatMessage, chatController.chat.bind(chatController));

/**
 * @route   POST /api/chat/stream
 * @desc    发送聊天消息并获取流式AI回复
 * @access  Public (可选认证)
 */
router.post('/stream', optionalAuthenticate, validateChatMessage, chatController.chatStream.bind(chatController));

export default router;