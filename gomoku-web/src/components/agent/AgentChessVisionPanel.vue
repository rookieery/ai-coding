<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-vue-next';
import html2canvas from 'html2canvas-pro';
import Board from '../../games/chinese-chess/components/Board.vue';
import { BOARD_ROWS, BOARD_COLS } from '../../games/chinese-chess/boardState';
import { PieceType, PlayerSide } from '../../games/chinese-chess/types';
import type { BoardState, Piece, BoardCoord } from '../../games/chinese-chess/types';
import { t, currentTheme } from '../../i18n';
import type { MessageKey } from '../../i18n';
import { useGlobalSettings } from '../../composables/useSettings';
import type { ThemeKey } from '../../common/theme';

defineOptions({
  name: 'AgentChessVisionPanel'
});

const props = defineProps<{
  candidates: number[][][];
  imageBase64: string;
}>();

const emit = defineEmits<{
  (e: 'confirm-replay', pieces: number[][]): void;
  (e: 'confirm-analysis', pieces: number[][], boardImageBase64: string): void;
  (e: 'close'): void;
}>();

const settings = useGlobalSettings();
const theme = computed<ThemeKey>(() => settings.chessTheme.value);

const selectedIndex = ref(0);
const editMode = ref(false);
const editTool = ref<number | 'eraser'>(1);
const showBatchMove = ref(false);
const batchMoveOffset = ref(1);

const selectionStart = ref<{ row: number; col: number } | null>(null);
const selectionEnd = ref<{ row: number; col: number } | null>(null);
const selectedArea = ref<{ startRow: number; startCol: number; endRow: number; endCol: number } | null>(null);

const board = ref<number[][]>(
  props.candidates.length > 0
    ? props.candidates[0].map(row => [...row])
    : Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(0))
);

const CODE_TO_PIECE_TYPE: Record<number, PieceType> = {
  1: PieceType.KING, 2: PieceType.ADVISOR, 3: PieceType.ELEPHANT,
  4: PieceType.KNIGHT, 5: PieceType.ROOK, 6: PieceType.CANNON, 7: PieceType.PAWN,
  8: PieceType.KING, 9: PieceType.ADVISOR, 10: PieceType.ELEPHANT,
  11: PieceType.KNIGHT, 12: PieceType.ROOK, 13: PieceType.CANNON, 14: PieceType.PAWN,
};

const PIECE_CODE_I18N_KEYS: Record<number, string> = {
  1: 'pieceRedKing', 2: 'pieceRedAdvisor', 3: 'pieceRedElephant',
  4: 'pieceRedKnight', 5: 'pieceRedRook', 6: 'pieceRedCannon', 7: 'pieceRedPawn',
  8: 'pieceBlackKing', 9: 'pieceBlackAdvisor', 10: 'pieceBlackElephant',
  11: 'pieceBlackKnight', 12: 'pieceBlackRook', 13: 'pieceBlackCannon', 14: 'pieceBlackPawn',
};

const RED_TOOLS = [1, 2, 3, 4, 5, 6, 7];
const BLACK_TOOLS = [8, 9, 10, 11, 12, 13, 14];

const getPieceName = (code: number): string => {
  const key = PIECE_CODE_I18N_KEYS[code] as MessageKey;
  return t(key);
};

const convertCodesToBoardState = (codes: number[][]): BoardState => {
  const state: BoardState = [];
  for (let row = 0; row < codes.length; row++) {
    const rowArr: (Piece | null)[] = [];
    for (let col = 0; col < codes[row].length; col++) {
      const code = codes[row][col];
      if (code === 0) {
        rowArr.push(null);
      } else {
        rowArr.push({
          type: CODE_TO_PIECE_TYPE[code],
          side: code <= 7 ? PlayerSide.RED : PlayerSide.BLACK,
          coord: { row, col },
        });
      }
    }
    state.push(rowArr);
  }
  return state;
};

const boardState = computed(() => convertCodesToBoardState(board.value));

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
  selectionStart.value = null;
  selectionEnd.value = null;
  selectedArea.value = null;
};

const handleEditCell = (row: number, col: number) => {
  if (!editMode.value) return;
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return;

  if (selectedArea.value === null && showBatchMove.value) {
    if (!selectionStart.value) {
      selectionStart.value = { row, col };
      return;
    }
    const s = selectionStart.value;
    const startRow = Math.min(s.row, row);
    const endRow = Math.max(s.row, row);
    const startCol = Math.min(s.col, col);
    const endCol = Math.max(s.col, col);
    selectedArea.value = { startRow, startCol, endRow, endCol };
    selectionStart.value = null;
    return;
  }

  if (editTool.value === 'eraser') {
    board.value[row][col] = 0;
  } else {
    board.value[row][col] = editTool.value as number;
  }
};

const handleBoardClickCell = (coord: BoardCoord) => {
  handleEditCell(coord.row, coord.col);
};

const handleBoardSelectPiece = (coord: BoardCoord | null) => {
  if (coord) handleEditCell(coord.row, coord.col);
};

const handleBoardMovePiece = (_from: BoardCoord, to: BoardCoord) => {
  handleEditCell(to.row, to.col);
};

const handleBatchMove = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (!selectedArea.value) return;
  const { startRow, startCol, endRow, endCol } = selectedArea.value;
  const offset = batchMoveOffset.value;
  const newBoard = board.value.map(row => [...row]);

  const extracted: number[][] = [];
  for (let r = startRow; r <= endRow; r++) {
    const row: number[] = [];
    for (let c = startCol; c <= endCol; c++) {
      row.push(board.value[r][c]);
      newBoard[r][c] = 0;
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

  const newStartRow = startRow + dr;
  const newStartCol = startCol + dc;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tr = newStartRow + r;
      const tc = newStartCol + c;
      if (tr >= 0 && tr < BOARD_ROWS && tc >= 0 && tc < BOARD_COLS) {
        if (extracted[r][c] !== 0) {
          newBoard[tr][tc] = extracted[r][c];
        }
      }
    }
  }

  board.value = newBoard;

  const newEndRow = newStartRow + rows - 1;
  const newEndCol = newStartCol + cols - 1;

  const clampedStartRow = Math.max(0, Math.min(newStartRow, BOARD_ROWS - 1));
  const clampedEndRow = Math.max(0, Math.min(newEndRow, BOARD_ROWS - 1));
  const clampedStartCol = Math.max(0, Math.min(newStartCol, BOARD_COLS - 1));
  const clampedEndCol = Math.max(0, Math.min(newEndCol, BOARD_COLS - 1));

  selectedArea.value = {
    startRow: clampedStartRow,
    startCol: clampedStartCol,
    endRow: clampedEndRow,
    endCol: clampedEndCol,
  };
};

const hasSelectedArea = computed(() => selectedArea.value !== null);

const boardRef = ref<InstanceType<typeof Board> | null>(null);

const handleConfirmAnalysis = async () => {
  let boardImageBase64 = '';
  const boardEl = boardRef.value?.$el as HTMLElement | undefined;
  if (boardEl) {
    try {
      const canvas = await html2canvas(boardEl, { backgroundColor: null, scale: 2 });
      boardImageBase64 = canvas.toDataURL('image/png');
    } catch {
      boardImageBase64 = '';
    }
  }
  emit('confirm-analysis', getCurrentBoard(), boardImageBase64);
};

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
        {{ t('chessVisionPanelTitle') }}
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
        ref="boardRef"
        :board="boardState"
        :currentPlayer="PlayerSide.RED"
        :winner="undefined"
        mode="pvp"
        :hintMove="undefined"
        :moveHistory="[]"
        :aiPlayer="undefined"
        :isAnalysisMode="false"
        :thinkingPath="[]"
        :showSteps="false"
        :selectedPiece="null"
        :validMoves="[]"
        :theme="theme"
        @clickCell="handleBoardClickCell"
        @selectPiece="handleBoardSelectPiece"
        @movePiece="handleBoardMovePiece"
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
        <!-- Red side tools -->
        <div class="space-y-1.5">
          <span
            class="text-[10px] font-medium"
            :class="currentTheme === 'dark' ? 'text-red-400' : 'text-red-600'"
          >
            {{ t('chessVisionEditRedPieces') }}
          </span>
          <div class="flex gap-1 flex-wrap">
            <button
              v-for="code in RED_TOOLS"
              :key="code"
              @click="editTool = code"
              class="w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200 border-2 flex items-center justify-center"
              :class="[
                editTool === code
                  ? 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/60 dark:border-red-500 dark:text-red-300'
                  : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200')
              ]"
            >
              {{ getPieceName(code) }}
            </button>
          </div>
        </div>

        <!-- Black side tools -->
        <div class="space-y-1.5">
          <span
            class="text-[10px] font-medium"
            :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-600'"
          >
            {{ t('chessVisionEditBlackPieces') }}
          </span>
          <div class="flex gap-1 flex-wrap">
            <button
              v-for="code in BLACK_TOOLS"
              :key="code"
              @click="editTool = code"
              class="w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200 border-2 flex items-center justify-center"
              :class="[
                editTool === code
                  ? 'bg-stone-800 border-stone-500 text-stone-100 dark:bg-stone-600 dark:border-stone-400 dark:text-stone-100'
                  : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200')
              ]"
            >
              {{ getPieceName(code) }}
            </button>
          </div>
        </div>

        <!-- Eraser -->
        <button
          @click="editTool = 'eraser'"
          class="w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 border-2 flex items-center justify-center gap-1.5"
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
                  v-for="offset in [1, 2]"
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
            <div
              v-else-if="selectionStart"
              class="text-[10px] text-center"
              :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
            >
              {{ t('visionBatchMoveHint') }}
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
        @click="handleConfirmAnalysis"
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
