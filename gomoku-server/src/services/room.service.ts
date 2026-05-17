import { prisma } from '../app';
import { logger } from '../utils/logger';
import type { RoomInfo, RuleMode, PlayerColor } from '../socket/types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

class RoomService {
  /**
   * Create a new game room.
   * Initializes boardState as a 15x15 empty array (JSON-stringified).
   */
  async createRoom(
    hostId: string,
    name: string,
    ruleMode: RuleMode,
    isRanked: boolean = false,
  ): Promise<RoomInfo> {
    const BOARD_SIZE = 15;
    const emptyBoard: number[][] = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(0),
    );

    const room = await prisma.room.create({
      data: {
        name,
        ruleMode,
        hostId,
        boardState: JSON.stringify(emptyBoard),
        moves: JSON.stringify([]),
        status: 'waiting',
        gameType: 'gomoku',
        boardSize: BOARD_SIZE,
        currentPlayer: 'black',
        isRanked,
      },
      include: {
        host: { select: { username: true } },
        guest: { select: { username: true } },
      },
    });

    logger.info(`Room created: ${room.id} by host ${hostId}`);
    return this.toRoomInfo(room);
  }

  /**
   * Join a room as the guest player.
   * Uses atomic update with `guestId: null` in the WHERE clause to prevent race conditions.
   */
  async joinRoom(
    roomId: string,
    userId: string,
  ): Promise<{ room: RoomInfo; color: PlayerColor }> {
    // Verify room exists and fetch host info
    const existing = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        host: { select: { username: true } },
        guest: { select: { username: true } },
      },
    });

    if (!existing) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (existing.status !== 'waiting') {
      throw new Error('ROOM_NOT_WAITING');
    }

    if (existing.hostId === userId) {
      throw new Error('CANNOT_JOIN_OWN_ROOM');
    }

    // Atomic update: only succeed if guestId is still null
    const updated = await prisma.room.updateMany({
      where: { id: roomId, guestId: null, status: 'waiting' },
      data: { guestId: userId },
    });

    if (updated.count === 0) {
      throw new Error('ROOM_FULL');
    }

    // Both players present — transition to playing
    const room = await prisma.room.update({
      where: { id: roomId },
      data: { status: 'playing' },
      include: {
        host: { select: { username: true } },
        guest: { select: { username: true } },
      },
    });

    const guestColor: PlayerColor = room.hostColor === 'black' ? 'white' : 'black';
    logger.info(`User ${userId} joined room ${roomId} as ${guestColor}`);

    return { room: this.toRoomInfo(room), color: guestColor };
  }

  /**
   * Leave a room.
   * - Host leaving destroys the room (status → finished).
   * - Guest leaving clears the guest slot and reverts to waiting.
   */
  async leaveRoom(roomId: string, userId: string): Promise<{ destroyed: boolean }> {
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

    const isHost = room.hostId === userId;
    const isGuest = room.guestId === userId;

    if (!isHost && !isGuest) {
      throw new Error('NOT_IN_ROOM');
    }

    if (isHost) {
      // Host leaves → destroy room
      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'finished' },
      });
      logger.info(`Room ${roomId} destroyed (host ${userId} left)`);
      return { destroyed: true };
    }

    // Guest leaves → clear guest, revert to waiting
    await prisma.room.update({
      where: { id: roomId },
      data: {
        guestId: null,
        status: 'waiting',
        moveCount: 0,
        currentPlayer: 'black',
        winner: null,
        boardState: JSON.stringify(
          Array.from({ length: room.boardSize }, () =>
            Array(room.boardSize).fill(0),
          ),
        ),
        moves: JSON.stringify([]),
        lastMoveAt: null,
      },
    });

    logger.info(`Guest ${userId} left room ${roomId}`);
    return { destroyed: false };
  }

  /**
   * Join a room as a spectator.
   * Increments spectatorCount atomically (bounded by maxSpectators).
   */
  async watchRoom(roomId: string, userId: string): Promise<RoomInfo> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (room.spectatorCount >= room.maxSpectators) {
      throw new Error('SPECTATOR_LIMIT_REACHED');
    }

    // Atomic increment with bounds check via updateMany
    const updated = await prisma.room.updateMany({
      where: {
        id: roomId,
        spectatorCount: { lt: room.maxSpectators },
      },
      data: { spectatorCount: { increment: 1 } },
    });

    if (updated.count === 0) {
      throw new Error('SPECTATOR_LIMIT_REACHED');
    }

    const refreshed = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        host: { select: { username: true } },
        guest: { select: { username: true } },
      },
    });

    logger.info(`User ${userId} watching room ${roomId}`);
    return this.toRoomInfo(refreshed);
  }

  /**
   * Stop spectating a room.
   * Decrements spectatorCount (floored at 0).
   */
  async unwatchRoom(roomId: string): Promise<void> {
    await prisma.room.update({
      where: { id: roomId },
      data: { spectatorCount: { decrement: 1 } },
    });

    // Ensure spectatorCount never goes below 0
    await prisma.room.updateMany({
      where: { id: roomId, spectatorCount: { lt: 0 } },
      data: { spectatorCount: 0 },
    });
  }

  /**
   * Get a paginated list of public rooms (status != finished).
   */
  async getRoomList(
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE,
  ): Promise<{ rooms: RoomInfo[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const safePageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safePageSize;

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where: {
          isPublic: true,
          status: { not: 'finished' },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safePageSize,
        include: {
          host: { select: { username: true } },
          guest: { select: { username: true } },
        },
      }),
      prisma.room.count({
        where: {
          isPublic: true,
          status: { not: 'finished' },
        },
      }),
    ]);

    return {
      rooms: rooms.map((r) => this.toRoomInfo(r)),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize),
    };
  }

  /**
   * Get room details by ID, including host and guest usernames.
   */
  async getRoomById(roomId: string): Promise<RoomInfo> {
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

    return this.toRoomInfo(room);
  }

  /**
   * Convert a Prisma Room entity (with host/guest includes) to a RoomInfo DTO.
   */
  toRoomInfo(
    room: {
      id: string;
      name: string;
      status: string;
      gameType: string;
      boardSize: number;
      ruleMode: string;
      hostId: string | null;
      host: { username: string } | null;
      hostColor: string;
      guestId: string | null;
      guest: { username: string } | null;
      currentPlayer: string;
      moveCount: number;
      spectatorCount: number;
      isRanked: boolean;
      createdAt: Date;
    },
  ): RoomInfo {
    return {
      id: room.id,
      name: room.name,
      status: room.status as RoomInfo['status'],
      gameType: room.gameType,
      boardSize: room.boardSize,
      ruleMode: room.ruleMode as RuleMode,
      hostId: room.hostId,
      hostName: room.host?.username ?? '',
      hostColor: room.hostColor as PlayerColor,
      guestId: room.guestId,
      guestName: room.guest?.username ?? null,
      currentPlayer: room.currentPlayer as PlayerColor,
      moveCount: room.moveCount,
      spectatorCount: room.spectatorCount,
      isRanked: room.isRanked,
      createdAt: room.createdAt.toISOString(),
    };
  }
}

export const roomService = new RoomService();
