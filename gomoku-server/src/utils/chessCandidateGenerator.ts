/**
 * Chinese Chess (Xiangqi) Candidate Move Generator
 *
 * Generates pseudo-legal moves for all pieces, filters for legality
 * (no self-check, no king-facing), scores with heuristics, and returns
 * the top 15 candidates for LLM move selection.
 *
 * Piece encoding (10×9 board, values 0-14):
 *   0 = Empty
 *   1 = Red King (帅)    8  = Black King (将)
 *   2 = Red Advisor (仕) 9  = Black Advisor (士)
 *   3 = Red Elephant (相) 10 = Black Elephant (象)
 *   4 = Red Horse (马)    11 = Black Horse (马)
 *   5 = Red Chariot (车)  12 = Black Chariot (车)
 *   6 = Red Cannon (炮)   13 = Black Cannon (炮)
 *   7 = Red Pawn (兵)     14 = Black Pawn (卒)
 */

import type { ChessCandidateMove, ChessPlayerColor, ChessPosition } from '../types/chess-llm.types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROWS = 10;
const COLS = 9;
const EMPTY = 0;

export const PIECE_VALUES: Record<number, number> = {
  1: 10000, 2: 200, 3: 200, 4: 400, 5: 900, 6: 450, 7: 100,
  8: 10000, 9: 200, 10: 200, 11: 400, 12: 900, 13: 450, 14: 100,
};

export const PIECE_NAMES: Record<number, string> = {
  1: '帅', 2: '仕', 3: '相', 4: '马', 5: '车', 6: '炮', 7: '兵',
  8: '将', 9: '士', 10: '象', 11: '马', 12: '车', 13: '炮', 14: '卒',
};

const RED_DIGITS = '九八七六五四三二一';
const BLACK_DIGITS = '123456789';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isRed(code: number): boolean { return code >= 1 && code <= 7; }
export function isBlack(code: number): boolean { return code >= 8 && code <= 14; }

export function isFriendly(code: number, player: ChessPlayerColor): boolean {
  return player === 'red' ? isRed(code) : isBlack(code);
}

export function isEnemy(code: number, player: ChessPlayerColor): boolean {
  return player === 'red' ? isBlack(code) : isRed(code);
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

/** Deep-clone board and apply a move, returning the new board. */
export function applyMove(board: number[][], from: ChessPosition, to: ChessPosition): number[][] {
  const b = board.map(row => [...row]);
  b[to.row][to.col] = b[from.row][from.col];
  b[from.row][from.col] = EMPTY;
  return b;
}

// ─── King & Check Detection ──────────────────────────────────────────────────

export function findKing(board: number[][], player: ChessPlayerColor): ChessPosition | null {
  const target = player === 'red' ? 1 : 8;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === target) return { row: r, col: c };
    }
  }
  return null;
}

/** Check if the two kings face each other on the same column with no pieces between. */
export function areKingsFacing(board: number[][]): boolean {
  const rk = findKing(board, 'red');
  const bk = findKing(board, 'black');
  if (!rk || !bk || rk.col !== bk.col) return false;
  const lo = Math.min(rk.row, bk.row);
  const hi = Math.max(rk.row, bk.row);
  for (let r = lo + 1; r < hi; r++) {
    if (board[r][rk.col] !== EMPTY) return false;
  }
  return true;
}

// ─── Piece Attack Checks ─────────────────────────────────────────────────────

function countBetween(board: number[][], from: ChessPosition, to: ChessPosition): number {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const sr = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
  const sc = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
  let count = 0;
  let r = from.row + sr, c = from.col + sc;
  while (r !== to.row || c !== to.col) {
    if (board[r][c] !== EMPTY) count++;
    r += sr;
    c += sc;
  }
  return count;
}

function canPieceAttack(board: number[][], from: ChessPosition, to: ChessPosition, piece: number): boolean {
  const dr = to.row - from.row;
  const dc = to.col - from.col;

  switch (piece) {
    case 5: case 12: // Rook
      if (dr !== 0 && dc !== 0) return false;
      return countBetween(board, from, to) === 0;

    case 6: case 13: // Cannon (needs exactly one screen to attack)
      if (dr !== 0 && dc !== 0) return false;
      return countBetween(board, from, to) === 1;

    case 4: case 11: { // Horse
      const adr = Math.abs(dr), adc = Math.abs(dc);
      if (!((adr === 2 && adc === 1) || (adr === 1 && adc === 2))) return false;
      const legR = adr === 2 ? from.row + (dr > 0 ? 1 : -1) : from.row;
      const legC = adc === 2 ? from.col + (dc > 0 ? 1 : -1) : from.col;
      return board[legR][legC] === EMPTY;
    }

    case 7: // Red Pawn
      if (dr === -1 && dc === 0) return true;
      if (from.row <= 4 && dr === 0 && Math.abs(dc) === 1) return true;
      return false;

    case 14: // Black Pawn
      if (dr === 1 && dc === 0) return true;
      if (from.row >= 5 && dr === 0 && Math.abs(dc) === 1) return true;
      return false;

    case 2: case 9: { // Advisor
      if (Math.abs(dr) !== 1 || Math.abs(dc) !== 1) return false;
      return isRed(piece)
        ? (to.row >= 7 && to.row <= 9 && to.col >= 3 && to.col <= 5)
        : (to.row >= 0 && to.row <= 2 && to.col >= 3 && to.col <= 5);
    }

    case 3: case 10: { // Elephant
      if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return false;
      if (board[from.row + dr / 2][from.col + dc / 2] !== EMPTY) return false;
      return isRed(piece) ? to.row >= 5 : to.row <= 4;
    }

    case 1: case 8: { // King
      if (Math.abs(dr) + Math.abs(dc) !== 1) return false;
      return isRed(piece)
        ? (to.row >= 7 && to.row <= 9 && to.col >= 3 && to.col <= 5)
        : (to.row >= 0 && to.row <= 2 && to.col >= 3 && to.col <= 5);
    }

    default:
      return false;
  }
}

function isSquareAttackedBy(board: number[][], target: ChessPosition, attacker: ChessPlayerColor): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const code = board[r][c];
      if (isFriendly(code, attacker) && canPieceAttack(board, { row: r, col: c }, target, code)) {
        return true;
      }
    }
  }
  return false;
}

/** Check whether `player`'s king is currently in check. */
export function isInCheck(board: number[][], player: ChessPlayerColor): boolean {
  const king = findKing(board, player);
  if (!king) return false;
  const opponent: ChessPlayerColor = player === 'red' ? 'black' : 'red';
  return isSquareAttackedBy(board, king, opponent);
}

// ─── Pseudo-Legal Move Generation ────────────────────────────────────────────

function generateRookMoves(board: number[][], from: ChessPosition, player: ChessPlayerColor): ChessPosition[] {
  const moves: ChessPosition[] = [];
  const dirs: ReadonlyArray<[number, number]> = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dr, dc] of dirs) {
    let r = from.row + dr, c = from.col + dc;
    while (inBounds(r, c)) {
      const code = board[r][c];
      if (code === EMPTY) {
        moves.push({ row: r, col: c });
      } else {
        if (isEnemy(code, player)) moves.push({ row: r, col: c });
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

function generateCannonMoves(board: number[][], from: ChessPosition, player: ChessPlayerColor): ChessPosition[] {
  const moves: ChessPosition[] = [];
  const dirs: ReadonlyArray<[number, number]> = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dr, dc] of dirs) {
    let r = from.row + dr, c = from.col + dc;
    let jumped = false;
    while (inBounds(r, c)) {
      const code = board[r][c];
      if (!jumped) {
        if (code === EMPTY) {
          moves.push({ row: r, col: c });
        } else {
          jumped = true;
        }
      } else {
        if (code !== EMPTY) {
          if (isEnemy(code, player)) moves.push({ row: r, col: c });
          break;
        }
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

function generateHorseMoves(board: number[][], from: ChessPosition, player: ChessPlayerColor): ChessPosition[] {
  const moves: ChessPosition[] = [];
  const jumps: ReadonlyArray<[number, number, number, number]> = [
    [-2, -1, -1, 0], [-2, 1, -1, 0],
    [2, -1, 1, 0], [2, 1, 1, 0],
    [-1, -2, 0, -1], [-1, 2, 0, 1],
    [1, -2, 0, -1], [1, 2, 0, 1],
  ];
  for (const [dr, dc, lr, lc] of jumps) {
    const tr = from.row + dr, tc = from.col + dc;
    if (!inBounds(tr, tc)) continue;
    if (board[from.row + lr][from.col + lc] !== EMPTY) continue;
    const code = board[tr][tc];
    if (code === EMPTY || isEnemy(code, player)) {
      moves.push({ row: tr, col: tc });
    }
  }
  return moves;
}

function generatePawnMoves(board: number[][], from: ChessPosition, player: ChessPlayerColor): ChessPosition[] {
  const moves: ChessPosition[] = [];
  const isRedP = player === 'red';
  const fwd = isRedP ? from.row - 1 : from.row + 1;

  if (inBounds(fwd, from.col)) {
    const code = board[fwd][from.col];
    if (code === EMPTY || isEnemy(code, player)) {
      moves.push({ row: fwd, col: from.col });
    }
  }

  const crossed = isRedP ? from.row <= 4 : from.row >= 5;
  if (crossed) {
    for (const dc of [-1, 1]) {
      const tc = from.col + dc;
      if (inBounds(from.row, tc)) {
        const code = board[from.row][tc];
        if (code === EMPTY || isEnemy(code, player)) {
          moves.push({ row: from.row, col: tc });
        }
      }
    }
  }
  return moves;
}

function generateAdvisorMoves(board: number[][], from: ChessPosition, piece: number, player: ChessPlayerColor): ChessPosition[] {
  const moves: ChessPosition[] = [];
  const isRedP = isRed(piece);
  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const tr = from.row + dr, tc = from.col + dc;
    if (!inBounds(tr, tc)) continue;
    const inPalace = isRedP
      ? (tr >= 7 && tr <= 9 && tc >= 3 && tc <= 5)
      : (tr >= 0 && tr <= 2 && tc >= 3 && tc <= 5);
    if (!inPalace) continue;
    const code = board[tr][tc];
    if (code === EMPTY || isEnemy(code, player)) {
      moves.push({ row: tr, col: tc });
    }
  }
  return moves;
}

function generateElephantMoves(board: number[][], from: ChessPosition, piece: number, player: ChessPlayerColor): ChessPosition[] {
  const moves: ChessPosition[] = [];
  const isRedP = isRed(piece);
  for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) {
    const tr = from.row + dr, tc = from.col + dc;
    if (!inBounds(tr, tc)) continue;
    if (isRedP ? tr < 5 : tr > 4) continue;
    if (board[from.row + dr / 2][from.col + dc / 2] !== EMPTY) continue;
    const code = board[tr][tc];
    if (code === EMPTY || isEnemy(code, player)) {
      moves.push({ row: tr, col: tc });
    }
  }
  return moves;
}

function generateKingMoves(board: number[][], from: ChessPosition, piece: number, player: ChessPlayerColor): ChessPosition[] {
  const moves: ChessPosition[] = [];
  const isRedP = isRed(piece);
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const tr = from.row + dr, tc = from.col + dc;
    if (!inBounds(tr, tc)) continue;
    const inPalace = isRedP
      ? (tr >= 7 && tr <= 9 && tc >= 3 && tc <= 5)
      : (tr >= 0 && tr <= 2 && tc >= 3 && tc <= 5);
    if (!inPalace) continue;
    const code = board[tr][tc];
    if (code === EMPTY || isEnemy(code, player)) {
      moves.push({ row: tr, col: tc });
    }
  }
  return moves;
}

function generatePseudoLegalMoves(
  board: number[][], from: ChessPosition, piece: number, player: ChessPlayerColor,
): ChessPosition[] {
  switch (piece) {
    case 5: case 12: return generateRookMoves(board, from, player);
    case 6: case 13: return generateCannonMoves(board, from, player);
    case 4: case 11: return generateHorseMoves(board, from, player);
    case 7: case 14: return generatePawnMoves(board, from, player);
    case 2: case 9: return generateAdvisorMoves(board, from, piece, player);
    case 3: case 10: return generateElephantMoves(board, from, piece, player);
    case 1: case 8: return generateKingMoves(board, from, piece, player);
    default: return [];
  }
}

// ─── Legal Move Generation ───────────────────────────────────────────────────

/** Generate all legal moves for `player` (no self-check, no king-facing). */
export function generateAllLegalMoves(
  board: number[][], player: ChessPlayerColor,
): Array<{ from: ChessPosition; to: ChessPosition }> {
  const legal: Array<{ from: ChessPosition; to: ChessPosition }> = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const code = board[r][c];
      if (!isFriendly(code, player)) continue;
      const from: ChessPosition = { row: r, col: c };
      const targets = generatePseudoLegalMoves(board, from, code, player);
      for (const to of targets) {
        const nb = applyMove(board, from, to);
        if (isInCheck(nb, player) || areKingsFacing(nb)) continue;
        legal.push({ from, to });
      }
    }
  }
  return legal;
}

/** Check whether `player` is checkmated (in check with no legal escape). */
export function isCheckmate(board: number[][], player: ChessPlayerColor): boolean {
  if (!isInCheck(board, player)) return false;
  return generateAllLegalMoves(board, player).length === 0;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreMove(
  board: number[][], from: ChessPosition, to: ChessPosition,
  newBoard: number[][], player: ChessPlayerColor,
): number {
  let score = 0;
  const opponent: ChessPlayerColor = player === 'red' ? 'black' : 'red';
  const captured = board[to.row][to.col];

  if (captured !== EMPTY) {
    score += PIECE_VALUES[captured] || 0;
  }

  if (isInCheck(newBoard, opponent)) {
    score += 500;
  }

  if (to.col >= 3 && to.col <= 5 && to.row >= 3 && to.row <= 6) {
    score += 50;
  }

  const piece = board[from.row][from.col];
  if (piece === 7 && from.row <= 4 && to.row < from.row) score += 30;
  if (piece === 14 && from.row >= 5 && to.row > from.row) score += 30;

  return score;
}

// ─── Notation ────────────────────────────────────────────────────────────────

function generateNotation(
  board: number[][], from: ChessPosition, to: ChessPosition,
  newBoard: number[][], player: ChessPlayerColor,
): string {
  const pieceCode = board[from.row][from.col];
  const pieceName = PIECE_NAMES[pieceCode];
  const captured = board[to.row][to.col];
  const opponent: ChessPlayerColor = player === 'red' ? 'black' : 'red';
  const isRedP = player === 'red';

  const fromDigit = isRedP ? RED_DIGITS[from.col] : BLACK_DIGITS[from.col];

  const dr = to.row - from.row;
  const dc = to.col - from.col;

  const isDiagonal = [4, 11, 2, 9, 3, 10].includes(pieceCode);

  let direction: string;
  let target: string;

  if (dc === 0) {
    const isForward = isRedP ? dr < 0 : dr > 0;
    direction = isForward ? '进' : '退';
    if (isDiagonal) {
      target = isRedP ? RED_DIGITS[to.col] : BLACK_DIGITS[to.col];
    } else {
      const dist = Math.abs(dr);
      target = isRedP ? RED_DIGITS[RED_DIGITS.length - dist] : BLACK_DIGITS[dist - 1];
    }
  } else if (dr === 0) {
    direction = '平';
    target = isRedP ? RED_DIGITS[to.col] : BLACK_DIGITS[to.col];
  } else {
    const isForward = isRedP ? dr < 0 : dr > 0;
    direction = isForward ? '进' : '退';
    target = isRedP ? RED_DIGITS[to.col] : BLACK_DIGITS[to.col];
  }

  let notation = `${pieceName}${fromDigit}${direction}${target}`;

  const parts: string[] = [];
  if (captured !== EMPTY) parts.push(`吃${PIECE_NAMES[captured]}`);
  if (isInCheck(newBoard, opponent)) parts.push('将军');

  if (parts.length > 0) notation += `（${parts.join('、')}）`;

  return notation;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Generate the top 15 candidate moves for `playerColor`.
 *
 * Flow: pseudo-legal generation → legality filter (no self-check / king-facing)
 *       → heuristic scoring → sort by score descending → top 15.
 */
export function generateCandidateMoves(
  board: number[][], playerColor: ChessPlayerColor,
): ChessCandidateMove[] {
  const candidates: ChessCandidateMove[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const code = board[r][c];
      if (!isFriendly(code, playerColor)) continue;

      const from: ChessPosition = { row: r, col: c };
      const targets = generatePseudoLegalMoves(board, from, code, playerColor);

      for (const to of targets) {
        const nb = applyMove(board, from, to);
        if (isInCheck(nb, playerColor) || areKingsFacing(nb)) continue;

        candidates.push({
          from,
          to,
          score: scoreMove(board, from, to, nb, playerColor),
          reason: generateNotation(board, from, to, nb, playerColor),
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 15);
}
