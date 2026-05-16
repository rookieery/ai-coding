// Evaluation and scoring functions for Gomoku AI
// Includes score maps, line pattern scoring, point evaluation,
// board state evaluation, and forcing-move detection.

import { BOARD_SIZE, EMPTY } from "./gameConstants";
import type { RuleMode } from "./gameConstants";

// ── Incremental Score Maps ──────────────────────────────────────────
const aiScoreMap: number[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
const humanScoreMap: number[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
let totalAiScore = 0;
let totalHumanScore = 0;

export const getScoreMaps = () => ({
  aiScoreMap,
  humanScoreMap,
  totalAiScore,
  totalHumanScore,
});

const updateScoreMap = (board: number[][], r: number, c: number, aiPlayer: number, humanPlayer: number) => {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    for (let i = -4; i <= 4; i++) {
      const nr = r + i * dr;
      const nc = c + i * dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc] === EMPTY) {
          totalAiScore -= aiScoreMap[nr][nc];
          totalHumanScore -= humanScoreMap[nr][nc];

          aiScoreMap[nr][nc] = evaluatePoint(board, nr, nc, aiPlayer);
          humanScoreMap[nr][nc] = evaluatePoint(board, nr, nc, humanPlayer);

          totalAiScore += aiScoreMap[nr][nc];
          totalHumanScore += humanScoreMap[nr][nc];
        } else {
          // If it's a piece, its score map value should be 0
          totalAiScore -= aiScoreMap[nr][nc];
          totalHumanScore -= humanScoreMap[nr][nc];
          aiScoreMap[nr][nc] = 0;
          humanScoreMap[nr][nc] = 0;
        }
      }
    }
  }
};

export const initializeScoreMaps = (board: number[][], aiPlayer: number, humanPlayer: number) => {
  totalAiScore = 0;
  totalHumanScore = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY) {
        aiScoreMap[r][c] = evaluatePoint(board, r, c, aiPlayer);
        humanScoreMap[r][c] = evaluatePoint(board, r, c, humanPlayer);
        totalAiScore += aiScoreMap[r][c];
        totalHumanScore += humanScoreMap[r][c];
      } else {
        aiScoreMap[r][c] = 0;
        humanScoreMap[r][c] = 0;
      }
    }
  }
};

// ── Line Pattern Scoring ────────────────────────────────────────────
const getLineScore = (s: string): number => {
  let score = 0;
  if (s.includes("XXXXX")) return 1000000; // Five
  if (s.includes(".XXXX.")) return 100000; // Live Four

  let dead4 = 0;
  if (s.includes("OXXXX.") || s.includes(".XXXXO")) dead4++;
  if (s.includes("X.XXX") || s.includes("XXX.X") || s.includes("XX.XX"))
    dead4++;
  score += dead4 * 12000; // Dead Four (Forcing move)

  let live3 = 0;
  if (
    s.includes("..XXX.") ||
    s.includes(".XXX..") ||
    s.includes(".X.XX.") ||
    s.includes(".XX.X.")
  )
    live3++;
  score += live3 * 10000; // Live Three

  let dead3 = 0;
  if (
    s.includes("OXXX..") ||
    s.includes("..XXXO") ||
    s.includes("O.XXX.") ||
    s.includes(".XXX.O") ||
    s.includes("OX.XX.") ||
    s.includes(".XX.XO") ||
    s.includes("OXX.X.") ||
    s.includes(".X.XXO") ||
    s.includes("X..XX") ||
    s.includes("XX..X") ||
    s.includes("X.X.X")
  )
    dead3++;
  score += dead3 * 3000; // Dead Three

  let live2 = 0;
  if (
    s.includes("...XX.") ||
    s.includes("..XX..") ||
    s.includes(".XX...") ||
    s.includes("..X.X.") ||
    s.includes(".X.X..") ||
    s.includes(".X..X.")
  )
    live2++;
  score += live2 * 1500; // Live Two (Making moves)

  let dead2 = 0;
  if (
    s.includes("OXX...") ||
    s.includes("...XXO") ||
    s.includes("OX.X..") ||
    s.includes("..X.XO") ||
    s.includes("O.XX..") ||
    s.includes("..XX.O") ||
    s.includes("O..XX.") ||
    s.includes(".XX..O")
  )
    dead2++;
  score += dead2 * 200; // Dead Two

  return score;
};

// ── Point Evaluation ────────────────────────────────────────────────
export const evaluatePoint = (
  board: number[][],
  r: number,
  c: number,
  player: number,
) => {
  const opp = player === 1 ? 2 : 1;
  let score = 0;
  let fours = 0;
  let live3s = 0;
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let s = "";
    for (let i = -4; i <= 4; i++) {
      const nr = r + i * dr;
      const nc = c + i * dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
        s += "O";
      } else if (i === 0) {
        s += "X";
      } else {
        if (board[nr][nc] === player) s += "X";
        else if (board[nr][nc] === opp) s += "O";
        else s += ".";
      }
    }
    const lineScore = getLineScore(s);
    score += lineScore;

    // Detect potential for killing moves
    if (lineScore >= 100000) {
      // Five or Live Four - already very high score
    } else if (lineScore >= 10000) {
      // Check if it's a Dead Four or Live Three
      if (s.includes("OXXXX.") || s.includes(".XXXXO") || s.includes("X.XXX") || s.includes("XXX.X") || s.includes("XX.XX")) {
        fours++;
      } else {
        live3s++;
      }
    }
  }

  // Bonus for multiple threats (Killing moves: Double Four, Four-Three, Double Three)
  // This significantly increases the weight of offensive "killing" moves
  if (fours >= 2 || (fours >= 1 && live3s >= 1) || live3s >= 2) {
    score += 80000; // High bonus for VCT potential
  }
  return score;
};

// ── Board State Evaluation ──────────────────────────────────────────
export const evaluateBoardState = (
  isMaximizing: boolean
) => {
  if (isMaximizing) {
    if (totalAiScore >= 1000000) return 100000000;
    if (totalHumanScore >= 1000000) return -100000000;
  } else {
    if (totalHumanScore >= 1000000) return -100000000;
    if (totalAiScore >= 1000000) return 100000000;
  }

  // Offensive bias: value AI's score more than human's score to encourage aggressive play
  return totalAiScore * 1.2 - totalHumanScore;
};

// ── Forcing Move Detection ──────────────────────────────────────────
export const isForcingMove = (board: number[][], r: number, c: number, player: number, isDefensive: boolean = false): boolean => {
  const opp = player === 1 ? 2 : 1;
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  board[r][c] = player;
  let isForcing = false;

  for (const [dr, dc] of directions) {
    let s = "";
    for (let i = -4; i <= 4; i++) {
      const nr = r + i * dr;
      const nc = c + i * dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
        s += "O";
      } else {
        if (board[nr][nc] === player) s += "X";
        else if (board[nr][nc] === opp) s += "O";
        else s += ".";
      }
    }

    if (isDefensive) {
      if (
        s.includes("XXXXX") ||
        s.includes(".XXXX.")
      ) {
        isForcing = true;
        break;
      }
    } else {
      if (
        s.includes("XXXXX") ||
        s.includes(".XXXX.") ||
        s.includes("OXXXX.") ||
        s.includes(".XXXXO") ||
        s.includes("X.XXX") ||
        s.includes("XXX.X") ||
        s.includes("XX.XX") ||
        s.includes("..XXX.") ||
        s.includes(".XXX..") ||
        s.includes(".X.XX.") ||
        s.includes(".XX.X.")
      ) {
        isForcing = true;
        break;
      }
    }
  }

  board[r][c] = EMPTY;
  return isForcing;
};

// ── Exported for gameSearch.ts ───────────────────────────────────────
export const updateScoreMapExport = updateScoreMap;
