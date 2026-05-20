<script setup lang="ts">
/**
 * OnlineGameView — Online Gomoku game room page
 * Assembles board, player info, spectator list, and game controls.
 * Supports both player and spectator roles.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Flag, LogOut, Loader2 } from 'lucide-vue-next';
import { currentTheme, t } from '../../../i18n';
import { useOnlineGame } from '../../../composables/useOnlineGame';
import { useRoom } from '../../../composables/useRoom';
import { useGlobalAuth } from '../../../composables/useAuth';
import { socketService } from '../../../services/socket.service';
import { fetchRoomById, type RoomInfo, type PlayerColor } from '../../../api/room-api';
import type { RoomGameInfo } from '../../../composables/useOnlineGame';
import OnlineBoard from '../components/online/OnlineBoard.vue';
import PlayerInfo from '../components/online/PlayerInfo.vue';
import SpectatorList from '../components/online/SpectatorList.vue';

const route = useRoute();
const router = useRouter();
const auth = useGlobalAuth();
const {
  boardState,
  currentPlayer,
  myColor,
  isMyTurn: isMyTurnFlag,
  isSpectator: isSpectatorFlag,
  gameStatus,
  winner,
  lastMove,
  initGame,
  makeMove,
  resign,
  cleanup,
} = useOnlineGame();
const room = useRoom();

const roomId = computed(() => route.params.id as string);
const roomInfo = ref<RoomInfo | null>(null);
const loading = ref(true);
const errorMsg = ref('');

// ── Computed helpers ─────────────────────────────────────────

const isSpectator = computed(() => {
  if (!roomInfo.value || !auth.user.value) return true;
  const userId = auth.user.value.id;
  return userId !== roomInfo.value.hostId && userId !== roomInfo.value.guestId;
});

const myPlayerInfo = computed(() => {
  if (!roomInfo.value || !auth.user.value || isSpectator.value) return null;
  const userId = auth.user.value.id;
  if (userId === roomInfo.value.hostId) {
    return { username: auth.user.value.username, color: roomInfo.value.hostColor, rating: roomInfo.value.hostRating ?? auth.user.value.rating };
  }
  if (userId === roomInfo.value.guestId) {
    const guestColor: PlayerColor = roomInfo.value.hostColor === 'black' ? 'white' : 'black';
    return { username: auth.user.value.username, color: guestColor, rating: roomInfo.value.guestRating ?? auth.user.value.rating };
  }
  return null;
});

const opponentInfo = computed(() => {
  if (!roomInfo.value) return null;
  const userId = auth.user.value?.id;

  if (isSpectator.value) {
    return {
      username: roomInfo.value.hostName,
      color: roomInfo.value.hostColor,
      rating: roomInfo.value.hostRating,
    };
  }

  if (userId === roomInfo.value.hostId) {
    const oppColor: PlayerColor = roomInfo.value.hostColor === 'black' ? 'white' : 'black';
    return {
      username: roomInfo.value.guestName ?? t('onlineWaitingPlayer'),
      color: oppColor,
      rating: roomInfo.value.guestRating,
    };
  }
  return {
    username: roomInfo.value.hostName,
    color: roomInfo.value.hostColor,
    rating: roomInfo.value.hostRating,
  };
});

const opponentTurn = computed(() => {
  if (!opponentInfo.value) return false;
  return currentPlayer.value === opponentInfo.value.color;
});

const myTurn = computed(() => {
  if (!myPlayerInfo.value) return false;
  return currentPlayer.value === myPlayerInfo.value.color;
});

/** Game result from current user perspective */
const gameResult = computed(() => {
  if (gameStatus.value !== 'finished') return null;
  if (winner.value === 'draw') return 'draw';
  if (isSpectator.value) return 'finished';
  if (winner.value === myColor.value) return 'win';
  return 'lose';
});

const statusText = computed(() => {
  const status = gameStatus.value;
  if (status === 'waiting') return t('onlineWaitingForOpponent');
  if (status === 'finished') {
    const result = gameResult.value;
    if (result === 'win') return t('onlineYouWin');
    if (result === 'lose') return t('onlineYouLose');
    if (result === 'draw') return t('onlineGameDraw');
    return t('onlineGameFinished');
  }
  if (isSpectator.value) return t('onlineStatusPlaying');
  if (isMyTurnFlag.value) return t('onlineYourTurn');
  return t('onlineOpponentTurn');
});

const waitingForOpponent = computed(
  () => gameStatus.value === 'waiting' && !roomInfo.value?.guestId,
);

// ── Actions ───────────────────────────────────────────────

function handleMove(r: number, c: number): void {
  makeMove(r, c);
}

function handleResign(): void {
  resign();
}

function handleLeave(): void {
  const id = roomId.value;
  if (!isSpectator.value) {
    room.leaveRoom(id);
  }
  cleanup();
  router.push('/online');
}

function goToLobby(): void {
  router.push('/online');
}

// ── Socket handlers ───────────────────────────────────────────

function onRoomUpdated(payload: unknown): void {
  const data = payload as { room: RoomInfo };
  if (data.room.id === roomId.value) {
    roomInfo.value = data.room;
  }
}

function onRoomError(payload: unknown): void {
  const data = payload as { message?: string };
  errorMsg.value = data.message ?? t('requestFailed');
}

// ── Lifecycle ─────────────────────────────────────────

onMounted(async () => {
  const id = roomId.value;
  if (!id) {
    errorMsg.value = t('requestFailed');
    loading.value = false;
    return;
  }

  const token = localStorage.getItem('token');
  if (token && !socketService.isConnected) {
    socketService.connect(token);
  }

  try {
    const fetched = await fetchRoomById(id);
    roomInfo.value = fetched;

    const userId = auth.user.value?.id;
    const spectator = !userId
      || (userId !== fetched.hostId && userId !== fetched.guestId);

    initGame(fetched as RoomGameInfo, spectator);

    if (spectator) {
      socketService.emit('room:watch', { roomId: id });
    } else if (userId === fetched.guestId) {
      socketService.emit('room:join', { roomId: id });
    }
  } catch {
    errorMsg.value = t('requestFailed');
  } finally {
    loading.value = false;
  }

  socketService.on('room:updated', onRoomUpdated);
  socketService.on('room:error', onRoomError);
  socketService.on('game:error', onRoomError);
});

onUnmounted(() => {
  socketService.off('room:updated', onRoomUpdated);
  socketService.off('room:error', onRoomError);
  socketService.off('game:error', onRoomError);
  cleanup();
});
</script>

<template>
  <div
    class="min-h-screen flex flex-col transition-colors duration-300"
    :class="
      currentTheme === 'dark'
        ? 'bg-stone-900 text-stone-100'
        : 'bg-stone-100 text-stone-800'
    "
  >
    <!-- Loading state -->
    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center"
    >
      <Loader2 class="w-8 h-8 animate-spin text-emerald-500" />
    </div>

    <!-- Error state -->
    <div
      v-else-if="errorMsg"
      class="flex-1 flex flex-col items-center justify-center gap-4"
    >
      <p
        class="text-lg font-medium"
        :class="currentTheme === 'dark' ? 'text-red-400' : 'text-red-600'"
      >
        {{ errorMsg }}
      </p>
      <button
        @click="goToLobby"
        class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
      >
        {{ t('onlineBackToLobby') }}
      </button>
    </div>

    <!-- Main game layout -->
    <template v-else>
      <!-- Top bar -->
      <div
        class="flex items-center justify-between px-4 py-3 border-b"
        :class="
          currentTheme === 'dark'
            ? 'border-stone-700 bg-stone-800'
            : 'border-stone-200 bg-white'
        "
      >
        <div class="flex items-center gap-3 min-w-0">
          <h2
            class="text-lg font-bold truncate"
            :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'"
          >
            {{ roomInfo?.name ?? '' }}
          </h2>
          <span
            class="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
            :class="[
              gameStatus === 'playing'
                ? 'bg-emerald-500/20 text-emerald-400'
                : gameStatus === 'finished'
                  ? currentTheme === 'dark'
                    ? 'bg-stone-600/50 text-stone-300'
                    : 'bg-stone-200 text-stone-500'
                  : currentTheme === 'dark'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-amber-100 text-amber-600',
            ]"
          >
            {{ statusText }}
          </span>
        </div>
        <button
          @click="handleLeave"
          class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="
            currentTheme === 'dark'
              ? 'bg-stone-700 hover:bg-stone-600 text-stone-300'
              : 'bg-stone-200 hover:bg-stone-300 text-stone-600'
          "
        >
          <LogOut class="w-4 h-4" />
          {{ t('onlineLeaveRoom') }}
        </button>
      </div>

      <!-- Waiting for opponent -->
      <div
        v-if="waitingForOpponent"
        class="flex-1 flex flex-col items-center justify-center gap-3"
      >
        <Loader2 class="w-10 h-10 animate-spin text-emerald-500" />
        <p class="text-lg font-medium">
          {{ t('onlineWaitingForOpponent') }}
        </p>
      </div>

      <!-- Game area -->
      <div v-else class="flex-1 flex flex-col">
        <!-- Board + side panels -->
        <div class="flex-1 flex items-center justify-center gap-4 p-4 overflow-auto">
          <!-- Left: Opponent PlayerInfo -->
          <div v-if="opponentInfo" class="shrink-0 w-40">
            <PlayerInfo
              :username="opponentInfo.username"
              :color="opponentInfo.color"
              :is-current-turn="opponentTurn"
              :is-disconnected="false"
              :rating="opponentInfo.rating"
            />
          </div>

          <!-- Center: Board -->
          <OnlineBoard
            :board-state="boardState"
            :current-player="currentPlayer"
            :is-my-turn="isMyTurnFlag"
            :is-spectator="isSpectatorFlag"
            :last-move="lastMove"
            @move="handleMove"
          />

          <!-- Right: Own PlayerInfo + SpectatorList -->
          <div class="shrink-0 w-40 flex flex-col gap-3">
            <PlayerInfo
              v-if="myPlayerInfo"
              :username="myPlayerInfo.username"
              :color="myPlayerInfo.color"
              :is-current-turn="myTurn"
              :is-disconnected="false"
              :rating="myPlayerInfo.rating"
            />
            <PlayerInfo
              v-if="isSpectator && roomInfo?.guestName"
              :username="roomInfo.guestName"
              :color="(roomInfo.hostColor === 'black' ? 'white' : 'black') as PlayerColor"
              :is-current-turn="!opponentTurn"
              :is-disconnected="false"
              :rating="roomInfo.guestRating"
            />
            <SpectatorList
              v-if="roomInfo"
              :spectator-count="roomInfo.spectatorCount"
            />
          </div>
        </div>

        <!-- Bottom toolbar -->
        <div
          class="flex items-center justify-center gap-3 px-4 py-3 border-t"
          :class="
            currentTheme === 'dark'
              ? 'border-stone-700 bg-stone-800'
              : 'border-stone-200 bg-white'
          "
        >
          <button
            v-if="!isSpectator && gameStatus === 'playing'"
            @click="handleResign"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 hover:bg-red-700 text-white"
          >
            <Flag class="w-4 h-4" />
            {{ t('onlineResign') }}
          </button>
          <button
            v-if="gameStatus === 'finished'"
            @click="goToLobby"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {{ t('onlineBackToLobby') }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>