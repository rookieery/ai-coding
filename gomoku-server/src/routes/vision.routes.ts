import { Router, Request, Response } from 'express';
import { unifiedVisionService } from '../services/unified-vision.service';
import { visionService } from '../services/vision.service';
import { chessVisionService } from '../services/chess-vision.service';
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
 * @route   POST /api/vision/recognize/stream
 * @desc    Stream board recognition with SSE (thinking/answer/board_data events)
 * @access  Public
 */
router.post('/recognize/stream', (req: Request, res: Response) => {
  const { imageBase64 } = req.body as RecognizeRequest;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.write(`data: ${JSON.stringify({ error: 'Bad Request', message: 'imageBase64 is required and must be a string' })}\n\n`);
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let clientDisconnected = false;
  res.on('close', () => {
    clientDisconnected = true;
    clearInterval(keepaliveTimer);
  });

  const keepaliveTimer = setInterval(() => {
    if (!clientDisconnected) {
      res.write(': keepalive\n\n');
    }
  }, 15000);

  let answerContent = '';

  unifiedVisionService.createStreamRecognition(
    imageBase64,
    (event) => {
      if (clientDisconnected) return;

      if (event.type === 'answer') {
        answerContent += event.text;
      }

      res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
  ).then(() => {
    clearInterval(keepaliveTimer);
    logger.info(`Stream completed, answer length: ${answerContent.length}`);
    if (clientDisconnected) {
      res.end();
      return;
    }

    const detectedType = answerContent.includes('chinese_chess') ? 'chinese_chess' : 'gomoku';
    const parsed = detectedType === 'chinese_chess'
      ? chessVisionService.parseVisionResponse(answerContent)
      : visionService.parseVisionResponse(answerContent);

    if (parsed) {
      res.write(`data: ${JSON.stringify({
        type: 'board_data',
        data: { boardType: detectedType, candidates: parsed.candidates },
      })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }).catch((error) => {
    clearInterval(keepaliveTimer);
    logger.error('Streaming board recognition error:', error);
    if (!clientDisconnected) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ error: 'Internal Server Error', message: `Failed to stream board recognition: ${errorMessage}` })}\n\n`);
    }
    res.end();
  });
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
