/**
 * Candidate Move Generator for Gomoku LLM AI
 * Evaluates all empty positions and returns top candidates based on pattern analysis
 *
 * Pattern Hierarchy (descending priority):
 * - 连五 (Five): Win immediately
 * - 活四 (Live Four): Guaranteed win next turn
 * - 冲四 (Rush Four): One move to win, blockable
 * - 活三 (Live Three): Strong threat, creates live four next
 * - 眠三 (Sleep Three): Potential threat with one end blocked
 * - 活二 (Live Two): Building pattern
 * - 眠二 (Sleep Two): Minor potential
 */

import { BoardState, BoardCell } from '../types/llm.types';

const BOARD_SIZE = 15;

/**
 * Pattern types with their base scores
 */
export type PatternType =
  | 'five' // 连五 - Win
  | 'live-four' // 活四 - Guaranteed win
  | 'rush-four' // 冲四 - One move to win
  | 'live-three' // 活三 - Strong threat
  | 'sleep-three' // 眠三 - Potential threat
  | 'live-two' // 活二 - Building
  | 'sleep-two'; // 眠二 - Minor potential

/**
 * Pattern score configuration
 */
const PATTERN_SCORES: Record<PatternType, number> = {
  five: 100000,
  'live-four': 10000,
  'rush-four': 1000,
  'live-three': 500,
  'sleep-three': 100,
  'live-two': 50,
  'sleep-two': 10,
};

/**
 * Candidate move with evaluation details
 */
export interface CandidateMove {
  x: number;
  y: number;
  score: number;
  attackScore: number;
  defenseScore: number;
  patterns: PatternMatch[];
  reason: string;
}

/**
 * Individual pattern match at a position
 */
export interface PatternMatch {
  type: PatternType;
  isOwn: boolean; // true = own pattern (attack), false = opponent pattern (defense)
  direction: string; // 'horizontal' | 'vertical' | 'diagonal' | 'anti-diagonal'
}

/**
 * Convert player color to board cell
 */
function playerToCell(aiColor: 'black' | 'white'): BoardCell {
  return aiColor === 'black' ? 'X' : 'O';
}

/**
 * Get opponent cell
 */
function getOpponentCell(playerCell: BoardCell): BoardCell {
  return playerCell === 'X' ? 'O' : 'X';
}

/**
 * Get line pattern in a direction from a center position
 * Returns array of cells from (r - range*dr, c - range*dc) to (r + range*dr, c + range*dc)
 */
function getLinePattern(
  board: BoardState,
  r: number,
  c: number,
  dr: number,
  dc: number,
  range: number
): { cell: BoardCell | '#'; r: number; c: number }[] {
  const result: { cell: BoardCell | '#'; r: number; c: number }[] = [];

  for (let i = -range; i <= range; i++) {
    const nr = r + i * dr;
    const nc = c + i * dc;
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
      result.push({ cell: '#', r: nr, c: nc });
    } else {
      result.push({ cell: board[nr][nc], r: nr, c: nc });
    }
  }

  return result;
}

/**
 * Analyze patterns in a single direction for a potential move
 * Assumes the move is made at (r, c) - checks what patterns would be created
 */
function analyzeDirectionPatterns(
  board: BoardState,
  r: number,
  c: number,
  dr: number,
  dc: number,
  playerCell: BoardCell
): PatternMatch[] {
  const patterns: PatternMatch[] = [];
  const opponentCell = getOpponentCell(playerCell);

  // Get extended line pattern (5 cells each side = 11 total)
  const line = getLinePattern(board, r, c, dr, dc, 5);
  const centerIdx = 5; // Center of the 11-cell array

  // Simulate placing the piece
  const originalCell = line[centerIdx].cell;
  if (originalCell !== '.') return patterns;

  // Create pattern string with the simulated move
  const patternWithMove = line.map((p, idx) =>
    idx === centerIdx ? playerCell : p.cell
  ).join('');

  // Create pattern string for opponent's perspective (for defense)
  const patternForOpponent = line.map((p, idx) =>
    idx === centerIdx ? opponentCell : p.cell
  ).join('');

  // Direction name
  let direction = 'horizontal';
  if (dr === 1 && dc === 0) direction = 'vertical';
  else if (dr === 1 && dc === 1) direction = 'diagonal';
  else if (dr === 1 && dc === -1) direction = 'anti-diagonal';

  // Check own patterns (attack)
  const ownPatterns = detectPatternsInString(patternWithMove, playerCell, centerIdx);
  for (const p of ownPatterns) {
    patterns.push({ type: p, isOwn: true, direction });
  }

  // Check opponent patterns (defense)
  const oppPatterns = detectPatternsInString(patternForOpponent, opponentCell, centerIdx);
  for (const p of oppPatterns) {
    patterns.push({ type: p, isOwn: false, direction });
  }

  return patterns;
}

/**
 * Detect patterns in a pattern string
 * Returns array of pattern types found
 */
function detectPatternsInString(
  pattern: string,
  playerCell: BoardCell,
  centerIdx: number
): PatternType[] {
  const patterns: PatternType[] = [];
  const p = playerCell;
  const o = playerCell === 'X' ? 'O' : 'X';
  const b = '#'; // boundary

  // Check if the center position is part of the pattern
  // We need to find patterns that include the centerIdx

  // 连五 (Five in a row) - XXXXX
  const fiveRegex = new RegExp(`${p}${p}${p}${p}${p}`);
  if (fiveRegex.test(pattern)) {
    const match = pattern.match(fiveRegex);
    if (match && match.index !== undefined) {
      const start = match.index;
      const end = start + 4;
      if (centerIdx >= start && centerIdx <= end) {
        patterns.push('five');
        return patterns; // Five is the highest, no need to check others
      }
    }
  }

  // 活四 (Live Four) - .XXXX.
  const liveFourRegex = new RegExp(`\\.${p}${p}${p}${p}\\.`);
  if (liveFourRegex.test(pattern)) {
    const match = pattern.match(liveFourRegex);
    if (match && match.index !== undefined) {
      const start = match.index + 1;
      const end = start + 3;
      if (centerIdx >= start && centerIdx <= end) {
        patterns.push('live-four');
      }
    }
  }

  // 冲四 (Rush Four) patterns
  // XXXXX blocked at one end, or gap patterns
  const rushFourPatterns = [
    new RegExp(`[${b}${o}]${p}${p}${p}${p}\\.`), // Blocked on left
    new RegExp(`\\.${p}${p}${p}${p}[${b}${o}]`), // Blocked on right
    new RegExp(`${p}\\.${p}${p}${p}`), // Gap pattern O.XXXX
    new RegExp(`${p}${p}\\.${p}${p}`), // Gap pattern XX.XX
    new RegExp(`${p}${p}${p}\\.${p}`), // Gap pattern XXX.X
  ];

  for (const regex of rushFourPatterns) {
    if (regex.test(pattern)) {
      const match = pattern.match(regex);
      if (match && match.index !== undefined) {
        // Check if center is part of the four
        const start = match.index;
        const matchedStr = match[0];
        for (let i = 0; i < matchedStr.length; i++) {
          if (matchedStr[i] === p && start + i === centerIdx) {
            patterns.push('rush-four');
            break;
          }
        }
        if (patterns.includes('rush-four')) break;
      }
    }
  }

  // 活三 (Live Three) - .XXX.
  const liveThreeRegex = new RegExp(`\\.${p}${p}${p}\\.`);
  if (liveThreeRegex.test(pattern)) {
    const match = pattern.match(liveThreeRegex);
    if (match && match.index !== undefined) {
      const start = match.index + 1;
      const end = start + 2;
      if (centerIdx >= start && centerIdx <= end) {
        patterns.push('live-three');
      }
    }
  }

  // Gap live three patterns: .X.XX. or .XX.X.
  const gapLiveThree1 = new RegExp(`\\.${p}\\.${p}${p}\\.`);
  const gapLiveThree2 = new RegExp(`\\.${p}${p}\\.${p}\\.`);
  for (const regex of [gapLiveThree1, gapLiveThree2]) {
    if (regex.test(pattern)) {
      const match = pattern.match(regex);
      if (match && match.index !== undefined) {
        const start = match.index;
        const matchedStr = match[0];
        for (let i = 0; i < matchedStr.length; i++) {
          if (matchedStr[i] === p && start + i === centerIdx) {
            patterns.push('live-three');
            break;
          }
        }
        if (patterns.includes('live-three')) break;
      }
    }
  }

  // 眠三 (Sleep Three) - Blocked three
  const sleepThreePatterns = [
    new RegExp(`[${b}${o}]${p}${p}${p}\\.`), // Blocked on left
    new RegExp(`\\.${p}${p}${p}[${b}${o}]`), // Blocked on right
    new RegExp(`${p}\\.${p}${p}[${b}${o}]`), // Gap blocked
    new RegExp(`[${b}${o}]${p}${p}\\.${p}`), // Gap blocked
  ];

  for (const regex of sleepThreePatterns) {
    if (regex.test(pattern)) {
      const match = pattern.match(regex);
      if (match && match.index !== undefined) {
        const start = match.index;
        const matchedStr = match[0];
        for (let i = 0; i < matchedStr.length; i++) {
          if (matchedStr[i] === p && start + i === centerIdx) {
            patterns.push('sleep-three');
            break;
          }
        }
        if (patterns.includes('sleep-three')) break;
      }
    }
  }

  // 活二 (Live Two) - .XX.
  const liveTwoRegex = new RegExp(`\\.${p}${p}\\.`);
  if (liveTwoRegex.test(pattern)) {
    const match = pattern.match(liveTwoRegex);
    if (match && match.index !== undefined) {
      const start = match.index + 1;
      const end = start + 1;
      if (centerIdx >= start && centerIdx <= end) {
        patterns.push('live-two');
      }
    }
  }

  // 眠二 (Sleep Two) - Blocked two
  const sleepTwoPatterns = [
    new RegExp(`[${b}${o}]${p}${p}\\.`),
    new RegExp(`\\.${p}${p}[${b}${o}]`),
  ];

  for (const regex of sleepTwoPatterns) {
    if (regex.test(pattern)) {
      const match = pattern.match(regex);
      if (match && match.index !== undefined) {
        const start = match.index;
        const matchedStr = match[0];
        for (let i = 0; i < matchedStr.length; i++) {
          if (matchedStr[i] === p && start + i === centerIdx) {
            patterns.push('sleep-two');
            break;
          }
        }
        if (patterns.includes('sleep-two')) break;
      }
    }
  }

  return patterns;
}

/**
 * Evaluate a single empty position
 * Returns attack score, defense score, and detected patterns
 */
function evaluatePosition(
  board: BoardState,
  r: number,
  c: number,
  playerCell: BoardCell
): { attackScore: number; defenseScore: number; patterns: PatternMatch[] } {
  if (board[r][c] !== '.') {
    return { attackScore: 0, defenseScore: 0, patterns: [] };
  }

  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal
    [1, -1], // anti-diagonal
  ];

  let attackScore = 0;
  let defenseScore = 0;
  const allPatterns: PatternMatch[] = [];

  for (const [dr, dc] of directions) {
    const patterns = analyzeDirectionPatterns(board, r, c, dr, dc, playerCell);

    for (const p of patterns) {
      allPatterns.push(p);
      const score = PATTERN_SCORES[p.type];
      if (p.isOwn) {
        attackScore += score;
      } else {
        // Defense score is slightly lower to prioritize offense
        defenseScore += Math.floor(score * 0.9);
      }
    }
  }

  return { attackScore, defenseScore, patterns: allPatterns };
}

/**
 * Generate a human-readable reason for a move
 */
function generateReason(patterns: PatternMatch[]): string {
  const ownPatterns = patterns.filter(p => p.isOwn);
  const oppPatterns = patterns.filter(p => !p.isOwn);

  const reasons: string[] = [];

  // Check for winning move
  if (ownPatterns.some(p => p.type === 'five')) {
    return '必胜点：连五获胜';
  }

  // Check for blocking opponent's win
  if (oppPatterns.some(p => p.type === 'five')) {
    return '必防点：堵截对手连五';
  }

  // Check for creating live four
  if (ownPatterns.some(p => p.type === 'live-four')) {
    return '进攻点：构成活四，必胜棋型';
  }

  // Check for blocking opponent's live four
  if (oppPatterns.some(p => p.type === 'live-four')) {
    return '防守点：堵截对手活四';
  }

  // Check for rush four
  if (ownPatterns.some(p => p.type === 'rush-four')) {
    return '进攻点：构成冲四';
  }

  // Check for blocking opponent's rush four
  if (oppPatterns.some(p => p.type === 'rush-four')) {
    return '防守点：堵截对手冲四';
  }

  // Check for live three
  if (ownPatterns.some(p => p.type === 'live-three')) {
    return '进攻点：构成活三';
  }

  // Check for blocking opponent's live three
  if (oppPatterns.some(p => p.type === 'live-three')) {
    return '防守点：堵截对手活三';
  }

  // Check for sleep three
  if (ownPatterns.some(p => p.type === 'sleep-three')) {
    reasons.push('构成眠三');
  }

  if (oppPatterns.some(p => p.type === 'sleep-three')) {
    reasons.push('堵截对手眠三');
  }

  // Check for live two
  if (ownPatterns.some(p => p.type === 'live-two')) {
    reasons.push('构成活二');
  }

  if (oppPatterns.some(p => p.type === 'live-two')) {
    reasons.push('堵截对手活二');
  }

  if (reasons.length > 0) {
    return '布局点：' + reasons.join('，');
  }

  // Default: positional value
  return '布局点：扩展棋势';
}

/**
 * Generate top candidate moves for the current board state
 *
 * @param board - Current board state (ASCII format)
 * @param aiColor - AI's color ('black' or 'white')
 * @param topN - Number of top candidates to return (default: 10)
 * @returns Array of candidate moves sorted by score (descending)
 */
export function generateCandidateMoves(
  board: BoardState,
  aiColor: 'black' | 'white',
  topN: number = 10
): CandidateMove[] {
  const playerCell = playerToCell(aiColor);
  const candidates: CandidateMove[] = [];

  // Evaluate all empty positions
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== '.') continue;

      const { attackScore, defenseScore, patterns } = evaluatePosition(
        board,
        r,
        c,
        playerCell
      );

      // Skip positions with no strategic value
      if (attackScore === 0 && defenseScore === 0) continue;

      const totalScore = attackScore + defenseScore;

      candidates.push({
        x: c,
        y: r,
        score: totalScore,
        attackScore,
        defenseScore,
        patterns,
        reason: generateReason(patterns),
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Return top N candidates
  return candidates.slice(0, topN);
}

/**
 * Generate candidate moves from numeric board format
 * Convenience wrapper for frontend integration
 *
 * @param numericBoard - 15x15 array where 0=empty, 1=black, 2=white
 * @param aiColor - AI's color ('black' or 'white')
 * @param topN - Number of top candidates to return
 * @returns Array of candidate moves with row/column coordinates
 */
export function generateCandidateMovesFromNumeric(
  numericBoard: number[][],
  aiColor: 'black' | 'white',
  topN: number = 10
): Array<Omit<CandidateMove, 'x' | 'y'> & { r: number; c: number }> {
  const asciiBoard: BoardState = numericBoard.map(row =>
    row.map(cell => {
      if (cell === 1) return 'X';
      if (cell === 2) return 'O';
      return '.';
    })
  );

  const candidates = generateCandidateMoves(asciiBoard, aiColor, topN);

  return candidates.map(c => ({
    r: c.y,
    c: c.x,
    score: c.score,
    attackScore: c.attackScore,
    defenseScore: c.defenseScore,
    patterns: c.patterns,
    reason: c.reason,
  }));
}

/**
 * Get the best fallback move when LLM fails
 * Returns the highest-scoring candidate move
 *
 * @param board - Current board state (ASCII format)
 * @param aiColor - AI's color
 * @returns Best candidate move or null if no valid moves
 */
export function getBestFallbackMove(
  board: BoardState,
  aiColor: 'black' | 'white'
): CandidateMove | null {
  const candidates = generateCandidateMoves(board, aiColor, 1);
  return candidates[0] || null;
}
