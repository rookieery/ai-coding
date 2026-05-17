// Socket.io event type definitions for online multiplayer
import type { DefaultEventsMap, Server, Socket } from 'socket.io';

// ── Shared Types ──────────────────────────────────────────────────────

export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type PlayerColor = 'black' | 'white';
export type RuleMode = 'standard' | 'renju';
export type ChatChannel = 'players' | 'spectators';
export type GameOverReason = 'win' | 'resign' | 'draw' | 'disconnect' | 'timeout';

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
  guestId: string | null;
  guestName: string | null;
  currentPlayer: PlayerColor;
  moveCount: number;
  spectatorCount: number;
  isRanked: boolean;
  createdAt: string;
}

export interface MessageInfo {
  id: string;
  userId: string | null;
  username: string;
  content: string;
  channel: ChatChannel;
  createdAt: string;
}

// ── Client → Server Payloads ──────────────────────────────────────────

export interface RoomCreatePayload {
  name: string;
  ruleMode: RuleMode;
  isRanked: boolean;
}

export interface RoomJoinPayload {
  roomId: string;
}

export interface RoomLeavePayload {
  roomId: string;
}

export interface RoomWatchPayload {
  roomId: string;
}

export interface RoomListPayload {
  page?: number;
  pageSize?: number;
}

export interface GameMovePayload {
  roomId: string;
  r: number;
  c: number;
}

export interface GameResignPayload {
  roomId: string;
}

export interface ChatSendPayload {
  roomId: string;
  content: string;
  channel: ChatChannel;
}

export interface MatchQueuePayload {
  ruleMode: RuleMode;
}

export interface MatchCancelPayload {
  // No additional fields needed
}

// ── Server → Client Payloads ──────────────────────────────────────────

export interface RoomCreatedPayload {
  room: RoomInfo;
}

export interface RoomUpdatedPayload {
  room: RoomInfo;
}

export interface RoomJoinedPayload {
  room: RoomInfo;
  color: PlayerColor;
}

export interface RoomLeftPayload {
  roomId: string;
}

export interface RoomRemovedPayload {
  roomId: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RoomListResponse {
  rooms: RoomInfo[];
  pagination: PaginationInfo;
}

export interface GameMoveBroadcast {
  roomId: string;
  r: number;
  c: number;
  player: PlayerColor;
  boardState: number[][];
}

export interface RatingChangeEntry {
  oldRating: number;
  newRating: number;
  change: number;
}

export interface GameOverPayload {
  roomId: string;
  winner: PlayerColor | 'draw' | null;
  reason: GameOverReason;
  ratingChanges?: {
    black: RatingChangeEntry;
    white: RatingChangeEntry;
  };
}

export interface ChatMessagePayload {
  roomId: string;
  message: MessageInfo;
}

export interface MatchFoundPayload {
  roomId: string;
  opponent: {
    id: string;
    username: string;
    rating: number;
  };
}

export interface MatchWaitingPayload {
  position: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface DisconnectWarningPayload {
  roomId: string;
  remainingSeconds: number;
}

// ── Socket.io Generic Interfaces ──────────────────────────────────────

export interface ServerEvents {
  'room:created': (payload: RoomCreatedPayload) => void;
  'room:updated': (payload: RoomUpdatedPayload) => void;
  'room:joined': (payload: RoomJoinedPayload) => void;
  'room:left': (payload: RoomLeftPayload) => void;
  'room:removed': (payload: RoomRemovedPayload) => void;
  'room:list': (payload: RoomListResponse) => void;
  'game:move': (payload: GameMoveBroadcast) => void;
  'game:over': (payload: GameOverPayload) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'match:found': (payload: MatchFoundPayload) => void;
  'match:waiting': (payload: MatchWaitingPayload) => void;
  'error': (payload: ErrorPayload) => void;
  'disconnect:warning': (payload: DisconnectWarningPayload) => void;
}

export interface ClientEvents {
  'room:create': (payload: RoomCreatePayload) => void;
  'room:join': (payload: RoomJoinPayload) => void;
  'room:leave': (payload: RoomLeavePayload) => void;
  'room:watch': (payload: RoomWatchPayload) => void;
  'room:list': (payload: RoomListPayload) => void;
  'game:move': (payload: GameMovePayload) => void;
  'game:resign': (payload: GameResignPayload) => void;
  'chat:send': (payload: ChatSendPayload) => void;
  'match:queue': (payload: MatchQueuePayload) => void;
  'match:cancel': (payload: MatchCancelPayload) => void;
}

// ── Socket Data (attached to socket.data) ─────────────────────────────

export interface SocketUserData {
  id: string;
  phone: string;
  email?: string;
  username: string;
  role?: string;
}

export interface SocketData {
  user?: SocketUserData;
}

// ── Typed Socket.io Interfaces ────────────────────────────────────────

export type TypedServer = Server<ClientEvents, ServerEvents, DefaultEventsMap, SocketData>;
export type TypedSocket = Socket<ClientEvents, ServerEvents, DefaultEventsMap, SocketData>;
