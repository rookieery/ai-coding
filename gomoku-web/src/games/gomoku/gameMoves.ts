// Move generation for Gomoku AI
// Generates candidate moves sorted by heuristic score,
// respecting forbidden-move constraints in Renju mode.

import { BOARD_SIZE, EMPTY, BLACK, getForbiddenType } from "./gameConstants";
import type { RuleMode } from "./gameConstants";
import { evaluatePoint } from "./gameEvaluation";

export const generateMoves = (
  board: number[][],
  aiPlayer: number,
  humanPlayer: number,
  currentPlayer: number = aiPlayer,
  ruleMode: RuleMode = "standard"
) => {
  const moves: { r: number; c: number; score: number }[] = [];
  const hasPiece = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(false),
  );

  let pieceCount = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) {
        pieceCount++;
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            const nr = r + i,
              nc = c + j;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
              hasPiece[nr][nc] = true;
            }
          }
        }
      }
    }
  }

  if (pieceCount === 0) {
    return [{ r: 7, c: 7, score: 0 }];
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY && hasPiece[r][c]) {
        if (ruleMode === "renju" && currentPlayer === BLACK) {
          if (getForbiddenType(board, r, c, BLACK) !== null) {
            continue;
          }
        }
        const attackScore = evaluatePoint(board, r, c, aiPlayer);
        const defenseScore = evaluatePoint(board, r, c, humanPlayer);
        // Prioritize attack slightly more to encourage "making moves" and "killing moves"
        moves.push({ r, c, score: attackScore * 1.1 + defenseScore });
      }
    }
  }

  moves.sort((a, b) => b.score - a.score);
  return moves;
};
