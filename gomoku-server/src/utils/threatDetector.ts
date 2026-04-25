/**
 * Threat Detector for Gomoku LLM AI
 * Scans 15x15 board for critical moves (immediate wins and must-block threats)
 */

import { BoardState, BoardCell } from '../types/llm.types';

const BOARD_SIZE = 15;

type ThreatType = 'win' | 'block-live-three' | 'block-rush-four';

interface CriticalMove {
  x: number;
  y: number;
  type: ThreatType;
  priority: number;
}

/**
 * Convert player color to board cell representation
 */
function playerToCell(aiColor: 'black' | 'white'): BoardCell {
  return aiColor === 'black' ? 'X' : 'O';
}

/**
 * Get opponent cell representation
 */
function getOpponentCell(playerCell: BoardCell): BoardCell {
  return playerCell === 'X' ? 'O' : 'X';
}

/**
 * Check if placing a piece at (r, c) would create 5 in a row
 */
function checkWinningMove(
  board: BoardState,
  r: number,
  c: number,
  playerCell: BoardCell
): boolean {
  if (board[r][c] !== '.') return false;

  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let count = 1;

    for (let i = 1; i <= 4; i++) {
      const nr = r + i * dr;
      const nc = c + i * dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc] === playerCell) count++;
        else break;
      } else break;
    }

    for (let i = 1; i <= 4; i++) {
      const nr = r - i * dr;
      const nc = c - i * dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc] === playerCell) count++;
        else break;
      } else break;
    }

    if (count >= 5) return true;
  }

  return false;
}

/**
 * Check for live three pattern: .XXX. or variations
 * A live three can become a live four with one move
 */
function checkLiveThree(
  board: BoardState,
  r: number,
  c: number,
  _opponentCell: BoardCell
): boolean {
  if (board[r][c] !== '.') return false;

  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    const pattern: string[] = [];
    for (let i = -4; i <= 4; i++) {
      const nr = r + i * dr;
      const nc = c + i * dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
        pattern.push('#');
      } else if (i === 0) {
        pattern.push('.');
      } else {
        pattern.push(board[nr][nc]);
      }
    }

    const patternStr = pattern.join('');

    if (
      patternStr.includes('.XXX.') ||
      patternStr.includes('..XXX.') ||
      patternStr.includes('.XXX..') ||
      patternStr.includes('.X.XX.') ||
      patternStr.includes('.XX.X.')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check for rush four pattern: OXXXX. or .XXXXO or X.XXX etc.
 * A rush four must be blocked immediately or opponent wins next turn
 */
function checkRushFour(
  board: BoardState,
  r: number,
  c: number,
  opponentCell: BoardCell
): boolean {
  if (board[r][c] !== '.') return false;

  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  const playerCell = getOpponentCell(opponentCell);

  for (const [dr, dc] of directions) {
    const pattern: string[] = [];
    for (let i = -4; i <= 4; i++) {
      const nr = r + i * dr;
      const nc = c + i * dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
        pattern.push('#');
      } else if (i === 0) {
        pattern.push('.');
      } else {
        pattern.push(board[nr][nc]);
      }
    }

    const patternStr = pattern.join('');

    if (
      patternStr.includes(`${opponentCell}${playerCell}${playerCell}${playerCell}${playerCell}.`) ||
      patternStr.includes(`.${playerCell}${playerCell}${playerCell}${playerCell}${opponentCell}`) ||
      patternStr.includes(`${playerCell}.${playerCell}${playerCell}${playerCell}`) ||
      patternStr.includes(`${playerCell}${playerCell}.${playerCell}${playerCell}`) ||
      patternStr.includes(`${playerCell}${playerCell}${playerCell}.${playerCell}`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Find critical moves on the board
 * Priority order:
 * 1. AI can win immediately (priority 100)
 * 2. Must block opponent's rush four (priority 90)
 * 3. Must block opponent's live three (priority 80)
 *
 * @param board - Current board state (ASCII format)
 * @param aiColor - AI's color ('black' or 'white')
 * @returns Critical move coordinates or null if no critical move exists
 */
export function findCriticalMove(
  board: BoardState,
  aiColor: 'black' | 'white'
): { x: number; y: number; type: ThreatType } | null {
  const aiCell = playerToCell(aiColor);
  const opponentCell = getOpponentCell(aiCell);

  const criticalMoves: CriticalMove[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== '.') continue;

      const x = c;
      const y = r;

      if (checkWinningMove(board, r, c, aiCell)) {
        criticalMoves.push({
          x,
          y,
          type: 'win',
          priority: 100,
        });
      }

      if (checkRushFour(board, r, c, opponentCell)) {
        criticalMoves.push({
          x,
          y,
          type: 'block-rush-four',
          priority: 90,
        });
      }

      if (checkLiveThree(board, r, c, opponentCell)) {
        criticalMoves.push({
          x,
          y,
          type: 'block-live-three',
          priority: 80,
        });
      }
    }
  }

  if (criticalMoves.length === 0) {
    return null;
  }

  criticalMoves.sort((a, b) => b.priority - a.priority);

  const bestMove = criticalMoves[0];

  return {
    x: bestMove.x,
    y: bestMove.y,
    type: bestMove.type,
  };
}

/**
 * Find critical move from numeric board format
 * Convenience wrapper for frontend integration
 *
 * @param numericBoard - 15x15 array where 0=empty, 1=black, 2=white
 * @param aiColor - AI's color ('black' or 'white')
 * @returns Critical move coordinates or null
 */
export function findCriticalMoveFromNumeric(
  numericBoard: number[][],
  aiColor: 'black' | 'white'
): { r: number; c: number; type: ThreatType } | null {
  const asciiBoard: BoardState = numericBoard.map(row =>
    row.map(cell => {
      if (cell === 1) return 'X';
      if (cell === 2) return 'O';
      return '.';
    })
  );

  const result = findCriticalMove(asciiBoard, aiColor);

  if (!result) return null;

  return {
    r: result.y,
    c: result.x,
    type: result.type,
  };
}