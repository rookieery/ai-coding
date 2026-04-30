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

/** 从 Tailwind 颜色类名（如 'border-[#5C4033]'）中提取十六进制颜色值 */
function extractColorFromTailwind(tailwindClass: string): string {
  // 匹配 [#...] 或 [rgb(...)] 格式
  const match = tailwindClass.match(/\[([^\]]+)\]/);
  if (match) {
    return match[1]; // 返回 #5C4033 或 rgb(...)
  }
  // 如果是简单的颜色名如 'red-500'，可以映射，但这里我们只处理自定义颜色
  // 默认返回黑色
  return '#000000';
}

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

// SVG 线条描边颜色（从 lineColor 类名提取）
const lineStrokeColor = computed(() => {
  return extractColorFromTailwind(themeColors.value.lineColor);
});

// 河流文字填充颜色（从 riverTextColor 类名提取）
const riverTextFillColor = computed(() => {
  return extractColorFromTailwind(themeColors.value.riverTextColor);
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


// 棋子背景颜色类（红方用 piecePrimary，黑方用 pieceSecondary）
const pieceBackgroundClass = (side: PlayerSide) => {
  return side === PlayerSide.RED ? themeColors.value.piecePrimary : themeColors.value.pieceSecondary;
};

// 棋子文字颜色类
const pieceTextClass = (side: PlayerSide) => {
  return side === PlayerSide.RED ? themeColors.value.pieceTextPrimary : themeColors.value.pieceTextSecondary;
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

// SVG 网格线条数据（基于 900x1000 坐标系）
const gridLines = computed(() => {
  const lines = [];
  const PADDING = 50;
  const CELL = 100;

  // 内部横线 (8条) - y坐标: 150,250,...,850
  for (let i = 1; i <= 8; i++) {
    const y = PADDING + i * CELL;
    lines.push({
      type: 'horizontal',
      d: `M ${PADDING} ${y} L ${PADDING + 8 * CELL} ${y}`
    });
  }

  // 内部竖线 (7条) - x坐标: 150,250,...,750
  // 竖线在楚河汉界处断开：上半段 y 从 50 到 450，下半段 y 从 550 到 950
  for (let i = 1; i <= 7; i++) {
    const x = PADDING + i * CELL;
    lines.push({
      type: 'vertical',
      d: `M ${x} ${PADDING} L ${x} ${PADDING + 4 * CELL} M ${x} ${PADDING + 5 * CELL} L ${x} ${PADDING + 9 * CELL}`
    });
  }

  return lines;
});

// 九宫格斜线数据（基于 900x1000 坐标系）
const palaceDiagonals = computed(() => {
  const diagonals = [];
  const PADDING = 50;
  const CELL = 100;

  // 上九宫格（黑方）斜线
  // 从 (350,50) 到 (550,250)
  diagonals.push({ d: `M ${PADDING + 3 * CELL} ${PADDING} L ${PADDING + 5 * CELL} ${PADDING + 2 * CELL}` });
  // 从 (550,50) 到 (350,250)
  diagonals.push({ d: `M ${PADDING + 5 * CELL} ${PADDING} L ${PADDING + 3 * CELL} ${PADDING + 2 * CELL}` });

  // 下九宫格（红方）斜线
  // 从 (350,750) 到 (550,950)
  diagonals.push({ d: `M ${PADDING + 3 * CELL} ${PADDING + 7 * CELL} L ${PADDING + 5 * CELL} ${PADDING + 9 * CELL}` });
  // 从 (550,750) 到 (350,950)
  diagonals.push({ d: `M ${PADDING + 5 * CELL} ${PADDING + 7 * CELL} L ${PADDING + 3 * CELL} ${PADDING + 9 * CELL}` });

  return diagonals;
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
        <!-- SVG 网格层 -->
        <svg
          class="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 900 1000"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- 外边框 -->
          <rect
            x="50"
            y="50"
            width="800"
            height="900"
            fill="none"
            :stroke="lineStrokeColor"
            stroke-width="2"
          />
          <!-- 横线 -->
          <path
            v-for="(line, index) in gridLines.filter(l => l.type === 'horizontal')"
            :key="`h-${index}`"
            :d="line.d"
            fill="none"
            :stroke="lineStrokeColor"
            stroke-width="2"
            stroke-linecap="square"
          />
          <!-- 竖线 -->
          <path
            v-for="(line, index) in gridLines.filter(l => l.type === 'vertical')"
            :key="`v-${index}`"
            :d="line.d"
            fill="none"
            :stroke="lineStrokeColor"
            stroke-width="2"
            stroke-linecap="square"
          />
          <!-- 九宫格斜线 -->
          <path
            v-for="(diag, index) in palaceDiagonals"
            :key="`d-${index}`"
            :d="diag.d"
            fill="none"
            :stroke="lineStrokeColor"
            stroke-width="2"
            stroke-linecap="square"
          />
          <!-- 河流文字 -->
          <text
            x="250"
            y="500"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="45"
            font-weight="bold"
            :fill="riverTextFillColor"
          >{{ t('riverChu') }}</text>
          <text
            x="650"
            y="500"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="45"
            font-weight="bold"
            :fill="riverTextFillColor"
          >{{ t('riverHan') }}</text>
        </svg>

        <template v-for="(row, rowIndex) in board" :key="rowIndex">
          <div
            v-for="(cell, colIndex) in row"
            :key="`${rowIndex}-${colIndex}`"
            class="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 flex items-center justify-center cursor-pointer group"
            @click="handleCellClick({ col: colIndex, row: rowIndex })"
          >



            <!-- 棋子 -->
            <div
              v-if="cell"
              class="relative z-10 w-[90%] h-[90%] rounded-full shadow-md transition-all duration-300 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600"
              :class="[
                pieceBackgroundClass(cell.side),
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
              <span class="relative z-10 text-xl sm:text-2xl font-bold" :class="pieceTextClass(cell.side)">{{ pieceChars[cell.side][cell.type] }}</span>
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

