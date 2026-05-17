import { prisma } from '../app';
import { logger } from '../utils/logger';
import type { RuleMode, PlayerColor } from '../socket/types';

// ── Constants (ported from frontend gameConstants.ts) ──────────────────

const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const PLAYER_COLOR_TO_NUMBER: Record<PlayerColor, number> = {
  black: BLACK,
  white: WHITE,
};

// ── Pure functions (ported from frontend gameConstants.ts) ─────────────

/**
 * Check for a winning line of five (or more) starting from (r, c).
 * Algorithm is identical to the frontend gameConstants.ts checkWin.
 */
export function checkWin(
  board: number[][],
  r: number,
  c: number,
  player: number,
  ruleMode: RuleMode = 'standard',
): { r: number; c: number }[] | null {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    const line: { r: number; c: number }[] = [{ r, c }];

    let i = r + dr;
    let j = c + dc;
    while (
      i >= 0 &&
      i < BOARD_SIZE &&
      j >= 0 &&
      j < BOARD_SIZE &&
      board[i][j] === player
    ) {
      line.push({ r: i, c: j });
      i += dr;
      j += dc;
    }

    i = r - dr;
    j = c - dc;
    while (
      i >= 0 &&
      i < BOARD_SIZE &&
      j >= 0 &&
      j < BOARD_SIZE &&
      board[i][j] === player
    ) {
      line.push({ r: i, c: j });
      i -= dr;
      j -= dc;
    }

    if (ruleMode === 'renju' && player === BLACK) {
      if (line.length === 5) return line;
    } else {
      if (line.length >= 5) return line.slice(0, 5);
    }
  }

  return null;
}

/**
 * Check for a draw (board is full with no winner).
 */
export function checkDraw(board: number[][]): boolean {
  return board.every((row) => row.every((cell) => cell !== EMPTY));
}

// ── Service class ──────────────────────────────────────────────────────

export interface MoveResult {
  boardState: number[][];
  winner: PlayerColor | 'draw' | null;
  isDraw: boolean;
  move: { r: number; c: number; player: number; timestamp: number };
}

export interface ResignResult {
  winner: PlayerColor;
}

class OnlineGameService {
  /**
   * Execute a move in an online game room.
   * Validates the move, updates the board, checks for win/draw, persists to DB.
   */
  async makeMove(
    roomId: string,
    userId: string,
    r: number,
    c: number,
  ): Promise<MoveResult> {
    // Fetch room with host/guest info
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        host: { select: { username: true } },
        guest: { select: { username: true } },
      },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (room.status !== 'playing') {
      throw new Error('GAME_NOT_IN_PROGRESS');
    }

    // Determine which color the current user plays
    const playerColor = this.getPlayerColor(room, userId);
    if (!playerColor) {
      throw new Error('NOT_A_PLAYER');
    }

    // Check if it's this player's turn
    const expectedNumber = PLAYER_COLOR_TO_NUMBER[room.currentPlayer as PlayerColor];
    const playerNumber = PLAYER_COLOR_TO_NUMBER[playerColor];
    if (playerNumber !== expectedNumber) {
      throw new Error('NOT_YOUR_TURN');
    }

    // Validate coordinates
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
      throw new Error('INVALID_COORDINATES');
    }

    // Parse board state
    const board: number[][] = JSON.parse(room.boardState);

    // Check cell is empty
    if (board[r][c] !== EMPTY) {
      throw new Error('CELL_OCCUPIED');
    }

    // Place the stone
    board[r][c] = playerNumber;

    // Build move record
    const move = {
      r,
      c,
      player: playerNumber,
      timestamp: Date.now(),
    };

    // Parse existing moves and append
    const moves: Array<{ r: number; c: number; player: number; timestamp: number }> =
      JSON.parse(room.moves);
    moves.push(move);

    // Check for win
    const ruleMode = room.ruleMode as RuleMode;
    const winLine = checkWin(board, r, c, playerNumber, ruleMode);

    let winner: PlayerColor | 'draw' | null = null;
    let isDraw = false;
    let newStatus = room.status;
    const newMoveCount = room.moveCount + 1;

    // Switch current player
    const nextPlayer: PlayerColor = room.currentPlayer === 'black' ? 'white' : 'black';

    if (winLine) {
      winner = playerColor;
      newStatus = 'finished';
    } else if (checkDraw(board)) {
      winner = 'draw';
      isDraw = true;
      newStatus = 'finished';
    }

    // Persist to database
    await prisma.room.update({
      where: { id: roomId },
      data: {
        boardState: JSON.stringify(board),
        moves: JSON.stringify(moves),
        currentPlayer: nextPlayer,
        moveCount: newMoveCount,
        lastMoveAt: new Date(),
        ...(winner !== null && {
          winner: winner === 'draw' ? 'draw' : winner,
          status: newStatus,
        }),
      },
    });

    logger.info(
      `Move in room ${roomId}: (${r},${c}) by ${userId} — ${winner ? (isDraw ? 'draw' : `${winner} wins`) : 'ongoing'}`,
    );

    return {
      boardState: board,
      winner,
      isDraw,
      move,
    };
  }

  /**
   * Resign from an ongoing game.
   * The opponent is declared the winner.
   */
  async resign(roomId: string, userId: string): Promise<ResignResult> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (room.status !== 'playing') {
      throw new Error('GAME_NOT_IN_PROGRESS');
    }

    const playerColor = this.getPlayerColor(room, userId);
    if (!playerColor) {
      throw new Error('NOT_A_PLAYER');
    }

    // Opponent wins
    const winner: PlayerColor = playerColor === 'black' ? 'white' : 'black';

    await prisma.room.update({
      where: { id: roomId },
      data: {
        winner,
        status: 'finished',
      },
    });

    logger.info(`Player ${userId} resigned in room ${roomId}. Winner: ${winner}`);

    return { winner };
  }

  /**
   * Determine which color a user is playing in the given room.
   * Returns null if the user is neither host nor guest.
   */
  private getPlayerColor(
    room: { hostId: string | null; guestId: string | null; hostColor: string },
    userId: string,
  ): PlayerColor | null {
    if (room.hostId === userId) {
      return room.hostColor as PlayerColor;
    }
    if (room.guestId === userId) {
      return (room.hostColor === 'black' ? 'white' : 'black') as PlayerColor;
    }
    return null;
  }
}

export const onlineGameService = new OnlineGameService();
