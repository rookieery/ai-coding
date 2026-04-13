<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  BoardState,
  Piece,
  PieceType,
  PlayerSide,
  BoardCoord,
  GameMode,
  MoveHistory,
} from '../types';
import { t } from '../../../i18n';

const props = defineProps<{
  board: BoardState;
  currentPlayer: PlayerSide;
  winner?: PlayerSide;
  mode: GameMode;
  hintMove?: { from: BoardCoord; to: BoardCoord };
  moveHistory: MoveHistory[];
  aiPlayer?: PlayerSide;
  isAnalysisMode?: boolean;
  thinkingPath?: { coord: BoardCoord; side: PlayerSide }[];
  showSteps?: boolean;
  selectedPiece?: BoardCoord | null;
  validMoves?: BoardCoord[];
}>();

const emit = defineEmits<{
  (e: 'selectPiece', coord: BoardCoord): void;
  (e: 'movePiece', from: BoardCoord, to: BoardCoord): void;
  (e: 'clickCell', coord: BoardCoord): void;
}>();

// 内部选中的棋子坐标（如果父组件没有传递 selectedPiece 则使用内部状态）
const internalSelected = ref<BoardCoord | null>(null);
const selectedCoord = computed(() => props.selectedPiece ?? internalSelected.value);

// 当选中棋子变化时，计算合法移动目标
const legalTargets = computed(() => {
  if (!selectedCoord.value) return [];
  // 如果父组件提供了 validMoves，则使用父组件的；否则自己计算
  if (props.validMoves) return props.validMoves;
  // 这里可以调用 gameLogic.getPieceLegalMoves，但需要完整的 gameState，暂不实现
  return [];
});

// 点击单元格处理
const handleCellClick = (coord: BoardCoord) => {
  const piece = props.board[coord.row][coord.col];
  // 如果已经选中了一个棋子
  if (selectedCoord.value) {
    // 如果点击的是己方另一个棋子，切换选中
    if (piece && piece.side === props.currentPlayer) {
      internalSelected.value = coord;
      emit('selectPiece', coord);
      return;
    }
    // 检查是否是合法目标
    const isLegalTarget = legalTargets.value.some(
      target => target.col === coord.col && target.row === coord.row
    );
    if (isLegalTarget) {
      emit('movePiece', selectedCoord.value, coord);
      internalSelected.value = null;
      return;
    }
    // 点击其他非法位置，清空选中
    internalSelected.value = null;
    emit('selectPiece', null);
  } else {
    // 没有选中任何棋子，点击己方棋子则选中
    if (piece && piece.side === props.currentPlayer) {
      internalSelected.value = coord;
      emit('selectPiece', coord);
    } else {
      emit('clickCell', coord);
    }
  }
};

// 棋盘尺寸
const BOARD_COLS = 9;
const BOARD_ROWS = 10;

// 棋子 Unicode 字符映射（通过 i18n 获取）
const pieceChars = computed(() => ({
  [PlayerSide.RED]: {
    [PieceType.KING]: t('pieceRedKing'),
    [PieceType.ADVISOR]: t('pieceRedAdvisor'),
    [PieceType.ELEPHANT]: t('pieceRedElephant'),
    [PieceType.KNIGHT]: t('pieceRedKnight'),
    [PieceType.ROOK]: t('pieceRedRook'),
    [PieceType.CANNON]: t('pieceRedCannon'),
    [PieceType.PAWN]: t('pieceRedPawn'),
  },
  [PlayerSide.BLACK]: {
    [PieceType.KING]: t('pieceBlackKing'),
    [PieceType.ADVISOR]: t('pieceBlackAdvisor'),
    [PieceType.ELEPHANT]: t('pieceBlackElephant'),
    [PieceType.KNIGHT]: t('pieceBlackKnight'),
    [PieceType.ROOK]: t('pieceBlackRook'),
    [PieceType.CANNON]: t('pieceBlackCannon'),
    [PieceType.PAWN]: t('pieceBlackPawn'),
  },
}));

// 顶部横坐标数字（1-9）
const topColumnLabels = computed(() => {
  const numbersStr = t('columnTopNumbers');
  return numbersStr.split(',');
});

// 底部横坐标中文数字（九至一）
const bottomColumnLabels = computed(() => {
  const chineseNumbersStr = t('columnBottomChineseNumbers');
  return chineseNumbersStr.split(',');
});

// 棋子颜色类名
const pieceColorClass = (side: PlayerSide) =>
  side === PlayerSide.RED ? 'text-red-600 dark:text-red-400' : 'text-stone-900 dark:text-stone-300';

// 是否为河界行（第4和第5行之间，即 row=4 和 row=5 之间的间隙）
const isRiverRow = (row: number) => row === 4 || row === 5;

// 是否在九宫格内
const isInPalace = (col: number, row: number, side: PlayerSide) => {
  const palaceCols = [3, 4, 5];
  const palaceRows = side === PlayerSide.RED ? [7, 8, 9] : [0, 1, 2];
  return palaceCols.includes(col) && palaceRows.includes(row);
};

// 是否为九宫格对角线交叉点（士的走法点）
const isAdvisorDiagonal = (col: number, row: number, side: PlayerSide) => {
  if (!isInPalace(col, row, side)) return false;
  const palaceCenter = { col: 4, row: side === PlayerSide.RED ? 8 : 1 };
  return Math.abs(col - palaceCenter.col) === 1 && Math.abs(row - palaceCenter.row) === 1;
};

// 是否为九宫格中心（将/帅的初始位置）
const isPalaceCenter = (col: number, row: number, side: PlayerSide) =>
  col === 4 && (side === PlayerSide.RED ? row === 8 : row === 1);

// 步骤映射（显示步数）
const stepMap = computed(() => {
  const map = new Map<string, number>();
  if (props.showSteps) {
    props.moveHistory.forEach((step, i) => {
      map.set(`${step.to.col},${step.to.row}`, i + 1);
    });
  }
  return map;
});

// 思考路径映射
const thinkingMap = computed(() => {
  const map = new Map<string, { index: number; side: PlayerSide }>();
  if (props.thinkingPath) {
    props.thinkingPath.forEach((step, i) => {
      map.set(`${step.coord.col},${step.coord.row}`, { index: i + 1, side: step.side });
    });
  }
  return map;
});

// 是否被将军的高亮（暂时简化）
const isCheckHighlight = computed(() => {
  // 可以根据 winner 或 game status 高亮将/帅
  return false;
});
</script>

<template>
  <div class="relative bg-amber-100 dark:bg-amber-900 border-amber-800 dark:border-amber-700 p-2 sm:p-3 md:p-4 lg:p-5 rounded-md shadow-2xl border-[3px] flex">
    <!-- 左侧纵坐标（数字 1-10） -->
    <div class="flex flex-col mr-1 sm:mr-2 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm select-none opacity-70">
      <div v-for="n in BOARD_ROWS" :key="n" class="h-6 sm:h-7 md:h-8 lg:h-9 xl:h-10 flex items-center justify-center w-3 sm:w-3.5 md:w-4 lg:w-4.5 xl:w-5">
        {{ BOARD_ROWS - n + 1 }}
      </div>
    </div>

    <div class="flex flex-col">
      <!-- 顶部横坐标（数字 1-9） -->
      <div class="flex mb-1 sm:mb-2 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm select-none opacity-70">
        <div v-for="(num, index) in topColumnLabels" :key="index" class="w-6 sm:w-7 md:w-8 lg:w-9 xl:w-10 flex items-center justify-center">
          {{ num }}
        </div>
      </div>
      <!-- 棋盘主体 -->
      <div class="relative z-10 grid" :style="{ gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))` }">
        <template v-for="(row, rowIndex) in board" :key="rowIndex">
          <div
            v-for="(cell, colIndex) in row"
            :key="`${rowIndex}-${colIndex}`"
            class="relative w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 flex items-center justify-center cursor-pointer group"
            :class="[
              (rowIndex + colIndex) % 2 === 0 ? 'bg-amber-100 dark:bg-amber-900' : 'bg-amber-200 dark:bg-amber-800',
              isRiverRow(rowIndex) ? 'border-t border-b border-dashed border-amber-700 dark:border-amber-600' : '',
            ]"
            @click="handleCellClick({ col: colIndex, row: rowIndex })"
          >
            <!-- 单元格边框（横线、竖线） -->
            <div class="absolute inset-0 pointer-events-none">
              <!-- 横线 -->
              <div
                class="absolute top-1/2 h-[1px] bg-amber-800 dark:bg-amber-700"
                :style="{ left: colIndex === 0 ? '50%' : '0', right: colIndex === BOARD_COLS - 1 ? '50%' : '0' }"
              ></div>
              <!-- 竖线 -->
              <div
                class="absolute left-1/2 w-[1px] bg-amber-800 dark:bg-amber-700"
                :style="{ top: rowIndex === 0 ? '50%' : '0', bottom: rowIndex === BOARD_ROWS - 1 ? '50%' : '0' }"
              ></div>
            </div>

            <!-- 河界文字 -->
            <div
              v-if="rowIndex === 4 || rowIndex === 5"
              class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 text-amber-800 dark:text-amber-700 font-bold text-xs sm:text-sm"
            >
              {{ rowIndex === 4 ? t('riverChu') : t('riverHan') }}
            </div>

            <!-- 九宫格斜线（红方） -->
            <template v-if="isInPalace(colIndex, rowIndex, PlayerSide.RED)">
              <div
                v-if="(colIndex === 3 && rowIndex === 7) || (colIndex === 5 && rowIndex === 9)"
                class="absolute top-0 left-0 w-full h-full"
                style="clip-path: polygon(0% 0%, 100% 100%);"
              >
                <div class="absolute top-1/2 left-1/2 w-[141%] h-[1px] bg-amber-800 dark:bg-amber-700 transform -translate-x-1/2 -translate-y-1/2 rotate-45"></div>
              </div>
              <div
                v-if="(colIndex === 5 && rowIndex === 7) || (colIndex === 3 && rowIndex === 9)"
                class="absolute top-0 left-0 w-full h-full"
                style="clip-path: polygon(100% 0%, 0% 100%);"
              >
                <div class="absolute top-1/2 left-1/2 w-[141%] h-[1px] bg-amber-800 dark:bg-amber-700 transform -translate-x-1/2 -translate-y-1/2 -rotate-45"></div>
              </div>
            </template>

            <!-- 九宫格斜线（黑方） -->
            <template v-if="isInPalace(colIndex, rowIndex, PlayerSide.BLACK)">
              <div
                v-if="(colIndex === 3 && rowIndex === 0) || (colIndex === 5 && rowIndex === 2)"
                class="absolute top-0 left-0 w-full h-full"
                style="clip-path: polygon(0% 0%, 100% 100%);"
              >
                <div class="absolute top-1/2 left-1/2 w-[141%] h-[1px] bg-amber-800 dark:bg-amber-700 transform -translate-x-1/2 -translate-y-1/2 rotate-45"></div>
              </div>
              <div
                v-if="(colIndex === 5 && rowIndex === 0) || (colIndex === 3 && rowIndex === 2)"
                class="absolute top-0 left-0 w-full h-full"
                style="clip-path: polygon(100% 0%, 0% 100%);"
              >
                <div class="absolute top-1/2 left-1/2 w-[141%] h-[1px] bg-amber-800 dark:bg-amber-700 transform -translate-x-1/2 -translate-y-1/2 -rotate-45"></div>
              </div>
            </template>

            <!-- 棋子 -->
            <div
              v-if="cell"
              class="relative z-10 w-[85%] h-[85%] rounded-full shadow-md transition-all duration-300 flex items-center justify-center"
              :class="[
                pieceColorClass(cell.side),
                selectedCoord?.col === colIndex && selectedCoord?.row === rowIndex
                  ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-amber-100 dark:ring-offset-amber-900'
                  : '',
                isCheckHighlight && cell.type === PieceType.KING ? 'ring-4 ring-red-500 animate-pulse' : '',
              ]"
            >
              <!-- 棋子字符 -->
              <span class="text-lg sm:text-xl font-bold">{{ pieceChars[cell.side][cell.type] }}</span>
              <!-- 步数标记 -->
              <span
                v-if="showSteps && stepMap.has(`${colIndex},${rowIndex}`)"
                class="absolute -top-1 -right-1 text-xs bg-white dark:bg-stone-800 rounded-full w-4 h-4 flex items-center justify-center"
              >
                {{ stepMap.get(`${colIndex},${rowIndex}`) }}
              </span>
            </div>

            <!-- 提示移动（hintMove） -->
            <div
              v-else-if="hintMove && hintMove.to.col === colIndex && hintMove.to.row === rowIndex"
              class="relative z-10 w-[40%] h-[40%] rounded-full bg-emerald-500/80 animate-ping"
            ></div>

            <!-- 思考路径标记 -->
            <div
              v-else-if="thinkingMap.has(`${colIndex},${rowIndex}`)"
              class="relative z-10 w-[85%] h-[85%] rounded-full opacity-60 flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm"
              :class="[
                thinkingMap.get(`${colIndex},${rowIndex}`)!.side === PlayerSide.RED
                  ? 'bg-red-200 dark:bg-red-900/70'
                  : 'bg-stone-300 dark:bg-stone-700',
              ]"
            >
              {{ thinkingMap.get(`${colIndex},${rowIndex}`)!.index }}
            </div>

            <!-- 合法移动目标指示（当有棋子被选中时） -->
            <div
              v-else-if="selectedCoord && legalTargets.value.some(t => t.col === colIndex && t.row === rowIndex)"
              class="relative z-10 w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-green-500 breathing-dot"
            ></div>

            <!-- 悬停指示（轮到当前玩家且游戏未结束） -->
            <div
              v-else-if="!winner && (mode === 'pvp' || isAnalysisMode || currentPlayer !== aiPlayer)"
              class="relative z-10 w-[85%] h-[85%] rounded-full opacity-0 group-hover:opacity-40 transition-opacity"
              :class="currentPlayer === PlayerSide.RED ? 'bg-red-900' : 'bg-stone-900'"
            ></div>
          </div>
        </template>
      </div>

      <!-- 底部横坐标（中文数字 九至一） -->
      <div class="flex mt-1 sm:mt-2 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm select-none opacity-70">
        <div v-for="(num, index) in bottomColumnLabels" :key="index" class="w-6 sm:w-7 md:w-8 lg:w-9 xl:w-10 flex items-center justify-center">
          {{ num }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes breathing {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
.breathing-dot {
  animation: breathing 1.5s ease-in-out infinite;
}
</style>

