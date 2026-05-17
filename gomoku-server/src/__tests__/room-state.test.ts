/**
 * Unit Tests for Room State Machine
 * Covers: lifecycle transitions, host/guest leave, join validation, spectator management.
 */

// Mock prisma before importing room.service
const mockRoomCreate = jest.fn();
const mockRoomFindUnique = jest.fn();
const mockRoomFindUniqueOrThrow = jest.fn();
const mockRoomUpdate = jest.fn();
const mockRoomUpdateMany = jest.fn();

jest.mock('../app', () => ({
  prisma: {
    room: {
      create: mockRoomCreate,
      findUnique: mockRoomFindUnique,
      findUniqueOrThrow: mockRoomFindUniqueOrThrow,
      update: mockRoomUpdate,
      updateMany: mockRoomUpdateMany,
    },
  },
}));

import { roomService } from '../services/room.service';

// -- Helpers ---------------------------------------------------------------

const HOST_ID = 'host-001';
const GUEST_ID = 'guest-001';
const ROOM_ID = 'room-001';
const BOARD_SIZE = 15;

function emptyBoard(): number[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

/** Build a minimal Prisma-style room record used as mock return value */
function buildRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: ROOM_ID,
    name: 'Test Room',
    status: 'waiting',
    gameType: 'gomoku',
    boardSize: BOARD_SIZE,
    ruleMode: 'standard',
    hostId: HOST_ID,
    host: { username: 'HostPlayer', rating: 1200 },
    hostColor: 'black',
    guestId: null,
    guest: null,
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
});

// -- 1. Room lifecycle: waiting -> playing -> finished --------------------

describe('Room lifecycle', () => {
  it('creates a room with status waiting', async () => {
    const roomData = buildRoom();
    mockRoomCreate.mockResolvedValue(roomData);

    const result = await roomService.createRoom(HOST_ID, 'Test Room', 'standard');

    expect(result.status).toBe('waiting');
    expect(mockRoomCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hostId: HOST_ID,
          status: 'waiting',
        }),
      }),
    );
  });

  it('transitions from waiting to playing when guest joins', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(
      buildRoom({ status: 'waiting', guestId: null }),
    );
    mockRoomUpdateMany.mockResolvedValueOnce({ count: 1 });
    mockRoomUpdate.mockResolvedValueOnce(
      buildRoom({ status: 'playing', guestId: GUEST_ID, guest: { username: 'GuestPlayer', rating: 1100 } }),
    );

    const result = await roomService.joinRoom(ROOM_ID, GUEST_ID);

    expect(result.room.status).toBe('playing');
    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'playing' },
      }),
    );
  });

  it('transitions to finished when host leaves', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(
      buildRoom({ status: 'playing', guestId: GUEST_ID, guest: { username: 'GuestPlayer', rating: 1100 } }),
    );
    mockRoomUpdate.mockResolvedValueOnce(
      buildRoom({ status: 'finished' }),
    );

    const result = await roomService.leaveRoom(ROOM_ID, HOST_ID);

    expect(result.destroyed).toBe(true);
    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'finished' },
      }),
    );
  });
});

// -- 2. Host leaves -> room destroyed (status=finished) -------------------

describe('Host leaving', () => {
  it('destroys the room when host leaves during waiting', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(buildRoom());
    mockRoomUpdate.mockResolvedValueOnce(buildRoom({ status: 'finished' }));

    const result = await roomService.leaveRoom(ROOM_ID, HOST_ID);

    expect(result.destroyed).toBe(true);
    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ROOM_ID },
        data: { status: 'finished' },
      }),
    );
  });

  it('destroys the room when host leaves during playing', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(
      buildRoom({ status: 'playing', guestId: GUEST_ID }),
    );
    mockRoomUpdate.mockResolvedValueOnce(buildRoom({ status: 'finished' }));

    const result = await roomService.leaveRoom(ROOM_ID, HOST_ID);

    expect(result.destroyed).toBe(true);
  });
});

// -- 3. Guest leaves -> room reverts to waiting ---------------------------

describe('Guest leaving', () => {
  it('reverts room to waiting when guest leaves during playing', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(
      buildRoom({ status: 'playing', guestId: GUEST_ID, guest: { username: 'GuestPlayer', rating: 1100 } }),
    );
    mockRoomUpdate.mockResolvedValueOnce(
      buildRoom({ status: 'waiting', guestId: null, guest: null }),
    );

    const result = await roomService.leaveRoom(ROOM_ID, GUEST_ID);

    expect(result.destroyed).toBe(false);
    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          guestId: null,
          status: 'waiting',
        }),
      }),
    );
  });

  it('resets board state when guest leaves', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(
      buildRoom({ status: 'playing', guestId: GUEST_ID, guest: { username: 'GuestPlayer', rating: 1100 } }),
    );
    mockRoomUpdate.mockResolvedValueOnce(buildRoom());

    await roomService.leaveRoom(ROOM_ID, GUEST_ID);

    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          boardState: JSON.stringify(emptyBoard()),
          moves: JSON.stringify([]),
          moveCount: 0,
          currentPlayer: 'black',
          winner: null,
        }),
      }),
    );
  });
});

// -- 4. Room full -> reject new player ------------------------------------

describe('Room full rejection', () => {
  it('rejects join when room already has a guest (ROOM_FULL)', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(
      buildRoom({ status: 'waiting', guestId: 'other-guest' }),
    );
    mockRoomUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(roomService.joinRoom(ROOM_ID, GUEST_ID)).rejects.toThrow('ROOM_FULL');
  });
});

// -- 5. Game in progress -> reject new player -----------------------------

describe('Game in progress rejection', () => {
  it('rejects join when room status is playing (ROOM_NOT_WAITING)', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(
      buildRoom({ status: 'playing', guestId: GUEST_ID }),
    );

    await expect(roomService.joinRoom(ROOM_ID, 'new-player')).rejects.toThrow('ROOM_NOT_WAITING');
  });

  it('rejects join when room status is finished (ROOM_NOT_WAITING)', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(
      buildRoom({ status: 'finished' }),
    );

    await expect(roomService.joinRoom(ROOM_ID, 'new-player')).rejects.toThrow('ROOM_NOT_WAITING');
  });
});

// -- 6. Cannot join own room -----------------------------------------------

describe('Cannot join own room', () => {
  it('rejects when host tries to join their own room (CANNOT_JOIN_OWN_ROOM)', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(buildRoom());

    await expect(roomService.joinRoom(ROOM_ID, HOST_ID)).rejects.toThrow('CANNOT_JOIN_OWN_ROOM');
  });
});

// -- 7. Room not found error handling --------------------------------------

describe('Room not found', () => {
  it('joinRoom throws ROOM_NOT_FOUND', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(null);

    await expect(roomService.joinRoom('nonexistent', GUEST_ID)).rejects.toThrow('ROOM_NOT_FOUND');
  });

  it('leaveRoom throws ROOM_NOT_FOUND', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(null);

    await expect(roomService.leaveRoom('nonexistent', HOST_ID)).rejects.toThrow('ROOM_NOT_FOUND');
  });

  it('watchRoom throws ROOM_NOT_FOUND', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(null);

    await expect(roomService.watchRoom('nonexistent', GUEST_ID)).rejects.toThrow('ROOM_NOT_FOUND');
  });

  it('getRoomById throws ROOM_NOT_FOUND', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(null);

    await expect(roomService.getRoomById('nonexistent')).rejects.toThrow('ROOM_NOT_FOUND');
  });
});

// -- 8. Spectator count increment/decrement --------------------------------

describe('Spectator management', () => {
  it('increments spectator count on watch', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(buildRoom({ spectatorCount: 3 }));
    mockRoomUpdateMany.mockResolvedValueOnce({ count: 1 });
    mockRoomFindUniqueOrThrow.mockResolvedValueOnce(
      buildRoom({ spectatorCount: 4, guestId: GUEST_ID, guest: { username: 'GuestPlayer', rating: 1100 } }),
    );

    const result = await roomService.watchRoom(ROOM_ID, 'spectator-1');

    expect(result.spectatorCount).toBe(4);
    expect(mockRoomUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { spectatorCount: { increment: 1 } },
      }),
    );
  });

  it('decrements spectator count on unwatch', async () => {
    mockRoomUpdate.mockResolvedValueOnce({ spectatorCount: 2 });
    mockRoomUpdateMany.mockResolvedValueOnce({ count: 0 });

    await roomService.unwatchRoom(ROOM_ID);

    expect(mockRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { spectatorCount: { decrement: 1 } },
      }),
    );
  });

  it('floors spectator count at 0 after decrement', async () => {
    mockRoomUpdate.mockResolvedValueOnce({});
    mockRoomUpdateMany.mockResolvedValueOnce({ count: 1 });

    await roomService.unwatchRoom(ROOM_ID);

    expect(mockRoomUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ROOM_ID, spectatorCount: { lt: 0 } },
        data: { spectatorCount: 0 },
      }),
    );
  });
});

// -- 9. Spectator over maxSpectators -> reject -----------------------------

describe('Spectator limit', () => {
  it('rejects watch when spectatorCount >= maxSpectators', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(
      buildRoom({ spectatorCount: 50, maxSpectators: 50 }),
    );

    await expect(roomService.watchRoom(ROOM_ID, 'spectator-51')).rejects.toThrow('SPECTATOR_LIMIT_REACHED');
  });

  it('rejects watch on atomic race condition (updateMany count=0)', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(buildRoom({ spectatorCount: 49 }));
    mockRoomUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(roomService.watchRoom(ROOM_ID, 'spectator-50')).rejects.toThrow('SPECTATOR_LIMIT_REACHED');
  });
});

// -- 10. Not in room error -------------------------------------------------

describe('Not in room', () => {
  it('leaveRoom throws NOT_IN_ROOM when user is neither host nor guest', async () => {
    mockRoomFindUnique.mockResolvedValueOnce(buildRoom());

    await expect(roomService.leaveRoom(ROOM_ID, 'stranger')).rejects.toThrow('NOT_IN_ROOM');
  });
});
