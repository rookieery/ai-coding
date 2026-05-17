/**
 * Unit Tests for Online Game Logic (Gomoku)
 * Covers: legal move, occupied cell, out-of-bounds, wrong turn,
 *         five-in-a-row (4 directions), draw, resign, game-over guard,
 *         and frontend-backend checkWin consistency.
 */

// Mock prisma before importing online-game.service
const mockRoomFindUnique = jest.fn();
const mockRoomUpdate = jest.fn();
const mockUserFindUnique = jest.fn();
const mockMatchCreate = jest.fn();

jest.mock('../app', () => ({
  prisma: {
    room: {
      findUnique: mockRoomFindUnique,
      update: mockRoomUpdate,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
    match: {
      create: mockMatchCreate,
    },
  },
}));

// Mock logger to avoid noise
jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock eloService
jest.mock('../services/elo.service', () => ({
  eloService: {
    updateRatings: jest.fn().mockResolvedValue({
      newPlayerRating: 1216,
      newOpponentRating: 1184,
    }),
  },
}));

import { onlineGameService, checkWin, checkDraw } from '../services/online-game.service';

// -- Constants -------------------------------------------------------------

const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const HOST_ID = 'host-001';
const GUEST_ID = 'guest-001';
const ROOM_ID = 'room-001';

// -- Helpers ---------------------------------------------------------------

function emptyBoard(): number[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function buildPlayingRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: ROOM_ID,
    name: 'Test Room',
    status: 'playing',
    gameType: 'gomoku',
    boardSize: BOARD_SIZE,
    ruleMode: 'standard',
    hostId: HOST_ID,
    host: { username: 'HostPlayer' },
    hostColor: 'black',
    guestId: GUEST_ID,
    guest: { username: 'GuestPlayer' },
    currentPlayer: 'black',
    moveCount: 0,
    spectatorCount: 0,
    maxSpectators: 50,
    isPublic: true,
    isRanked: false,
    winner: null,
    lastMoveAt: null,
    boardState: JSON.stringify(emptyBoard()),
    moves: JSON.stringify([]),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: room update succeeds
  mockRoomUpdate.mockResolvedValue({});
});

// =====================================================================
// 1. Legal move - board state updates correctly
// =====================================================================

describe('Legal move', () => {
  it('places a stone and returns updated board state', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    const result = await onlineGameService.makeMove(ROOM_ID, HOST_ID, 7, 7);

    expect(result.boardState[7][7]).toBe(BLACK);
    expect(result.move).toEqual(
      expect.objectContaining({ r: 7, c: 7, player: BLACK }),
    );
    expect(result.winner).toBeNull();
    expect(result.isDraw).toBe(false);
  });

  it('switches current player after a move', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await onlineGameService.makeMove(ROOM_ID, HOST_ID, 7, 7);

    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentPlayer: 'white' }),
      }),
    );
  });

  it('persists the move to the moves array', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await onlineGameService.makeMove(ROOM_ID, HOST_ID, 0, 0);

    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moves: expect.stringContaining('"r":0'),
          moveCount: 1,
        }),
      }),
    );
  });
});

// =====================================================================
// 2. Occupied cell - cannot place on an occupied position
// =====================================================================

describe('Occupied cell rejection', () => {
  it('rejects move on an already occupied cell (CELL_OCCUPIED)', async () => {
    const board = emptyBoard();
    board[3][4] = BLACK;
    const room = buildPlayingRoom({ boardState: JSON.stringify(board) });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.makeMove(ROOM_ID, HOST_ID, 3, 4),
    ).rejects.toThrow('CELL_OCCUPIED');
  });
});

// =====================================================================
// 3. Out-of-bounds coordinates
// =====================================================================

describe('Out-of-bounds rejection', () => {
  it('rejects negative row (INVALID_COORDINATES)', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.makeMove(ROOM_ID, HOST_ID, -1, 5),
    ).rejects.toThrow('INVALID_COORDINATES');
  });

  it('rejects row >= BOARD_SIZE (INVALID_COORDINATES)', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.makeMove(ROOM_ID, HOST_ID, BOARD_SIZE, 5),
    ).rejects.toThrow('INVALID_COORDINATES');
  });

  it('rejects negative column (INVALID_COORDINATES)', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.makeMove(ROOM_ID, HOST_ID, 5, -1),
    ).rejects.toThrow('INVALID_COORDINATES');
  });

  it('rejects column >= BOARD_SIZE (INVALID_COORDINATES)', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.makeMove(ROOM_ID, HOST_ID, 5, BOARD_SIZE),
    ).rejects.toThrow('INVALID_COORDINATES');
  });
});

// =====================================================================
// 4. Wrong turn - non-current player move is rejected
// =====================================================================

describe('Wrong turn rejection', () => {
  it('rejects move when it is not the player turn (NOT_YOUR_TURN)', async () => {
    // Host is black, current player is black => guest (white) tries to move
    const room = buildPlayingRoom({ currentPlayer: 'black' });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.makeMove(ROOM_ID, GUEST_ID, 7, 7),
    ).rejects.toThrow('NOT_YOUR_TURN');
  });

  it('allows move when it is the correct player turn', async () => {
    const room = buildPlayingRoom({ currentPlayer: 'white' });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    const result = await onlineGameService.makeMove(ROOM_ID, GUEST_ID, 7, 7);

    expect(result.boardState[7][7]).toBe(WHITE);
  });
});

// =====================================================================
// 5. Five-in-a-row detection - horizontal, vertical, two diagonals
// =====================================================================

describe('Five-in-a-row detection', () => {
  it('detects horizontal five-in-a-row and sets winner', async () => {
    const board = emptyBoard();
    // Place 4 black stones horizontally at row 7, cols 3-6
    for (let c = 3; c <= 6; c++) board[7][c] = BLACK;

    const room = buildPlayingRoom({
      boardState: JSON.stringify(board),
      currentPlayer: 'black',
      moveCount: 5,
    });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    const result = await onlineGameService.makeMove(ROOM_ID, HOST_ID, 7, 7);

    expect(result.winner).toBe('black');
    expect(result.isDraw).toBe(false);
    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'finished', winner: 'black' }),
      }),
    );
  });

  it('detects vertical five-in-a-row', async () => {
    const board = emptyBoard();
    // Place 4 white stones vertically at col 7, rows 3-6
    for (let r = 3; r <= 6; r++) board[r][7] = WHITE;

    const room = buildPlayingRoom({
      boardState: JSON.stringify(board),
      currentPlayer: 'white',
      moveCount: 5,
    });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    const result = await onlineGameService.makeMove(ROOM_ID, GUEST_ID, 7, 7);

    expect(result.winner).toBe('white');
  });

  it('detects diagonal five-in-a-row (top-left to bottom-right)', async () => {
    const board = emptyBoard();
    // Place 4 black stones diagonally: (3,3)(4,4)(5,5)(6,6)
    for (let i = 3; i <= 6; i++) board[i][i] = BLACK;

    const room = buildPlayingRoom({
      boardState: JSON.stringify(board),
      currentPlayer: 'black',
      moveCount: 5,
    });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    const result = await onlineGameService.makeMove(ROOM_ID, HOST_ID, 7, 7);

    expect(result.winner).toBe('black');
  });

  it('detects anti-diagonal five-in-a-row (top-right to bottom-left)', async () => {
    const board = emptyBoard();
    // Place 4 white stones anti-diagonally: (3,11)(4,10)(5,9)(6,8)
    board[3][11] = WHITE;
    board[4][10] = WHITE;
    board[5][9] = WHITE;
    board[6][8] = WHITE;

    const room = buildPlayingRoom({
      boardState: JSON.stringify(board),
      currentPlayer: 'white',
      moveCount: 5,
    });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    const result = await onlineGameService.makeMove(ROOM_ID, GUEST_ID, 7, 7);

    expect(result.winner).toBe('white');
  });
});

// =====================================================================
// 6. Draw detection - board full without five-in-a-row
// =====================================================================

describe('Draw detection', () => {
  it('detects draw when board is full with no five-in-a-row', async () => {
    // Fill the entire board with a 3-cycle pattern that guarantees
    // at most 2 consecutive same-colored stones in any direction.
    // Pattern: (r+c)%3 === 0 => BLACK, otherwise WHITE.
    // Along any axis, (r+c) changes by +/-1 so the cycle is B,W,W,B,W,W,...
    // which never yields 5 consecutive same-colored stones.
    const board = emptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (r === BOARD_SIZE - 1 && c === BOARD_SIZE - 1) continue;
        board[r][c] = (r + c) % 3 === 0 ? BLACK : WHITE;
      }
    }
    // The last empty cell is (14,14). Place black there.
    // (14+14)=28, 28%3=1 => originally WHITE. Replacing with BLACK
    // does not create 5-in-a-row (max run around (14,14) is <= 2).

    const room = buildPlayingRoom({
      boardState: JSON.stringify(board),
      currentPlayer: 'black',
      moveCount: BOARD_SIZE * BOARD_SIZE - 1,
    });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    const result = await onlineGameService.makeMove(ROOM_ID, HOST_ID, 14, 14);

    expect(result.winner).toBe('draw');
    expect(result.isDraw).toBe(true);
    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'finished' }),
      }),
    );
  });
});

// =====================================================================
// 7. Resign - opponent becomes winner
// =====================================================================

describe('Resign', () => {
  it('host (black) resigns -> guest (white) wins', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    const result = await onlineGameService.resign(ROOM_ID, HOST_ID);

    expect(result.winner).toBe('white');
    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          winner: 'white',
          status: 'finished',
        }),
      }),
    );
  });

  it('guest (white) resigns -> host (black) wins', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    const result = await onlineGameService.resign(ROOM_ID, GUEST_ID);

    expect(result.winner).toBe('black');
    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          winner: 'black',
          status: 'finished',
        }),
      }),
    );
  });

  it('rejects resign if user is not a player (NOT_A_PLAYER)', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.resign(ROOM_ID, 'stranger'),
    ).rejects.toThrow('NOT_A_PLAYER');
  });

  it('rejects resign when room is not in playing state (GAME_NOT_IN_PROGRESS)', async () => {
    const room = buildPlayingRoom({ status: 'waiting' });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.resign(ROOM_ID, HOST_ID),
    ).rejects.toThrow('GAME_NOT_IN_PROGRESS');
  });
});

// =====================================================================
// 8. Game already ended - cannot make moves
// =====================================================================

describe('Game over guard', () => {
  it('rejects move when game status is finished (GAME_NOT_IN_PROGRESS)', async () => {
    const room = buildPlayingRoom({ status: 'finished' });
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.makeMove(ROOM_ID, HOST_ID, 7, 7),
    ).rejects.toThrow('GAME_NOT_IN_PROGRESS');
  });

  it('rejects move when room does not exist (ROOM_NOT_FOUND)', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(null);

    await expect(
      onlineGameService.makeMove('nonexistent', HOST_ID, 7, 7),
    ).rejects.toThrow('ROOM_NOT_FOUND');
  });

  it('rejects move from user who is not a player (NOT_A_PLAYER)', async () => {
    const room = buildPlayingRoom();
    mockRoomFindUnique.mockResolvedValueOnce(room);

    await expect(
      onlineGameService.makeMove(ROOM_ID, 'stranger', 7, 7),
    ).rejects.toThrow('NOT_A_PLAYER');
  });
});

// =====================================================================
// 9. Frontend-backend checkWin consistency
// =====================================================================

describe('checkWin pure function - frontend parity', () => {
  it('returns null for empty board', () => {
    const board = emptyBoard();
    expect(checkWin(board, 7, 7, BLACK)).toBeNull();
  });

  it('returns null for fewer than 5 in a row', () => {
    const board = emptyBoard();
    board[7][3] = BLACK;
    board[7][4] = BLACK;
    board[7][5] = BLACK;
    board[7][6] = BLACK;
    // Only 4 in a row - checking from (7,3) should return null
    expect(checkWin(board, 7, 3, BLACK)).toBeNull();
  });

  it('detects exactly 5 horizontal from the last-placed stone', () => {
    const board = emptyBoard();
    for (let c = 0; c < 5; c++) board[7][c] = BLACK;

    const result = checkWin(board, 7, 4, BLACK);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
    // All returned cells should be in row 7, cols 0-4
    const cols = result!.map((p) => p.c).sort((a, b) => a - b);
    expect(cols).toEqual([0, 1, 2, 3, 4]);
  });

  it('detects exactly 5 vertical from the last-placed stone', () => {
    const board = emptyBoard();
    for (let r = 0; r < 5; r++) board[r][0] = WHITE;

    const result = checkWin(board, 4, 0, WHITE);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
    const rows = result!.map((p) => p.r).sort((a, b) => a - b);
    expect(rows).toEqual([0, 1, 2, 3, 4]);
  });

  it('detects exactly 5 diagonal (top-left to bottom-right)', () => {
    const board = emptyBoard();
    for (let i = 0; i < 5; i++) board[i][i] = BLACK;

    const result = checkWin(board, 4, 4, BLACK);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
  });

  it('detects exactly 5 anti-diagonal (top-right to bottom-left)', () => {
    const board = emptyBoard();
    for (let i = 0; i < 5; i++) board[i][4 - i] = WHITE;

    const result = checkWin(board, 4, 0, WHITE);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
  });

  it('returns first 5 stones when line has more than 5 (overline)', () => {
    const board = emptyBoard();
    // 6 in a row horizontally
    for (let c = 0; c < 6; c++) board[7][c] = BLACK;

    const result = checkWin(board, 7, 5, BLACK);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
  });

  it('renju mode: black exactly 5 returns win, overline returns null', () => {
    const board = emptyBoard();
    for (let c = 0; c < 5; c++) board[0][c] = BLACK;

    const result5 = checkWin(board, 0, 4, BLACK, 'renju');
    expect(result5).not.toBeNull();
    expect(result5!.length).toBe(5);

    // Now add a 6th stone
    board[0][5] = BLACK;
    const result6 = checkWin(board, 0, 5, BLACK, 'renju');
    expect(result6).toBeNull();
  });

  it('renju mode: white overline still counts as win', () => {
    const board = emptyBoard();
    for (let c = 0; c < 6; c++) board[0][c] = WHITE;

    const result = checkWin(board, 0, 5, WHITE, 'renju');
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
  });

  it('returns null when checking wrong player', () => {
    const board = emptyBoard();
    for (let c = 0; c < 5; c++) board[7][c] = BLACK;

    expect(checkWin(board, 7, 4, WHITE)).toBeNull();
  });
});

// =====================================================================
// 10. checkDraw pure function
// =====================================================================

describe('checkDraw pure function', () => {
  it('returns false for empty board', () => {
    expect(checkDraw(emptyBoard())).toBe(false);
  });

  it('returns true for a fully filled board', () => {
    const board = emptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        board[r][c] = (r + c) % 2 === 0 ? BLACK : WHITE;
      }
    }
    expect(checkDraw(board)).toBe(true);
  });

  it('returns false when at least one cell is empty', () => {
    const board = emptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        board[r][c] = BLACK;
      }
    }
    board[7][7] = EMPTY;
    expect(checkDraw(board)).toBe(false);
  });
});