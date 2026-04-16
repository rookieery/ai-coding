<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  BoardState,
  PieceType,
  PlayerSide,
  BoardCoord,
  GameMode,
  MoveHistory,
} from '../types';
import { t } from '../../../i18n';
import type { ThemeKey } from '../../../common/theme';
import { getThemeColors } from '../../../common/theme';

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
  theme?: ThemeKey;
}>();

const emit = defineEmits<{
  (e: 'selectPiece', coord: BoardCoord | null): void;
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
  if (props.validMoves && Array.isArray(props.validMoves)) return props.validMoves;
  // 这里可以调用 gameLogic.getPieceLegalMoves，但需要完整的 gameState，暂不实现
  return [];
});

// 判断指定坐标是否为合法目标
const isLegalTarget = (coord: BoardCoord) => {
  return legalTargets.value?.some(t => t.col === coord.col && t.row === coord.row) ?? false;
};

// 主题颜色计算
const themeColors = computed(() => {
  const themeKey = props.theme || 'default';
  return getThemeColors(themeKey);
});

// 当前主题键
const currentTheme = computed(() => props.theme || 'default');

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
    const isLegalTarget = legalTargets.value?.some(
      target => target.col === coord.col && target.row === coord.row
    ) ?? false;
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


// 棋子颜色内联样式
const pieceColorStyle = (side: PlayerSide) => {
  const theme = currentTheme.value;

  // 红棋固定红色
  if (side === PlayerSide.RED) {
    return { color: '#dc2626 !important' };
  }

  // 黑棋根据主题
  if (theme === 'cyber') {
    return { color: '#ffffff !important' }; // 白色
  }

  // 其他主题使用黑色
  return { color: '#111827 !important' };
};

// 是否为河界行（第4和第5行之间，即 row=4 和 row=5 之间的间隙）
const isRiverRow = (row: number) => row === 4 || row === 5;

// 是否在九宫格内
const isInPalace = (col: number, row: number, side: PlayerSide) => {
  const palaceCols = [3, 4, 5];
  const palaceRows = side === PlayerSide.RED ? [7, 8, 9] : [0, 1, 2];
  return palaceCols.includes(col) && palaceRows.includes(row);
};


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
  <div class="relative p-2 sm:p-3 md:p-4 lg:p-5 rounded-md border-4" :class="[themeColors.boardBackground, themeColors.lineColor]">

    <div class="flex flex-col">
      <!-- 棋盘主体 -->
      <div class="relative z-10 grid" :style="{ gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))` }">
        <template v-for="(row, rowIndex) in board" :key="rowIndex">
          <div
            v-for="(cell, colIndex) in row"
            :key="`${rowIndex}-${colIndex}`"
            class="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 flex items-center justify-center cursor-pointer group"
            :class="[
              themeColors.boardBackground,
              isRiverRow(rowIndex) ? 'border-t border-b border-dashed' : '', isRiverRow(rowIndex) ? themeColors.lineColor : '',
            ]"
            @click="handleCellClick({ col: colIndex, row: rowIndex })"
          >
            <!-- 单元格边框（横线、竖线） -->
            <div class="absolute inset-0 pointer-events-none">
              <!-- 横线 -->
              <div
                class="absolute top-1/2 h-[2px]" :class="themeColors.lineBackground"
                :style="{ left: colIndex === 0 ? '50%' : '0', right: colIndex === BOARD_COLS - 1 ? '50%' : '0' }"
              ></div>
              <!-- 竖线 -->
              <div
                class="absolute left-1/2 w-[2px]" :class="themeColors.lineBackground"
                :style="{ top: rowIndex === 0 ? '50%' : '0', bottom: rowIndex === BOARD_ROWS - 1 ? '50%' : '0' }"
              ></div>
            </div>

            <!-- 河界文字 -->
            <div
              v-if="rowIndex === 4 || rowIndex === 5"
              class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-70 font-bold text-xs sm:text-sm" :class="themeColors.textPrimary"
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
                <div class="absolute top-1/2 left-1/2 w-[141%] h-[2px] transform -translate-x-1/2 -translate-y-1/2 rotate-45" :class="themeColors.lineBackground"></div>
              </div>
              <div
                v-if="(colIndex === 5 && rowIndex === 7) || (colIndex === 3 && rowIndex === 9)"
                class="absolute top-0 left-0 w-full h-full"
                style="clip-path: polygon(100% 0%, 0% 100%);"
              >
                <div class="absolute top-1/2 left-1/2 w-[141%] h-[2px] transform -translate-x-1/2 -translate-y-1/2 -rotate-45" :class="themeColors.lineBackground"></div>
              </div>
            </template>

            <!-- 九宫格斜线（黑方） -->
            <template v-if="isInPalace(colIndex, rowIndex, PlayerSide.BLACK)">
              <div
                v-if="(colIndex === 3 && rowIndex === 0) || (colIndex === 5 && rowIndex === 2)"
                class="absolute top-0 left-0 w-full h-full"
                style="clip-path: polygon(0% 0%, 100% 100%);"
              >
                <div class="absolute top-1/2 left-1/2 w-[141%] h-[2px] transform -translate-x-1/2 -translate-y-1/2 rotate-45" :class="themeColors.lineBackground"></div>
              </div>
              <div
                v-if="(colIndex === 5 && rowIndex === 0) || (colIndex === 3 && rowIndex === 2)"
                class="absolute top-0 left-0 w-full h-full"
                style="clip-path: polygon(100% 0%, 0% 100%);"
              >
                <div class="absolute top-1/2 left-1/2 w-[141%] h-[2px] transform -translate-x-1/2 -translate-y-1/2 -rotate-45" :class="themeColors.lineBackground"></div>
              </div>
            </template>

            <!-- 棋子 -->
            <div
              v-if="cell"
              class="relative z-10 w-[90%] h-[90%] rounded-full shadow-md transition-all duration-300 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600"
              :class="[
                themeColors.pieceBackground,
                selectedCoord?.col === colIndex && selectedCoord?.row === rowIndex
                  ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-amber-100 dark:ring-offset-amber-900 scale-105'
                  : '',
                isCheckHighlight && cell.type === PieceType.KING ? 'ring-4 ring-red-500 animate-pulse' : '',
              ]"
            >
              <!-- 合法目标提示（吃子） -->
              <div
                v-if="isLegalTarget({ col: colIndex, row: rowIndex })"
                class="absolute inset-0 rounded-full border-2 border-red-500 animate-pulse"
              ></div>
              <!-- 棋子字符 -->
              <span class="relative z-10 text-xl sm:text-2xl font-bold" :style="pieceColorStyle(cell.side)">{{ pieceChars[cell.side][cell.type] }}</span>
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
              class="relative z-10 w-[45%] h-[45%] rounded-full bg-emerald-500/80 animate-ping"
            ></div>

            <!-- 思考路径标记 -->
            <div
              v-else-if="thinkingMap.has(`${colIndex},${rowIndex}`)"
              class="relative z-10 w-[90%] h-[90%] rounded-full opacity-60 flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm"
              :class="[
                thinkingMap.get(`${colIndex},${rowIndex}`)!.side === PlayerSide.RED
                  ? `${themeColors.piecePrimary}`
                  : `${themeColors.pieceSecondary}`,
              ]"
            >
              {{ thinkingMap.get(`${colIndex},${rowIndex}`)!.index }}
            </div>

            <!-- 合法移动目标指示（当有棋子被选中时） -->
            <div
              v-else-if="selectedCoord && legalTargets?.some(t => t.col === colIndex && t.row === rowIndex)"
              class="relative z-10 w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 rounded-full bg-green-500 breathing-dot"
            ></div>

            <!-- 悬停指示（轮到当前玩家且游戏未结束） -->
            <div
              v-else-if="!winner && (mode === 'pvp' || isAnalysisMode || currentPlayer !== aiPlayer)"
              class="relative z-10 w-[90%] h-[90%] rounded-full opacity-0 group-hover:opacity-40 transition-opacity"
              :class="currentPlayer === PlayerSide.RED ? `${themeColors.piecePrimary}` : `${themeColors.pieceSecondary}`"
            ></div>
          </div>
        </template>
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

