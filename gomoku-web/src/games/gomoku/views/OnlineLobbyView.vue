<script setup lang="ts">
/**
 * OnlineLobbyView — Gomoku online lobby page
 * Displays room list, supports creating / joining / watching rooms,
 * and ranked matchmaking.
 *
 * Auth policy: guests can browse rooms and spectate; creating or joining
 * a room requires authentication (enforced client-side with a toast).
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Swords } from 'lucide-vue-next';
import { currentTheme, t } from '../../../i18n';
import { useRoom } from '../../../composables/useRoom';
import { useGlobalAuth } from '../../../composables/useAuth';
import { useMatchmaking } from '../../../composables/useMatchmaking';
import { socketService } from '../../../services/socket.service';
import RoomList from '../components/online/RoomList.vue';
import CreateRoomModal from '../components/online/CreateRoomModal.vue';
import MatchmakingOverlay from '../components/online/MatchmakingOverlay.vue';
import RatingDisplay from '../components/online/RatingDisplay.vue';

const router = useRouter();
const room = useRoom();
const auth = useGlobalAuth();
const matchmaking = useMatchmaking();

const showCreateModal = ref(false);
const errorMsg = ref('');
/** True while we are waiting for the server to confirm a create / join. */
const awaitingJoin = ref(false);
let joinTimeout: ReturnType<typeof setTimeout> | null = null;

function clearJoinTimeout(): void {
  if (joinTimeout) {
    clearTimeout(joinTimeout);
    joinTimeout = null;
  }
}

const userRating = computed(() => {
  const user = auth.user.value;
  return user?.rating ?? 0;
});

// ── Handlers ────────────────────────────────────────────────────────────

function handleOpenCreate(): void {
  if (!auth.isAuthenticated.value) {
    errorMsg.value = t('onlineErrorNotLoggedIn');
    return;
  }
  if (!socketService.isConnected) {
    errorMsg.value = t('onlineErrorServerUnavailable');
    return;
  }
  errorMsg.value = '';
  showCreateModal.value = true;
}

function handleCreate(payload: { name: string; ruleMode: 'standard' | 'renju' }): void {
  showCreateModal.value = false;
  errorMsg.value = '';
  awaitingJoin.value = true;
  room.createRoom(payload.name, payload.ruleMode);

  clearJoinTimeout();
  joinTimeout = setTimeout(() => {
    if (awaitingJoin.value) {
      awaitingJoin.value = false;
      errorMsg.value = t('onlineErrorServerUnavailable');
    }
  }, 10000);
}

function handleJoin(roomId: string): void {
  if (!auth.isAuthenticated.value) {
    errorMsg.value = t('onlineErrorNotLoggedIn');
    return;
  }
  if (!socketService.isConnected) {
    errorMsg.value = t('onlineErrorServerUnavailable');
    return;
  }
  errorMsg.value = '';
  awaitingJoin.value = true;
  room.joinRoom(roomId);

  clearJoinTimeout();
  joinTimeout = setTimeout(() => {
    if (awaitingJoin.value) {
      awaitingJoin.value = false;
      errorMsg.value = t('onlineErrorServerUnavailable');
    }
  }, 10000);
}

function handleWatch(roomId: string): void {
  room.watchRoom(roomId);
  router.push(`/online/room/${roomId}`);
}

function handleRankedMatch(): void {
  if (!auth.isAuthenticated.value) {
    errorMsg.value = t('onlineErrorNotLoggedIn');
    return;
  }
  errorMsg.value = '';
  matchmaking.startMatchmaking('standard');
}

// ── Socket responses ────────────────────────────────────────────────────

function onConnectError(): void {
  errorMsg.value = t('onlineErrorServerUnavailable');
}

function onAuthStatus(payload: unknown): void {
  const data = payload as { authenticated: boolean };
  if (!data.authenticated && auth.isAuthenticated.value) {
    auth.clearAuth();
    socketService.disconnect();
    errorMsg.value = t('onlineErrorTokenExpired');
  }
}

function onRoomJoined(payload: unknown): void {
  if (!awaitingJoin.value) return;
  clearJoinTimeout();
  awaitingJoin.value = false;
  const data = payload as { room: { id: string } };
  router.push(`/online/room/${data.room.id}`);
}

function onError(payload: unknown): void {
  clearJoinTimeout();
  const data = payload as { message?: string };
  errorMsg.value = data.message ?? t('requestFailed');
  awaitingJoin.value = false;
}

// ── Lifecycle ───────────────────────────────────────────────────────────

onMounted(() => {
  room.loadRooms();

  const token = localStorage.getItem('token');
  if (token && !socketService.isConnected) {
    socketService.connect(token);
  }

  socketService.on('connect_error', onConnectError);
  socketService.on('auth:status', onAuthStatus);
  socketService.on('room:joined', onRoomJoined);
  socketService.on('room:error', onError);
});

onUnmounted(() => {
  clearJoinTimeout();
  socketService.off('connect_error', onConnectError);
  socketService.off('auth:status', onAuthStatus);
  socketService.off('room:joined', onRoomJoined);
  socketService.off('room:error', onError);
});
</script>

<template>
  <div
    class="min-h-screen flex flex-col py-8 px-4 transition-colors duration-300"
    :class="currentTheme === 'dark' ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-800'"
  >
    <!-- Header -->
    <div class="max-w-4xl mx-auto w-full">
      <div class="flex items-center justify-between mb-6">
        <h1
          class="text-3xl font-bold tracking-tight"
          :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'"
        >
          {{ t('onlineTitle') }}
        </h1>
        <div class="flex items-center gap-3">
          <RatingDisplay
            v-if="auth.isAuthenticated.value && userRating > 0"
            :rating="userRating"
          />
          <button
            @click="handleRankedMatch"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Swords class="w-4 h-4" />
            {{ t('onlineRankedGame') }}
          </button>
          <button
            @click="handleOpenCreate"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus class="w-4 h-4" />
            {{ t('onlineCreateRoom') }}
          </button>
        </div>
      </div>

      <!-- Loading banner -->
      <div
        v-if="awaitingJoin"
        class="mb-4 px-4 py-3 rounded-lg border text-sm font-medium flex items-center gap-2"
        :class="currentTheme === 'dark'
          ? 'bg-blue-900/30 border-blue-700 text-blue-300'
          : 'bg-blue-50 border-blue-200 text-blue-700'"
      >
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ t('onlineJoiningRoom') }}
      </div>

      <!-- Error banner -->
      <div
        v-if="errorMsg"
        class="mb-4 px-4 py-3 rounded-lg border text-sm font-medium"
        :class="currentTheme === 'dark'
          ? 'bg-red-900/30 border-red-700 text-red-300'
          : 'bg-red-50 border-red-200 text-red-700'"
      >
        {{ errorMsg }}
      </div>

      <!-- Room list -->
      <RoomList
        :rooms="room.rooms.value"
        @join="handleJoin"
        @watch="handleWatch"
      />
    </div>

    <!-- Create room modal -->
    <CreateRoomModal
      :visible="showCreateModal"
      @close="showCreateModal = false"
      @create="handleCreate"
    />

    <!-- Matchmaking overlay -->
    <MatchmakingOverlay
      :visible="matchmaking.isMatching.value || matchmaking.matchedOpponent.value !== null"
      :queue-position="matchmaking.queuePosition.value"
      :matched-opponent="matchmaking.matchedOpponent.value"
      @cancel="matchmaking.cancelMatchmaking()"
      @navigate="matchmaking.navigateToRoom()"
    />
  </div>
</template>
