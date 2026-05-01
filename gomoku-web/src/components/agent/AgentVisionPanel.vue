<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-vue-next';
import Board from '../../games/gomoku/components/Board.vue';
import { BOARD_SIZE, EMPTY, BLACK, WHITE } from '../../games/gomoku/gameLogic';
import { t, currentTheme } from '../../i18n';
import { useGlobalSettings } from '../../composables/useSettings';
import type { EditTool, SelectionArea } from '../../games/gomoku/composables/useGameState';

defineOptions({
  name: 'AgentVisionPanel'
});

const props = defineProps<{
  candidates: number[][][];
  imageBase64: string;
}>();

const emit = defineEmits<{
  (e: 'confirm-replay', pieces: number[][]): void;
  (e: 'confirm-analysis', pieces: number[][]): void;
  (e: 'close'): void;
}>();

const settings = useGlobalSettings();
const theme = computed(() => settings.gomokuTheme.value);

const selectedIndex = ref(0);
const editMode = ref(false);
const editTool = ref<EditTool>('black');
const showBatchMove = ref(false);
const batchMoveOffset = ref(1);

const isSelecting = ref(false);
const selectionStart = ref<{ r: number; c: number } | null>(null);
const selectionEnd = ref<{ r: number; c: number } | null>(null);
const selectedArea = ref<SelectionArea | null>(null);

const board = ref<number[][]>(
  props.candidates.length > 0
    ? props.candidates[0].map(row => [...row])
    : Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY))
);

const loadCandidate = (index: number) => {
  if (index < 0 || index >= props.candidates.length) return;
  selectedIndex.value = index;
  board.value = props.candidates[index].map(row => [...row]);
  clearSelection();
};

const getCurrentBoard = (): number[][] => {
  return board.value.map(row => [...row]);
};

const clearSelection = () => {
  isSelecting.value = false;
  selectionStart.value = null;
  selectionEnd.value = null;
  selectedArea.value = null;
};

const handleEditBoardCell = (r: number, c: number) => {
  if (!editMode.value) return;
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;

  if (editTool.value === 'black') {
    board.value[r][c] = BLACK;
  } else if (editTool.value === 'white') {
    board.value[r][c] = WHITE;
  } else {
    board.value[r][c] = EMPTY;
  }
};

const handleStartSelection = (r: number, c: number) => {
  if (!editMode.value) return;
  isSelecting.value = true;
  selectionStart.value = { r, c };
  selectionEnd.value = { r, c };
  selectedArea.value = null;
};

const handleUpdateSelection = (r: number, c: number) => {
  if (!editMode.value || !isSelecting.value) return;
  selectionEnd.value = { r, c };
};

const handleEndSelection = () => {
  if (!editMode.value || !isSelecting.value) return;
  isSelecting.value = false;

  if (selectionStart.value && selectionEnd.value) {
    const minR = Math.min(selectionStart.value.r, selectionEnd.value.r);
    const maxR = Math.max(selectionStart.value.r, selectionEnd.value.r);
    const minC = Math.min(selectionStart.value.c, selectionEnd.value.c);
    const maxC = Math.max(selectionStart.value.c, selectionEnd.value.c);

    if (minR !== maxR || minC !== maxC) {
      selectedArea.value = { startR: minR, startC: minC, endR: maxR, endC: maxC };
    }
  }
};

const handleBatchMove = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (!selectedArea.value) return;

  const { startR, startC, endR, endC } = selectedArea.value;
  const offset = batchMoveOffset.value;
  const newBoard = board.value.map(row => [...row]);

  const extracted: number[][] = [];
  for (let r = startR; r <= endR; r++) {
    const row: number[] = [];
    for (let c = startC; c <= endC; c++) {
      row.push(board.value[r][c]);
      newBoard[r][c] = EMPTY;
    }
    extracted.push(row);
  }

  const rows = extracted.length;
  const cols = extracted[0].length;

  let dr = 0, dc = 0;
  switch (direction) {
    case 'up': dr = -offset; break;
    case 'down': dr = offset; break;
    case 'left': dc = -offset; break;
    case 'right': dc = offset; break;
  }

  const newStartR = startR + dr;
  const newStartC = startC + dc;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tr = newStartR + r;
      const tc = newStartC + c;
      if (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE) {
        if (extracted[r][c] !== EMPTY) {
          newBoard[tr][tc] = extracted[r][c];
        }
      }
    }
  }

  board.value = newBoard;

  const newEndR = newStartR + rows - 1;
  const newEndC = newStartC + cols - 1;

  const clampedStartR = Math.max(0, Math.min(newStartR, BOARD_SIZE - 1));
  const clampedEndR = Math.max(0, Math.min(newEndR, BOARD_SIZE - 1));
  const clampedStartC = Math.max(0, Math.min(newStartC, BOARD_SIZE - 1));
  const clampedEndC = Math.max(0, Math.min(newEndC, BOARD_SIZE - 1));

  selectedArea.value = {
    startR: clampedStartR,
    startC: clampedStartC,
    endR: clampedEndR,
    endC: clampedEndC
  };
};

const hasSelectedArea = computed(() => selectedArea.value !== null);

defineExpose({
  getCurrentBoard,
  loadCandidate,
});
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <!-- Top info bar -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b shrink-0"
      :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'"
    >
      <span
        class="text-sm font-medium"
        :class="currentTheme === 'dark' ? 'text-stone-200' : 'text-stone-700'"
      >
        {{ t('agentVisionPanelTitle') }}
      </span>
      <button
        @click="emit('close')"
        class="p-1 rounded-lg transition-colors"
        :class="currentTheme === 'dark' ? 'hover:bg-stone-700 text-stone-400' : 'hover:bg-stone-100 text-stone-500'"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Candidate switching buttons -->
    <div
      class="flex gap-2 px-4 py-2 border-b shrink-0"
      :class="currentTheme === 'dark' ? 'bg-stone-800/50 border-stone-700' : 'bg-stone-50 border-stone-200'"
    >
      <button
        v-for="(_, index) in candidates"
        :key="index"
        @click="loadCandidate(index)"
        class="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 border-2"
        :class="[
          selectedIndex === index
            ? (currentTheme === 'dark' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-indigo-500 border-indigo-400 text-white')
            : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-200 hover:bg-stone-600' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100')
        ]"
      >
        {{ t('agentVisionCandidateLabel', index + 1) }}
      </button>
    </div>

    <!-- Board area -->
    <div class="flex-1 flex items-center justify-center overflow-auto p-4">
      <Board
        :board="board"
        :currentPlayer="BLACK"
        :winner="EMPTY"
        mode="pve"
        :hintMove="null"
        :moveHistory="[]"
        :winningLine="[]"
        :isAnalysisMode="false"
        :thinkingPath="[]"
        :forbiddenPoints="[]"
        :showSteps="false"
        :theme="theme"
        :isVisionEditMode="editMode"
        :editTool="editTool"
        :isSelecting="isSelecting"
        :selectionStart="selectionStart"
        :selectionEnd="selectionEnd"
        :selectedArea="selectedArea"
        @editBoardCell="handleEditBoardCell"
        @startSelection="handleStartSelection"
        @updateSelection="handleUpdateSelection"
        @endSelection="handleEndSelection"
      />
    </div>

    <!-- Toolbar: edit mode + tools -->
    <div
      class="px-4 py-2 border-t shrink-0 space-y-2"
      :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'"
    >
      <!-- Edit mode toggle -->
      <div class="flex items-center justify-between">
        <span
          class="text-xs font-medium"
          :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-600'"
        >
          {{ t('agentVisionEditMode') }}
        </span>
        <button
          @click="editMode = !editMode; if (!editMode) clearSelection()"
          class="relative w-9 h-5 rounded-full transition-colors duration-200"
          :class="editMode
            ? 'bg-indigo-600'
            : (currentTheme === 'dark' ? 'bg-stone-600' : 'bg-stone-300')"
        >
          <span
            class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
            :class="editMode ? 'left-[18px]' : 'left-0.5'"
          />
        </button>
      </div>

      <!-- Edit tools (visible when edit mode is on) -->
      <template v-if="editMode">
        <div class="flex gap-2">
          <button
            @click="editTool = 'black'"
            class="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 border-2 flex items-center justify-center gap-1.5"
            :class="[
              editTool === 'black'
                ? (currentTheme === 'dark' ? 'bg-stone-900 border-stone-600 text-white' : 'bg-stone-800 border-stone-600 text-white')
                : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200')
            ]"
          >
            <span class="w-3 h-3 rounded-full bg-stone-950 border border-stone-400" />
            {{ t('agentVisionEditBlack') }}
          </button>
          <button
            @click="editTool = 'white'"
            class="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 border-2 flex items-center justify-center gap-1.5"
            :class="[
              editTool === 'white'
                ? (currentTheme === 'dark' ? 'bg-stone-900 border-stone-600 text-white' : 'bg-stone-800 border-stone-600 text-white')
                : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200')
            ]"
          >
            <span class="w-3 h-3 rounded-full bg-white border border-stone-400" />
            {{ t('agentVisionEditWhite') }}
          </button>
          <button
            @click="editTool = 'eraser'"
            class="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 border-2 flex items-center justify-center gap-1.5"
            :class="[
              editTool === 'eraser'
                ? (currentTheme === 'dark' ? 'bg-red-900 border-red-700 text-white' : 'bg-red-100 border-red-400 text-red-700')
                : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200')
            ]"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {{ t('agentVisionEraser') }}
          </button>
        </div>

        <!-- Batch move collapsible -->
        <div
          class="rounded-lg border"
          :class="currentTheme === 'dark' ? 'bg-stone-900/50 border-stone-700' : 'bg-stone-50 border-stone-200'"
        >
          <button
            @click="showBatchMove = !showBatchMove"
            class="w-full flex items-center justify-between px-3 py-2 text-xs font-medium"
            :class="currentTheme === 'dark' ? 'text-stone-200' : 'text-stone-700'"
          >
            {{ t('agentVisionBatchMove') }}
            <component :is="showBatchMove ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
          </button>

          <div v-if="showBatchMove" class="px-3 pb-3 space-y-2">
            <p
              class="text-[10px]"
              :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
            >
              {{ t('visionBatchMoveHint') }}
            </p>

            <!-- Offset selector -->
            <div class="flex items-center gap-2">
              <span
                class="text-[10px]"
                :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
              >
                {{ t('visionMoveOffset') }}
              </span>
              <div class="flex gap-1">
                <button
                  v-for="offset in [1, 2, 3]"
                  :key="offset"
                  @click="batchMoveOffset = offset"
                  class="w-6 h-6 rounded text-[10px] font-medium transition-all"
                  :class="[
                    batchMoveOffset === offset
                      ? 'bg-indigo-600 text-white'
                      : (currentTheme === 'dark' ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-stone-200 text-stone-600 hover:bg-stone-300')
                  ]"
                >
                  {{ offset }}
                </button>
              </div>
              <button
                v-if="hasSelectedArea"
                @click="clearSelection"
                class="ml-auto text-[10px] px-2 py-0.5 rounded"
                :class="currentTheme === 'dark' ? 'text-stone-400 hover:text-stone-300' : 'text-stone-500 hover:text-stone-700'"
              >
                {{ t('visionClearSelection') }}
              </button>
            </div>

            <!-- Direction buttons -->
            <div class="flex flex-col items-center gap-0.5">
              <button
                @click="handleBatchMove('up')"
                :disabled="!hasSelectedArea"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                :class="[
                  hasSelectedArea
                    ? (currentTheme === 'dark' ? 'bg-stone-700 hover:bg-indigo-600 text-stone-200' : 'bg-stone-200 hover:bg-indigo-500 text-stone-700 hover:text-white')
                    : (currentTheme === 'dark' ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-stone-100 text-stone-400 cursor-not-allowed')
                ]"
              >
                <ArrowUp class="w-4 h-4" />
              </button>
              <div class="flex gap-0.5">
                <button
                  @click="handleBatchMove('left')"
                  :disabled="!hasSelectedArea"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  :class="[
                    hasSelectedArea
                      ? (currentTheme === 'dark' ? 'bg-stone-700 hover:bg-indigo-600 text-stone-200' : 'bg-stone-200 hover:bg-indigo-500 text-stone-700 hover:text-white')
                      : (currentTheme === 'dark' ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-stone-100 text-stone-400 cursor-not-allowed')
                  ]"
                >
                  <ArrowLeft class="w-4 h-4" />
                </button>
                <button
                  @click="handleBatchMove('down')"
                  :disabled="!hasSelectedArea"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  :class="[
                    hasSelectedArea
                      ? (currentTheme === 'dark' ? 'bg-stone-700 hover:bg-indigo-600 text-stone-200' : 'bg-stone-200 hover:bg-indigo-500 text-stone-700 hover:text-white')
                      : (currentTheme === 'dark' ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-stone-100 text-stone-400 cursor-not-allowed')
                  ]"
                >
                  <ArrowDown class="w-4 h-4" />
                </button>
                <button
                  @click="handleBatchMove('right')"
                  :disabled="!hasSelectedArea"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  :class="[
                    hasSelectedArea
                      ? (currentTheme === 'dark' ? 'bg-stone-700 hover:bg-indigo-600 text-stone-200' : 'bg-stone-200 hover:bg-indigo-500 text-stone-700 hover:text-white')
                      : (currentTheme === 'dark' ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-stone-100 text-stone-400 cursor-not-allowed')
                  ]"
                >
                  <ArrowRight class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Selection status -->
            <div
              v-if="hasSelectedArea"
              class="text-[10px] text-center"
              :class="currentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'"
            >
              {{ t('visionSelectionActive') }}
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Bottom action bar -->
    <div
      class="flex gap-3 px-4 py-3 border-t shrink-0"
      :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'"
    >
      <button
        @click="emit('confirm-replay', getCurrentBoard())"
        class="flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-200"
        :class="currentTheme === 'dark'
          ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
          : 'bg-indigo-500 hover:bg-indigo-400 text-white'"
      >
        {{ t('agentVisionConfirmReplay') }}
      </button>
      <button
        @click="emit('confirm-analysis', getCurrentBoard())"
        class="flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 border-2"
        :class="currentTheme === 'dark'
          ? 'border-indigo-500 text-indigo-400 hover:bg-indigo-600/20'
          : 'border-indigo-400 text-indigo-600 hover:bg-indigo-50'"
      >
        {{ t('agentVisionConfirmAnalysis') }}
      </button>
    </div>
  </div>
</template>
