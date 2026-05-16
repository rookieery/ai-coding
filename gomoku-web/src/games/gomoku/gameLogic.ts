// Gomoku Game Logic - Public API
// Re-exports from sub-modules for backward compatibility.
// Contains the top-level AI entry point (findBestMove).

import { getOpeningMove } from "./openingBook";
import { gomokuNN } from "./nn/GomokuNN";

// ── Re-exports from sub-modules ─────────────────────────────────────
export { BOARD_SIZE, EMPTY, BLACK, WHITE, isStarPoint, checkWin, checkDraw, getForbiddenType } from "./gameConstants";
export type { Difficulty, RuleMode, Move } from "./gameConstants";

export { evaluatePoint } from "./gameEvaluation";

export { generateMoves } from "./gameMoves";

export { minimax } from "./gameSearch";

// ── Internal imports ────────────────────────────────────────────────
import { BOARD_SIZE, EMPTY, BLACK, WHITE } from "./gameConstants";
import type { Difficulty, RuleMode } from "./gameConstants";
import { evaluatePoint } from "./gameEvaluation";
import { generateMoves } from "./gameMoves";
import { getMinimaxMove } from "./gameSearch";

// ── Top-level AI Entry Point ────────────────────────────────────────
export const findBestMove = async (
  board: number[][],
  aiPlayer: number,
  difficulty: Difficulty = "intermediate",
  onThinking?: (path: {r: number, c: number, player: number}[]) => void,
  ruleMode: RuleMode = "standard"
) => {
  if (difficulty === "advanced" || difficulty === "expert") {
    const openingMove = getOpeningMove(board);
    if (openingMove) return openingMove;
  }

  const humanPlayer = aiPlayer === BLACK ? WHITE : BLACK;
  const moves = generateMoves(board, aiPlayer, humanPlayer, aiPlayer, ruleMode);

  if (moves.length === 0) return null;

  if (difficulty !== "beginner") {
    for (const move of moves) {
      if (evaluatePoint(board, move.r, move.c, aiPlayer) >= 1000000)
        return move;
    }
    for (const move of moves) {
      if (evaluatePoint(board, move.r, move.c, humanPlayer) >= 1000000)
        return move;
    }
  }

  if (difficulty === "beginner") {
    const topN = Math.min(5, moves.length);
    return moves[Math.floor(Math.random() * topN)];
  } else if (difficulty === "intermediate") {
    return moves[0];
  } else if (difficulty === "advanced") {
    return getMinimaxMove(board, aiPlayer, humanPlayer, 8, onThinking, ruleMode);
  } else if (difficulty === "expert") {
    // Increase depth for early game to ensure sure-win calculation
    const pieceCount = board.flat().filter(c => c !== EMPTY).length;
    const depth = pieceCount < 20 ? 14 : 12;
    return getMinimaxMove(board, aiPlayer, humanPlayer, depth, onThinking, ruleMode);
  } else if (difficulty === "neural") {
    // Use the Neural Network to predict the best move.
    const { policy } = await gomokuNN.predict(board, aiPlayer);

    // Sort moves by policy probability
    moves.sort((a, b) => {
      const probA = policy[a.r * BOARD_SIZE + a.c];
      const probB = policy[b.r * BOARD_SIZE + b.c];
      return probB - probA;
    });

    const topN = Math.min(3, moves.length);
    return moves[Math.floor(Math.random() * topN)];
  }

  return moves[0];
};
