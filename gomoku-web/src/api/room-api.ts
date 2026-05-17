/**
 * Room REST API client
 * Provides methods for fetching room data via HTTP endpoints
 */
import { getApiUrl, getDefaultFetchOptions } from '../config';

// ── Types ──────────────────────────────────────────────────────────────────

export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type PlayerColor = 'black' | 'white';
export type RuleMode = 'standard' | 'renju';

export interface RoomInfo {
  id: string;
  name: string;
  status: RoomStatus;
  gameType: string;
  boardSize: number;
  ruleMode: RuleMode;
  hostId: string | null;
  hostName: string;
  hostColor: PlayerColor;
  hostRating?: number;
  guestId: string | null;
  guestName: string | null;
  guestRating?: number;
  currentPlayer: PlayerColor;
  moveCount: number;
  spectatorCount: number;
  isRanked: boolean;
  createdAt: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

// ── API Functions ──────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of rooms.
 */
export async function fetchRooms(
  page: number = 1,
  pageSize: number = 20,
): Promise<{ rooms: RoomInfo[]; pagination: PaginationInfo }> {
  const url = getApiUrl(`/rooms?page=${page}&pageSize=${pageSize}`);
  const response = await fetch(url, {
    ...getDefaultFetchOptions(false),
    method: 'GET',
  });

  const result: PaginatedResponse<RoomInfo> = await response.json();

  if (!result.success) {
    throw new Error(result.message || result.error || 'Failed to fetch rooms');
  }

  return {
    rooms: result.data ?? [],
    pagination: result.pagination,
  };
}

/**
 * Fetch a single room by ID.
 */
export async function fetchRoomById(roomId: string): Promise<RoomInfo> {
  const url = getApiUrl(`/rooms/${roomId}`);
  const response = await fetch(url, {
    ...getDefaultFetchOptions(false),
    method: 'GET',
  });

  const result: ApiResponse<RoomInfo> = await response.json();

  if (!result.success) {
    throw new Error(result.message || result.error || 'Failed to fetch room');
  }

  return result.data!;
}
