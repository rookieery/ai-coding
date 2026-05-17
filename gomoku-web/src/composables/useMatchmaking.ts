/**
 * Matchmaking composable
 * Manages matchmaking queue state and Socket.io match events.
 * Automatically cancels matchmaking on unmount.
 */
import { ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { socketService } from '../services/socket.service';
import { useGlobalAuth } from './useAuth';
import type { RuleMode } from '../api/room-api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface OpponentInfo {
  id: string;
  username: string;
  rating: number;
}

// ── Shared state (singleton across component instances) ────────────────

const isMatching = ref(false);
const queuePosition = ref(0);
const matchedOpponent = ref<OpponentInfo | null>(null);
const matchedRoomId = ref<string | null>(null);
let listenerCount = 0;

// ── Socket event handlers ──────────────────────────────────────────────

function onMatchWaiting(payload: unknown): void {
  const data = payload as { position: number };
  queuePosition.value = data.position;
}

function onMatchFound(payload: unknown): void {
  const data = payload as { roomId: string; opponent: OpponentInfo };
  matchedRoomId.value = data.roomId;
  matchedOpponent.value = data.opponent;
  isMatching.value = false;
}

// ── Composable ─────────────────────────────────────────────────────────

export function useMatchmaking() {
  const router = useRouter();
  const auth = useGlobalAuth();

  /**
   * Start matchmaking for the given rule mode.
   * Ensures Socket is connected before emitting.
   */
  function startMatchmaking(ruleMode: RuleMode): void {
    if (!auth.isAuthenticated.value) return;

    // Ensure socket is connected
    const token = localStorage.getItem('token');
    if (token && !socketService.isConnected) {
      socketService.connect(token);
    }

    isMatching.value = true;
    queuePosition.value = 0;
    matchedOpponent.value = null;
    matchedRoomId.value = null;

    socketService.emit('match:queue', { ruleMode });
  }

  /**
   * Cancel matchmaking.
   */
  function cancelMatchmaking(): void {
    socketService.emit('match:cancel');
    isMatching.value = false;
    queuePosition.value = 0;
    matchedOpponent.value = null;
    matchedRoomId.value = null;
  }

  /**
   * Navigate to the matched room.
   */
  function navigateToRoom(): void {
    if (matchedRoomId.value) {
      router.push(`/online/room/${matchedRoomId.value}`);
    }
  }

  // ── Listener lifecycle ──────────────────────────────────────────────

  function registerListeners(): void {
    if (listenerCount === 0) {
      socketService.on('match:waiting', onMatchWaiting);
      socketService.on('match:found', onMatchFound);
    }
    listenerCount++;
  }

  function unregisterListeners(): void {
    listenerCount--;
    if (listenerCount <= 0) {
      listenerCount = 0;
      socketService.off('match:waiting', onMatchWaiting);
      socketService.off('match:found', onMatchFound);
    }
  }

  registerListeners();
  onUnmounted(() => {
    // Auto-cancel if still matching when component unmounts
    if (isMatching.value) {
      socketService.emit('match:cancel');
      isMatching.value = false;
    }
    unregisterListeners();
  });

  return {
    // State
    isMatching,
    queuePosition,
    matchedOpponent,
    matchedRoomId,

    // Methods
    startMatchmaking,
    cancelMatchmaking,
    navigateToRoom,
  };
}
