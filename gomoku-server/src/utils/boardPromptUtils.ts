/**
 * Board Prompt Utilities for LLM AI Service
 * Converts Gomoku board state to ASCII matrix and assembles LLM prompts
 */

import {
  BoardState,
  PlayerColor,
  MoveHistoryEntry,
  LLMMoveRequest,
} from '../types/llm.types';

/**
 * Column labels for coordinate notation (A-O for 15x15 board)
 */
const COLUMN_LABELS = 'ABCDEFGHIJKLMNO';

/**
 * Convert numeric board (0/1/2) to ASCII board (./X/O)
 * @param numericBoard - 15x15 array where 0=empty, 1=black, 2=white
 * @returns BoardState - 15x15 array of 'X', 'O', or '.'
 */
export function numericToAsciiBoard(numericBoard: number[][]): BoardState {
  return numericBoard.map(row =>
    row.map(cell => {
      if (cell === 1) return 'X';
      if (cell === 2) return 'O';
      return '.';
    })
  );
}

/**
 * Convert ASCII board back to numeric format
 * @param asciiBoard - 15x15 array of 'X', 'O', or '.'
 * @returns number[][] - 15x15 array where 0=empty, 1=black, 2=white
 */
export function asciiToNumericBoard(asciiBoard: BoardState): number[][] {
  return asciiBoard.map(row =>
    row.map(cell => {
      if (cell === 'X') return 1;
      if (cell === 'O') return 2;
      return 0;
    })
  );
}

/**
 * Convert board state to ASCII string representation
 * Includes row numbers and column headers for better spatial perception
 * @param board - 15x15 ASCII board state
 * @returns Formatted ASCII string
 */
export function boardToAsciiString(board: BoardState): string {
  const header = '   ' + COLUMN_LABELS.split('').join(' ');
  const separator = '   ' + '-'.repeat(29);

  const rows = board.map((row, index) => {
    const rowNumber = (15 - index).toString().padStart(2, ' ');
    const cells = row.join(' ');
    return `${rowNumber}| ${cells}`;
  });

  return [header, separator, ...rows].join('\n');
}

/**
 * Convert numeric coordinates to algebraic notation (e.g., "H8")
 * @param x - Column index (0-14)
 * @param y - Row index (0-14)
 * @returns Coordinate string like "H8"
 */
export function coordinatesToNotation(x: number, y: number): string {
  const col = COLUMN_LABELS[x];
  const row = 15 - y;
  return `${col}${row}`;
}

/**
 * Convert algebraic notation to numeric coordinates
 * @param notation - Coordinate string like "H8"
 * @returns { x, y } or null if invalid
 */
export function notationToCoordinates(notation: string): { x: number; y: number } | null {
  if (!notation || notation.length < 2 || notation.length > 3) {
    return null;
  }

  const colChar = notation[0].toUpperCase();
  const rowStr = notation.slice(1);

  const x = COLUMN_LABELS.indexOf(colChar);
  const y = 15 - parseInt(rowStr, 10);

  if (x < 0 || x > 14 || isNaN(y) || y < 0 || y > 14) {
    return null;
  }

  return { x, y };
}

/**
 * Format move history for LLM context
 * @param history - Array of move history entries
 * @returns Formatted string of moves
 */
export function formatMoveHistory(history: MoveHistoryEntry[]): string {
  if (history.length === 0) {
    return 'No moves yet.';
  }

  return history
    .map((move, index) => {
      const color = move.color === 'black' ? 'Black(X)' : 'White(O)';
      return `${index + 1}. ${color} ${move.position}`;
    })
    .join('\n');
}

/**
 * Build the system prompt for LLM AI
 * @param request - LLM move request containing board state and context
 * @returns Complete system prompt string
 */
export function buildSystemPrompt(request: LLMMoveRequest): string {
  const { board, currentPlayer, history } = request;

  const boardAscii = boardToAsciiString(board);
  const moveHistoryStr = formatMoveHistory(history);
  const playerColor = currentPlayer === 'black' ? 'Black(X)' : 'White(O)';
  const opponentColor = currentPlayer === 'black' ? 'White(O)' : 'Black(X)';

  return `You are an expert Gomoku (Five in a Row) player. Analyze the current board position and determine the best move.

## Board State
The board is 15x15. X represents Black pieces, O represents White pieces, and . represents empty cells.
Columns are labeled A-O (left to right), rows are numbered 1-15 (bottom to top).

${boardAscii}

## Current Turn
You are playing as ${playerColor}. It is your turn to move.

## Move History
${moveHistoryStr}

## Your Task
Analyze the board and determine the best move. Consider:
1. **Offensive opportunities**: Can you create a winning threat (open four, double-three, etc.)?
2. **Defensive necessities**: Must you block opponent's winning threat?
3. **Strategic positioning**: Control the center, create multiple threats.

## Response Format
You MUST respond with valid JSON in this exact format:
{
  "move": "H8",
  "reason": "Brief explanation of your strategic reasoning"
}

The "move" field must be a coordinate like "H8" (column letter + row number).
The "reason" field should explain your thinking in 1-2 sentences.

Think step by step:
1. First, identify any immediate winning moves or threats you must block.
2. Then, evaluate the best strategic position if no immediate threat exists.
3. Finally, output your move in the required JSON format.

Remember: You are ${playerColor}. Your opponent (${opponentColor}) just moved. Make your move now.`;
}

/**
 * Build a user prompt for the LLM
 * @param request - LLM move request
 * @returns User prompt string
 */
export function buildUserPrompt(request: LLMMoveRequest): string {
  const playerColor = request.currentPlayer === 'black' ? 'Black(X)' : 'White(O)';
  return `It is ${playerColor}'s turn. What is your move? Respond with JSON only.`;
}

/**
 * Create LLM request from frontend game state
 * @param board - Numeric board (0/1/2)
 * @param currentPlayer - Current player color
 * @param moveHistory - Array of frontend moves
 * @returns LLMMoveRequest object
 */
export function createLLMRequest(
  board: number[][],
  currentPlayer: PlayerColor,
  moveHistory: Array<{ r: number; c: number; player: number }>
): LLMMoveRequest {
  const asciiBoard = numericToAsciiBoard(board);

  const history: MoveHistoryEntry[] = moveHistory.map((move, index) => ({
    position: coordinatesToNotation(move.c, move.r),
    color: move.player === 1 ? 'black' : 'white',
    step: index + 1,
  }));

  return {
    board: asciiBoard,
    currentPlayer,
    history,
  };
}

/**
 * Get all empty positions on the board
 * @param board - ASCII board state
 * @returns Array of { x, y } coordinates for empty cells
 */
export function getEmptyPositions(board: BoardState): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === '.') {
        positions.push({ x, y });
      }
    }
  }

  return positions;
}

/**
 * Get a random empty position (fallback for invalid LLM responses)
 * @param board - ASCII board state
 * @returns Random empty position or null if board is full
 */
export function getRandomEmptyPosition(board: BoardState): { x: number; y: number } | null {
  const emptyPositions = getEmptyPositions(board);

  if (emptyPositions.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * emptyPositions.length);
  return emptyPositions[randomIndex];
}
