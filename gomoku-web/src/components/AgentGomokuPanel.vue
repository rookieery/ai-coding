<script setup lang="ts">
import { ref, computed } from 'vue';
import { Undo2, Flag } from 'lucide-vue-next';
import Board from '../games/gomoku/components/Board.vue';
import { BOARD_SIZE, EMPTY, BLACK, WHITE, checkWin, checkDraw, type RuleMode, getForbiddenType } from '../games/gomoku/gameLogic';
import { t, currentTheme } from '../i18n';
import type { ThemeKey } from '../common/theme';
import { useGlobalSettings } from '../composables/useSettings';

defineOptions({
  name: 'AgentGomokuPanel'
});

const emit = defineEmits<{
  (e: 'userMove', r: number, c: number, coord?: string): void;
  (e: 'surrender'): void;
}>();

const settings = useGlobalSettings();
const theme = computed(() => settings.gomokuTheme.value);

const board = ref<number[][]>(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY)));
const currentPlayer = ref<number>(BLACK);
const winner = ref<number>(EMPTY);
const moveHistory = ref<{ r: number; c: number; player: number }[]>([]);
const winningLine = ref<{ r: number; c: number }[]>([]);
const ruleMode = ref<RuleMode>('standard');
const showSteps = ref<boolean>(true);

const forbiddenPoints = computed(() => {
  const points: { r: number; c: number }[] = [];
  if (ruleMode.value !== 'renju') return points;
  if (winner.value !== EMPTY) return points;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board.value[r][c] === EMPTY) {
        if (getForbiddenType(board.value, r, c, BLACK)) {
          points.push({ r, c });
        }
      }
    }
  }
  return points;
});

const statusText = computed(() => {
  if (winner.value === BLACK) return t('statusBlackWin');
  if (winner.value === WHITE) return t('statusWhiteWin');
  if (winner.value === 3) return t('statusDraw');
  return currentPlayer.value === BLACK ? t('statusBlackTurn') : t('statusWhiteTurn');
});

const placePiece = (r: number, c: number) => {
  if (winner.value !== EMPTY || board.value[r][c] !== EMPTY) return;
  if (currentPlayer.value !== BLACK) return;

  if (ruleMode.value === 'renju' && currentPlayer.value === BLACK) {
    const forbidden = getForbiddenType(board.value, r, c, BLACK);
    if (forbidden) {
      return;
    }
  }

  board.value[r][c] = BLACK;
  moveHistory.value.push({ r, c, player: BLACK });

  const winLine = checkWin(board.value, r, c, BLACK, ruleMode.value);
  if (winLine) {
    winner.value = BLACK;
    winningLine.value = winLine;
    return;
  }
  if (checkDraw(board.value)) {
    winner.value = 3;
    return;
  }

  currentPlayer.value = WHITE;
  // Generate coordinate for display
  const colLetter = String.fromCharCode(65 + c);
  const rowNumber = BOARD_SIZE - r;
  const coord = `${colLetter}${rowNumber}`;
  emit('userMove', r, c, coord);
};

const placeAiPiece = (r: number, c: number) => {
  if (board.value[r][c] !== EMPTY) return;

  board.value[r][c] = WHITE;
  moveHistory.value.push({ r, c, player: WHITE });

  const winLine = checkWin(board.value, r, c, WHITE, ruleMode.value);
  if (winLine) {
    winner.value = WHITE;
    winningLine.value = winLine;
    return;
  }
  if (checkDraw(board.value)) {
    winner.value = 3;
    return;
  }

  currentPlayer.value = BLACK;
};

const undo = () => {
  if (moveHistory.value.length < 2) return;
  if (winner.value !== EMPTY) return;

  const aiMove = moveHistory.value.pop();
  if (aiMove) {
    board.value[aiMove.r][aiMove.c] = EMPTY;
  }

  const userMove = moveHistory.value.pop();
  if (userMove) {
    board.value[userMove.r][userMove.c] = EMPTY;
  }

  currentPlayer.value = BLACK;
};

const surrender = () => {
  winner.value = WHITE;
  emit('surrender');
};

const resetGame = () => {
  board.value = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  currentPlayer.value = BLACK;
  winner.value = EMPTY;
  moveHistory.value = [];
  winningLine.value = [];
};

const isValidMove = (r: number, c: number): boolean => {
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
  if (winner.value !== EMPTY) return false;
  if (board.value[r][c] !== EMPTY) return false;
  if (currentPlayer.value !== BLACK) return false;

  if (ruleMode.value === 'renju' && currentPlayer.value === BLACK) {
    const forbidden = getForbiddenType(board.value, r, c, BLACK);
    if (forbidden) return false;
  }

  return true;
};

const placeUserPieceFromChat = (r: number, c: number, coord?: string): boolean => {
  if (!isValidMove(r, c)) return false;

  board.value[r][c] = BLACK;
  moveHistory.value.push({ r, c, player: BLACK });

  const winLine = checkWin(board.value, r, c, BLACK, ruleMode.value);
  if (winLine) {
    winner.value = BLACK;
    winningLine.value = winLine;
    emit('userMove', r, c, coord);
    return true;
  }
  if (checkDraw(board.value)) {
    winner.value = 3;
    emit('userMove', r, c, coord);
    return true;
  }

  currentPlayer.value = WHITE;
  emit('userMove', r, c, coord);
  return true;
};

defineExpose({
  placeAiPiece,
  resetGame,
  getBoard: () => board.value,
  getMoveHistory: () => moveHistory.value,
  isValidMove,
  placeUserPieceFromChat,
});
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <div class="flex items-center justify-between px-4 py-2 border-b shrink-0"
         :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'">
      <span class="text-sm font-medium"
            :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-600'">
        {{ statusText }}
      </span>
      <div class="flex gap-2">
        <button
          @click="undo"
          :disabled="moveHistory.length < 2 || winner !== EMPTY"
          class="flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="currentTheme === 'dark'
            ? 'bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600'
            : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'"
        >
          <Undo2 class="w-3.5 h-3.5" />
          {{ t('undo') }}
        </button>
        <button
          @click="surrender"
          :disabled="winner !== EMPTY"
          class="flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="currentTheme === 'dark'
            ? 'bg-red-900/50 border-red-800 text-red-400 hover:bg-red-900/70'
            : 'bg-red-100 border-red-300 text-red-600 hover:bg-red-200'"
        >
          <Flag class="w-3.5 h-3.5" />
          {{ t('agentSurrender') }}
        </button>
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center overflow-auto p-4">
      <Board
        :board="board"
        :currentPlayer="currentPlayer"
        :winner="winner"
        :mode="'pve'"
        :hintMove="null"
        :moveHistory="moveHistory"
        :winningLine="winningLine"
        :aiPlayer="WHITE"
        :isAnalysisMode="false"
        :thinkingPath="[]"
        :forbiddenPoints="forbiddenPoints"
        :showSteps="showSteps"
        :theme="theme"
        @placePiece="placePiece"
      />
    </div>
  </div>
</template>
