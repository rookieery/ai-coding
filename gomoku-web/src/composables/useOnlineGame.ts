/**
 * Online Game composable
 * Manages board state, turn logic, and Socket.io game events for online play.
 * Supports reconnection by replaying move history.
 */
import { ref, computed, onUnmounted } from 'vue';
import { socketService } from '../services/socket.service';
import { useGlobalAuth } from './useAuth';
import type { RoomInfo, PlayerColor } from '../api/room-api';
import { BOARD_SIZE, BLACK } from '../games/gomoku/gameConstants';

// ── Types ──────────────────────────────────────────────────────────────────

export type GameStatus = 'waiting' | 'playing' | 'finished';

/**
 * Extended room info that may include move history and board state.
 * Used for reconnection scenarios where the server provides full game data.
 */
export interface RoomGameInfo extends RoomInfo {
  moves?: Array<{ r: number; c: number; player: number; timestamp: number }>;
  boardState?: number[][];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function createEmptyBoard(): number[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function oppositeColor(color: PlayerColor): PlayerColor {
  return color === 'black' ? 'white' : 'black';
}

/**
 * Replay a sequence of moves onto an empty board, returning the restored state.
 */
function replayMoves(
  moves: Array<{ r: number; c: number; player: number }>,
): { board: number[][]; lastPlayer: PlayerColor; count: number } {
  const board = createEmptyBoard();
  let lastPlayer: PlayerColor = 'black';

  for (const move of moves) {
    if (move.r >= 0 && move.r < BOARD_SIZE && move.c >= 0 && move.c < BOARD_SIZE) {
      board[move.r][move.c] = move.player;
    }
    lastPlayer = move.player === BLACK ? 'black' : 'white';
  }

  return { board, lastPlayer, count: moves.length };
}

// ── Shared state (singleton across component instances) ────────────────

const boardState = ref<number[][]>(createEmptyBoard());
const currentPlayer = ref<PlayerColor>('black');
const myColor = ref<PlayerColor | null>(null);
const isSpectator = ref(false);
const gameStatus = ref<GameStatus>('waiting');
const winner = ref<PlayerColor | 'draw' | null>(null);
const moveCount = ref(0);
const lastMove = ref<{ r: number; c: number } | null>(null);
let listenerCount = 0;

// ── Socket event handlers ──────────────────────────────────────────────

function onGameMove(payload: unknown): void {
  const data = payload as {
    roomId: string;
    r: number;
    c: number;
    player: PlayerColor;
    boardState: number[][];
  };
  boardState.value = data.boardState;
  moveCount.value++;
  lastMove.value = { r: data.r, c: data.c };
  currentPlayer.value = oppositeColor(data.player);
}

function onGameOver(payload: unknown): void {
  const data = payload as {
    roomId: string;
    winner: PlayerColor | 'draw' | null;
    reason: string;
  };
  winner.value = data.winner;
  gameStatus.value = 'finished';
}

// ── Composable ─────────────────────────────────────────────────────────

export function useOnlineGame() {
  const isMyTurn = computed(() => {
    if (!myColor.value || isSpectator.value) return false;
    return currentPlayer.value === myColor.value;
  });

  // ── Initialization ──────────────────────────────────────────────────

  /**
   * Initialize the game state from room info.
   * Supports reconnection: when moves data is available, the board is
   * restored by replaying each move step-by-step.
   */
  function initGame(roomInfo: RoomGameInfo, spectator: boolean): void {
    isSpectator.value = spectator;
    gameStatus.value = roomInfo.status as GameStatus;
    moveCount.value = roomInfo.moveCount;
    currentPlayer.value = roomInfo.currentPlayer;
    winner.value = null;

    // Determine myColor from room membership
    if (spectator) {
      myColor.value = null;
    } else {
      const auth = useGlobalAuth();
      const userId = auth.user.value?.id;
      if (userId === roomInfo.hostId) {
        myColor.value = roomInfo.hostColor;
      } else if (userId === roomInfo.guestId) {
        myColor.value = oppositeColor(roomInfo.hostColor);
      } else {
        myColor.value = null;
      }
    }

    // Restore board state: prefer direct boardState, then replay moves, else empty
    if (roomInfo.boardState && Array.isArray(roomInfo.boardState) && roomInfo.boardState.length > 0) {
      boardState.value = roomInfo.boardState;
    } else if (roomInfo.moves && roomInfo.moves.length > 0) {
      const restored = replayMoves(roomInfo.moves);
      boardState.value = restored.board;
      // Set currentPlayer to the opponent of the last player who moved
      currentPlayer.value = oppositeColor(restored.lastPlayer);
      moveCount.value = restored.count;
    } else {
      boardState.value = createEmptyBoard();
    }

    // Restore lastMove from the most recent move if available
    if (roomInfo.moves && roomInfo.moves.length > 0) {
      const last = roomInfo.moves[roomInfo.moves.length - 1];
      lastMove.value = { r: last.r, c: last.c };
    } else {
      lastMove.value = null;
    }
  }

  // ── Player actions ──────────────────────────────────────────────────

  /**
   * Attempt to place a stone at (r, c).
   * Only executes when it's the current user's turn and they are not a spectator.
   * Emits game:move to the server; does NOT modify local state directly.
   */
  function makeMove(r: number, c: number): void {
    if (!isMyTurn.value || isSpectator.value) return;
    socketService.emit('game:move', { r, c });
  }

  /**
   * Resign from the current game.
   * Only executes for active players (not spectators).
   */
  function resign(): void {
    if (isSpectator.value || !myColor.value) return;
    socketService.emit('game:resign', {});
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  function cleanup(): void {
    unregisterListeners();
    boardState.value = createEmptyBoard();
    currentPlayer.value = 'black';
    myColor.value = null;
    isSpectator.value = false;
    gameStatus.value = 'waiting';
    winner.value = null;
    moveCount.value = 0;
    lastMove.value = null;
  }

  // ── Listener lifecycle ──────────────────────────────────────────────

  function registerListeners(): void {
    if (listenerCount === 0) {
      socketService.on('game:move', onGameMove);
      socketService.on('game:over', onGameOver);
    }
    listenerCount++;
  }

  function unregisterListeners(): void {
    listenerCount--;
    if (listenerCount <= 0) {
      listenerCount = 0;
      socketService.off('game:move', onGameMove);
      socketService.off('game:over', onGameOver);
    }
  }

  registerListeners();
  onUnmounted(() => {
    unregisterListeners();
  });

  return {
    // State
    boardState,
    currentPlayer,
    myColor,
    isMyTurn,
    isSpectator,
    gameStatus,
    winner,
    moveCount,
    lastMove,

    // Methods
    initGame,
    makeMove,
    resign,
    cleanup,
  };
}
