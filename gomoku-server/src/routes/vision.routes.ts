import { Router, Request, Response } from 'express';
import { unifiedVisionService } from '../services/unified-vision.service';
import { logger } from '../utils/logger';

const router = Router();

interface RecognizeRequest {
  imageBase64: string;
}

/**
 * @route   POST /api/vision/recognize
 * @desc    Recognize board state from base64 image using Doubao vision model
 * @access  Public
 */
router.post('/recognize', async (req: Request, res: Response) => {
  try {
    const { imageBase64 } = req.body as RecognizeRequest;

    if (!imageBase64) {
      res.status(400).json({
        success: false,
        message: 'imageBase64 is required',
      });
      return;
    }

    if (typeof imageBase64 !== 'string') {
      res.status(400).json({
        success: false,
        message: 'imageBase64 must be a string',
      });
      return;
    }

    logger.info('Received board recognition request');

    const result = await unifiedVisionService.recognizeBoard(imageBase64);

    res.json({
      success: true,
      data: result,
      message: 'Board recognized successfully',
    });
  } catch (error) {
    logger.error('Board recognition error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      message: `Failed to recognize board: ${errorMessage}`,
    });
  }
});

/**
 * @route   GET /api/vision/health
 * @desc    Vision service health check
 * @access  Public
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Vision service is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;