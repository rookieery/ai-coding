/**
 * LLM AI Service Types for Gomoku
 * Defines interfaces for DeepSeek-powered AI move generation
 */

/**
 * Represents a single cell on the 15x15 Gomoku board
 * - 'X': Black piece
 * - 'O': White piece
 * - '.': Empty cell
 */
export type BoardCell = 'X' | 'O' | '.';

/**
 * 15x15 board state as a 2D array
 */
export type BoardState = BoardCell[][];

/**
 * Player color in Gomoku
 */
export type PlayerColor = 'black' | 'white';

/**
 * Historical move record for context
 */
export interface MoveHistoryEntry {
  position: string;
  color: PlayerColor;
  step: number;
}

/**
 * Request payload for LLM AI move generation
 */
export interface LLMMoveRequest {
  board: BoardState;
  currentPlayer: PlayerColor;
  history: MoveHistoryEntry[];
}

/**
 * Coordinate position on the board
 * Format: 'H8' (column letter + row number)
 */
export type MoveCoordinate = string;

/**
 * Response from LLM AI move generation
 */
export interface LLMMoveResponse {
  move: MoveCoordinate;
  reason: string;
}

/**
 * Validated move with numeric coordinates
 */
export interface ValidatedMove {
  x: number;
  y: number;
  isValid: boolean;
  reason?: string;
}

/**
 * LLM API configuration
 */
export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Error types for LLM service
 */
export type LLMErrorType =
  | 'INVALID_RESPONSE'
  | 'INVALID_COORDINATE'
  | 'OCCUPIED_CELL'
  | 'API_ERROR'
  | 'TIMEOUT';

/**
 * LLM service error
 */
export interface LLMServiceError {
  type: LLMErrorType;
  message: string;
  originalResponse?: unknown;
}