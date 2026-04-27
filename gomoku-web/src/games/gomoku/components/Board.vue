<script setup lang="ts">
import { computed } from 'vue';
import { BOARD_SIZE, EMPTY, BLACK, WHITE, isStarPoint } from '../gameLogic';
import type { ThemeKey } from '../../../common/theme';
import { getThemeColors } from '../../../common/theme';

const props = defineProps<{
  board: number[][];
  currentPlayer: number;
  winner: number;
  mode: 'pvp' | 'pve';
  hintMove: {r: number, c: number} | null;
  moveHistory: {r: number, c: number, player: number}[];
  winningLine: {r: number, c: number}[];
  aiPlayer?: number;
  isAnalysisMode?: boolean;
  thinkingPath?: {r: number, c: number, player: number}[];
  forbiddenPoints?: {r: number, c: number}[];
  showSteps?: boolean;
  theme?: ThemeKey;
}>();

const emit = defineEmits<{
  (e: 'placePiece', r: number, c: number): void;
}>();

const isWinningPiece = (r: number, c: number) => {
  return props.winningLine.some(p => p.r === r && p.c === c);
};

const isForbidden = (r: number, c: number) => {
  if (!props.forbiddenPoints) return false;
  return props.forbiddenPoints.some(p => p.r === r && p.c === c);
};

const stepMap = computed(() => {
  const map = new Map<string, number>();
  if (props.showSteps) {
    props.moveHistory.forEach((step, i) => {
      map.set(`${step.r},${step.c}`, i + 1);
    });
  }
  return map;
});

const thinkingMap = computed(() => {
  const map = new Map<string, {index: number, player: number}>();
  if (props.thinkingPath) {
    props.thinkingPath.forEach((step, i) => {
      map.set(`${step.r},${step.c}`, { index: i + 1, player: step.player });
    });
  }
  return map;
});

const themeColors = computed(() => {
  const themeKey = props.theme || 'default';
  return getThemeColors(themeKey);
});

// 棋子文字颜色类
const pieceTextClass = (player: number) => {
  const theme = props.theme || 'default';
  const colors = getThemeColors(theme);
  if (theme === 'cyber') {
    // cyber主题：棋子文字都用白色
    return '!text-white';
  }
  // 其他主题：黑棋用pieceTextSecondary，白棋用pieceTextPrimary
  return player === BLACK ? colors.pieceTextSecondary : colors.pieceTextPrimary;
};

// 棋子边框颜色类
const pieceBorderClass = (player: number) => {
  const theme = props.theme || 'default';
  if (theme === 'cyber') {
    // cyber主题：黑棋用红色边框，白棋用青色边框
    return player === BLACK ? 'border-[#F43F5E]/50' : 'border-[#2DD4BF]/50';
  }
  if (theme === 'zen') {
    // zen主题：白棋用淡灰色边框
    return player === WHITE ? 'border-[#D1D5DB]' : '';
  }
  if (theme === 'minimal') {
    // minimal主题：白棋用灰色边框
    return player === WHITE ? 'border-gray-300 dark:border-gray-400' : '';
  }
  // default主题：白棋用灰色边框
  return player === WHITE ? 'border-gray-300 dark:border-gray-600' : '';
};
</script>

<template>
  <div class="relative p-2 sm:p-3 md:p-4 lg:p-5 rounded-md shadow-2xl border-[3px] flex" :class="[themeColors.boardBackground, themeColors.lineColor]">
    <!-- Left Coordinates (Numbers) - displayed from 15 (top) to 1 (bottom) -->
    <div class="flex flex-col mr-1 sm:mr-2 font-bold text-xs sm:text-sm select-none opacity-70" :class="themeColors.textPrimary">
      <div v-for="n in 15" :key="n" class="h-5 sm:h-6 md:h-7 lg:h-9 xl:h-10 flex items-center justify-center w-2.5 sm:w-3 md:w-3.5 lg:w-4.5 xl:w-5">{{ 16 - n }}</div>
    </div>
    
    <div class="flex flex-col">
      <!-- Interactive Cells -->
      <div class="relative z-10 grid" :style="{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }">
        <template v-for="(row, r) in board" :key="r">
          <div 
            v-for="(cell, c) in row" 
            :key="`${r}-${c}`" 
            class="relative w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-9 lg:h-9 xl:w-10 xl:h-10 flex items-center justify-center cursor-pointer group"
            @click="emit('placePiece', r, c)"
          >
            <!-- Cross lines -->
            <div class="absolute inset-0 pointer-events-none">
              <div class="absolute top-1/2 h-[1px]" :class="themeColors.lineBackground" 
                   :style="{ left: c === 0 ? '50%' : '0', right: c === BOARD_SIZE - 1 ? '50%' : '0' }"></div>
              <div class="absolute left-1/2 w-[1px]" :class="themeColors.lineBackground" 
                   :style="{ top: r === 0 ? '50%' : '0', bottom: r === BOARD_SIZE - 1 ? '50%' : '0' }"></div>
            </div>

            <!-- Star point -->
            <div v-if="isStarPoint(r, c)" 
                 class="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full pointer-events-none" :class="themeColors.piecePrimary"></div>

            <!-- Piece -->
            <div
              v-if="cell !== EMPTY"
              class="relative z-10 w-[85%] h-[85%] rounded-full shadow-md transition-all duration-300 flex items-center justify-center border-2"
              :class="[
                cell === BLACK ? themeColors.piecePrimary : themeColors.pieceSecondary,
                pieceBorderClass(cell),
                isWinningPiece(r, c) ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#DEB887] animate-pulse z-20' : ''
              ]"
            >
              <!-- Step Number -->
              <span v-if="showSteps && stepMap.has(`${r},${c}`)"
                    class="text-xs sm:text-sm font-bold"
                    :class="pieceTextClass(cell)">
                {{ stepMap.get(`${r},${c}`) }}
              </span>
              <!-- Last move indicator -->
              <div v-else-if="moveHistory.length > 0 && moveHistory[moveHistory.length - 1].r === r && moveHistory[moveHistory.length - 1].c === c"
                   class="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full opacity-70"
                   :class="themeColors.pieceBackground">
              </div>
            </div>
            
            <!-- Hint Indicator -->
            <div 
              v-else-if="hintMove?.r === r && hintMove?.c === c"
              class="relative z-10 w-[40%] h-[40%] rounded-full bg-emerald-500/80 animate-ping"
            ></div>

            <!-- Thinking Path Indicator -->
            <div
              v-else-if="thinkingMap.has(`${r},${c}`)"
              class="relative z-10 w-[85%] h-[85%] rounded-full opacity-60 flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm border-2"
              :class="[
                thinkingMap.get(`${r},${c}`)!.player === BLACK ? themeColors.piecePrimary : themeColors.pieceSecondary,
                pieceBorderClass(thinkingMap.get(`${r},${c}`)!.player),
                showSteps ? (thinkingMap.get(`${r},${c}`)!.player === BLACK ? 'text-blue-400' : 'text-blue-600') : pieceTextClass(thinkingMap.get(`${r},${c}`)!.player)
              ]"
            >
              {{ thinkingMap.get(`${r},${c}`)!.index }}
            </div>

            <!-- Hover Indicator -->
            <div 
              v-else-if="winner === EMPTY && (mode === 'pvp' || isAnalysisMode || currentPlayer !== aiPlayer)"
              class="relative z-10 w-[85%] h-[85%] rounded-full opacity-0 group-hover:opacity-40 transition-opacity"
              :class="currentPlayer === BLACK ? themeColors.piecePrimary : themeColors.pieceSecondary"
            ></div>

            <!-- Forbidden Point -->
            <div v-if="isForbidden(r, c)" class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <svg class="w-1/2 h-1/2 text-red-500 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
          </div>
        </template>
      </div>
      
      <!-- Bottom Coordinates (Letters) -->
      <div class="flex mt-1 sm:mt-2 font-bold text-xs sm:text-sm select-none opacity-70" :class="themeColors.textPrimary">
        <div v-for="l in 15" :key="l" class="w-5 sm:w-6 md:w-7 lg:w-9 xl:w-10 flex items-center justify-center">{{ String.fromCharCode(64 + l) }}</div>
      </div>
    </div>
  </div>
</template>
