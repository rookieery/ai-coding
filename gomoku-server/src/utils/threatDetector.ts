/**
 * Threat Detector for Gomoku LLM AI
 * Scans 15x15 board for critical moves (immediate wins and must-block threats)
 *
 * Pattern Definitions:
 * - Live Three (活三): .XXX. - three in a row with both ends open
 * - Rush Four (冲四): OXXXX. or .XXXXO - four in a row with one end blocked
 */

import { BoardState, BoardCell } from '../types/llm.types';

const BOARD_SIZE = 15;

type ThreatType = 'win' | 'block-live-three' | 'block-rush-four';

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
 * Check if placing a piece at (r, c) would create 5 in a row for the player
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
 * Get a line of cells in a direction
 * Returns array of {cell, r, c} for positions from (r-dr*range, c-dc*range) to (r+dr*range, c+dc*range)
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
 * Detect opponent's live three patterns and return blocking positions
 * Live three patterns (opponent = O):
 * - .OOO. (both ends open, must block one end)
 * - .O.OO. or .OO.O. (gap patterns that can become live four)
 *
 * Returns the blocking position if found
 */
function detectOpponentLiveThree(
  board: BoardState,
  opponentCell: BoardCell
): { r: number; c: number } | null {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (const [dr, dc] of directions) {
        const line = getLinePattern(board, r, c, dr, dc, 4);
        const pattern = line.map(p => p.cell).join('');

        // Pattern: .OOO. - standard live three, block either end
        const liveThreeMatch = pattern.match(new RegExp(`\\.${opponentCell}${opponentCell}${opponentCell}\\.`));
        if (liveThreeMatch) {
          const startIdx = liveThreeMatch.index!;
          // Block the left end (position before the three)
          const blockPos = line[startIdx];
          if (blockPos.cell === '.' && board[blockPos.r][blockPos.c] === '.') {
            return { r: blockPos.r, c: blockPos.c };
          }
        }

        // Pattern: .O.OO. or .OO.O. - gap live three
        const gapLiveThree1 = pattern.match(new RegExp(`\\.${opponentCell}\\.${opponentCell}${opponentCell}\\.`));
        const gapLiveThree2 = pattern.match(new RegExp(`\\.${opponentCell}${opponentCell}\\.${opponentCell}\\.`));

        if (gapLiveThree1) {
          const startIdx = gapLiveThree1.index!;
          // Fill the gap or block an end
          const gapPos = line[startIdx + 2];
          if (gapPos.cell === '.' && board[gapPos.r][gapPos.c] === '.') {
            return { r: gapPos.r, c: gapPos.c };
          }
        }

        if (gapLiveThree2) {
          const startIdx = gapLiveThree2.index!;
          const gapPos = line[startIdx + 3];
          if (gapPos.cell === '.' && board[gapPos.r][gapPos.c] === '.') {
            return { r: gapPos.r, c: gapPos.c };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Detect opponent's rush four patterns and return blocking positions
 * Rush four patterns (opponent = O, AI = X):
 * - XOOOO. or .OOOOX (four in a row with one end blocked)
 * - O.OOO, OO.OO, OOO.O (gap patterns that can become five)
 *
 * Returns the blocking position if found
 */
function detectOpponentRushFour(
  board: BoardState,
  opponentCell: BoardCell,
  aiCell: BoardCell
): { r: number; c: number } | null {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (const [dr, dc] of directions) {
        const line = getLinePattern(board, r, c, dr, dc, 5);
        const pattern = line.map(p => p.cell).join('');

        // Pattern: XOOOO. or .OOOOX - must block the open end
        const rushFourBlocked1 = pattern.match(new RegExp(`${aiCell}${opponentCell}${opponentCell}${opponentCell}${opponentCell}\\.`));
        const rushFourBlocked2 = pattern.match(new RegExp(`\\.${opponentCell}${opponentCell}${opponentCell}${opponentCell}${aiCell}`));

        if (rushFourBlocked1) {
          const startIdx = rushFourBlocked1.index!;
          const blockPos = line[startIdx + 5]; // The open end
          if (blockPos.cell === '.' && board[blockPos.r][blockPos.c] === '.') {
            return { r: blockPos.r, c: blockPos.c };
          }
        }

        if (rushFourBlocked2) {
          const startIdx = rushFourBlocked2.index!;
          const blockPos = line[startIdx]; // The open end
          if (blockPos.cell === '.' && board[blockPos.r][blockPos.c] === '.') {
            return { r: blockPos.r, c: blockPos.c };
          }
        }

        // Pattern: .OOOO. - open four, must block one end (this is actually worse than rush four)
        const openFour = pattern.match(new RegExp(`\\.${opponentCell}${opponentCell}${opponentCell}${opponentCell}\\.`));
        if (openFour) {
          const startIdx = openFour.index!;
          const blockPos = line[startIdx]; // Block left end
          if (blockPos.cell === '.' && board[blockPos.r][blockPos.c] === '.') {
            return { r: blockPos.r, c: blockPos.c };
          }
        }

        // Gap patterns: O.OOO, OO.OO, OOO.O - must block the gap
        const gapPatterns = [
          new RegExp(`${opponentCell}\\.${opponentCell}${opponentCell}${opponentCell}`),
          new RegExp(`${opponentCell}${opponentCell}\\.${opponentCell}${opponentCell}`),
          new RegExp(`${opponentCell}${opponentCell}${opponentCell}\\.${opponentCell}`),
        ];

        for (const gapRegex of gapPatterns) {
          const gapMatch = pattern.match(gapRegex);
          if (gapMatch) {
            const startIdx = gapMatch.index!;
            // Find the gap position
            const matchedStr = gapMatch[0];
            const gapIdxInMatch = matchedStr.indexOf('.');
            const gapPos = line[startIdx + gapIdxInMatch];
            if (gapPos.cell === '.' && board[gapPos.r][gapPos.c] === '.') {
              return { r: gapPos.r, c: gapPos.c };
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Find critical moves on the board
 * Priority order:
 * 1. AI can win immediately (priority 100)
 * 2. Must block opponent's rush four (priority 95)
 * 3. Must block opponent's live three (priority 90)
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

  // Priority 1: Check if AI can win immediately
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== '.') continue;

      if (checkWinningMove(board, r, c, aiCell)) {
        return {
          x: c,
          y: r,
          type: 'win',
        };
      }
    }
  }

  // Priority 2: Block opponent's rush four (immediate threat)
  const rushFourBlock = detectOpponentRushFour(board, opponentCell, aiCell);
  if (rushFourBlock) {
    return {
      x: rushFourBlock.c,
      y: rushFourBlock.r,
      type: 'block-rush-four',
    };
  }

  // Priority 3: Block opponent's live three
  const liveThreeBlock = detectOpponentLiveThree(board, opponentCell);
  if (liveThreeBlock) {
    return {
      x: liveThreeBlock.c,
      y: liveThreeBlock.r,
      type: 'block-live-three',
    };
  }

  return null;
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