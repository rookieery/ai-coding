/**
 * Chinese Chess (Xiangqi) Threat Detector
 *
 * Detects critical moves that must be played immediately:
 *   1. Checkmate delivery (highest priority)
 *   2. Check response (escape when in check)
 *   3. Opponent lethal threat interception (prevent opponent checkmate)
 *
 * Returns null when no critical threat exists, signaling that LLM deep
 * analysis is needed.
 */

import type { ChessPlayerColor, ChessPosition } from '../types/chess-llm.types';
import {
  generateAllLegalMoves,
  applyMove,
  isInCheck,
  isCheckmate,
  PIECE_NAMES,
  PIECE_VALUES,
  isEnemy,
} from './chessCandidateGenerator';

export interface CriticalMoveResult {
  from: ChessPosition;
  to: ChessPosition;
  reason: string;
}

/**
 * Find a critical move that the player must make.
 *
 * Priority order:
 *   1. Checkmate — deliver a killing blow immediately
 *   2. Check response — escape from check
 *   3. Threat interception — prevent opponent's imminent checkmate
 *
 * Returns null when no urgent situation is detected.
 */
export function findCriticalMove(
  board: number[][],
  playerColor: ChessPlayerColor,
): CriticalMoveResult | null {
  const opponent: ChessPlayerColor = playerColor === 'red' ? 'black' : 'red';
  const myLegalMoves = generateAllLegalMoves(board, playerColor);

  if (myLegalMoves.length === 0) return null;

  // Priority 1: Checkmate — find a move that delivers checkmate
  for (const move of myLegalMoves) {
    const newBoard = applyMove(board, move.from, move.to);
    if (isCheckmate(newBoard, opponent)) {
      const capturedCode = board[move.to.row][move.to.col];
      const suffix = capturedCode !== 0
        ? `，吃掉${PIECE_NAMES[capturedCode]}`
        : '';
      return {
        from: move.from,
        to: move.to,
        reason: `绝杀！直接将死对方${suffix}`,
      };
    }
  }

  // Priority 2: Check response — must escape check
  if (isInCheck(board, playerColor)) {
    return findCheckResponse(board, playerColor, myLegalMoves);
  }

  // Priority 3: Intercept opponent's imminent checkmate
  return findThreatInterception(board, playerColor, opponent, myLegalMoves);
}

// ─── Check Response ──────────────────────────────────────────────────────────

/**
 * When in check, find the best escape move.
 *
 * Priority: capture checking piece > block/interpose > move king.
 */
function findCheckResponse(
  board: number[][],
  playerColor: ChessPlayerColor,
  legalMoves: Array<{ from: ChessPosition; to: ChessPosition }>,
): CriticalMoveResult | null {
  if (legalMoves.length === 0) return null;

  let bestCapture: { from: ChessPosition; to: ChessPosition; name: string; value: number } | null = null;
  let bestBlock: { from: ChessPosition; to: ChessPosition } | null = null;
  let kingMove: { from: ChessPosition; to: ChessPosition } | null = null;

  for (const move of legalMoves) {
    const movingPiece = board[move.from.row][move.from.col];
    const capturedCode = board[move.to.row][move.to.col];
    const isKing = movingPiece === 1 || movingPiece === 8;

    // Check if this captures a piece that was giving check
    if (capturedCode !== 0 && isEnemy(capturedCode, playerColor)) {
      const testBoard = board.map(row => [...row]);
      testBoard[move.to.row][move.to.col] = 0;
      if (!isInCheck(testBoard, playerColor)) {
        const value = PIECE_VALUES[capturedCode] || 0;
        if (!bestCapture || value > bestCapture.value) {
          bestCapture = { from: move.from, to: move.to, name: PIECE_NAMES[capturedCode], value };
        }
        continue;
      }
    }

    if (isKing) {
      if (!kingMove) kingMove = { from: move.from, to: move.to };
      continue;
    }

    if (!bestBlock) bestBlock = { from: move.from, to: move.to };
  }

  if (bestCapture) {
    return {
      from: bestCapture.from,
      to: bestCapture.to,
      reason: `必须应将：吃掉${bestCapture.name}解除将军`,
    };
  }

  if (bestBlock) {
    return {
      from: bestBlock.from,
      to: bestBlock.to,
      reason: '必须应将：垫将/挡将',
    };
  }

  if (kingMove) {
    const kingName = playerColor === 'red' ? '帅' : '将';
    return {
      from: kingMove.from,
      to: kingMove.to,
      reason: `必须应将：${kingName}回避`,
    };
  }

  return null;
}

// ─── Threat Interception ─────────────────────────────────────────────────────

/**
 * Check if the opponent has an imminent checkmate move, and if so,
 * find a counter-move that prevents it.
 */
function findThreatInterception(
  board: number[][],
  playerColor: ChessPlayerColor,
  opponent: ChessPlayerColor,
  myLegalMoves: Array<{ from: ChessPosition; to: ChessPosition }>,
): CriticalMoveResult | null {
  const opponentLegalMoves = generateAllLegalMoves(board, opponent);

  // Find an opponent move that would checkmate us
  let threatPieceName = '';
  for (const oppMove of opponentLegalMoves) {
    const oppBoard = applyMove(board, oppMove.from, oppMove.to);
    if (isInCheck(oppBoard, playerColor) && isCheckmate(oppBoard, playerColor)) {
      threatPieceName = PIECE_NAMES[board[oppMove.from.row][oppMove.from.col]];
      break;
    }
  }

  if (!threatPieceName) return null;

  // Find our moves that prevent the checkmate, categorized by priority
  let captureMove: CriticalMoveResult | null = null;
  let captureValue = -1;
  let blockMove: CriticalMoveResult | null = null;
  let fleeMove: CriticalMoveResult | null = null;

  for (const move of myLegalMoves) {
    if (!preventsAnyCheckmate(board, move, playerColor, opponent)) continue;

    const movingPiece = board[move.from.row][move.from.col];
    const isKing = movingPiece === 1 || movingPiece === 8;

    if (isKing) {
      if (!fleeMove) {
        const kingName = playerColor === 'red' ? '帅' : '将';
        fleeMove = {
          from: move.from,
          to: move.to,
          reason: `紧急防守：对方即将用${threatPieceName}绝杀，${kingName}提前回避`,
        };
      }
      continue;
    }

    // Check if this captures the threatening piece
    const capturedCode = board[move.to.row][move.to.col];
    if (capturedCode !== 0 && isEnemy(capturedCode, playerColor)) {
      const value = PIECE_VALUES[capturedCode] || 0;
      if (value > captureValue) {
        captureValue = value;
        captureMove = {
          from: move.from,
          to: move.to,
          reason: `紧急防守：对方即将用${threatPieceName}绝杀，吃掉威胁棋子`,
        };
      }
      continue;
    }

    if (!blockMove) {
      blockMove = {
        from: move.from,
        to: move.to,
        reason: `紧急防守：对方即将用${threatPieceName}绝杀，必须拦截`,
      };
    }
  }

  return captureMove || blockMove || fleeMove;
}

/**
 * Check whether making `move` prevents the opponent from delivering
 * checkmate on their next turn.
 */
function preventsAnyCheckmate(
  board: number[][],
  move: { from: ChessPosition; to: ChessPosition },
  playerColor: ChessPlayerColor,
  opponent: ChessPlayerColor,
): boolean {
  const newBoard = applyMove(board, move.from, move.to);
  const oppMoves = generateAllLegalMoves(newBoard, opponent);

  for (const om of oppMoves) {
    const nb = applyMove(newBoard, om.from, om.to);
    if (isInCheck(nb, playerColor) && isCheckmate(nb, playerColor)) {
      return false;
    }
  }

  return true;
}
