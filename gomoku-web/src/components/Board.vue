<script setup lang="ts">
import { computed } from 'vue';
import { BOARD_SIZE, EMPTY, BLACK, WHITE, isStarPoint } from '../gameLogic';

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
</script>

<template>
  <div class="relative bg-[#DEB887] p-3 sm:p-5 rounded-md shadow-2xl border-[3px] border-[#8B4513] flex">
    <!-- Left Coordinates (Numbers) -->
    <div class="flex flex-col mr-1 sm:mr-2 text-stone-800 font-bold text-xs sm:text-sm select-none opacity-70">
      <div v-for="n in 15" :key="n" class="h-7 sm:h-10 flex items-center justify-center w-4 sm:w-5">{{ n }}</div>
    </div>
    
    <div class="flex flex-col">
      <!-- Interactive Cells -->
      <div class="relative z-10 grid" :style="{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }">
        <template v-for="(row, r) in board" :key="r">
          <div 
            v-for="(cell, c) in row" 
            :key="`${r}-${c}`" 
            class="relative w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer group"
            @click="emit('placePiece', r, c)"
          >
            <!-- Cross lines -->
            <div class="absolute inset-0 pointer-events-none">
              <div class="absolute top-1/2 h-[1px] bg-stone-800/60" 
                   :style="{ left: c === 0 ? '50%' : '0', right: c === BOARD_SIZE - 1 ? '50%' : '0' }"></div>
              <div class="absolute left-1/2 w-[1px] bg-stone-800/60" 
                   :style="{ top: r === 0 ? '50%' : '0', bottom: r === BOARD_SIZE - 1 ? '50%' : '0' }"></div>
            </div>

            <!-- Star point -->
            <div v-if="isStarPoint(r, c)" 
                 class="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 bg-stone-800 rounded-full pointer-events-none"></div>

            <!-- Piece -->
            <div 
              v-if="cell !== EMPTY"
              class="relative z-10 w-[85%] h-[85%] rounded-full shadow-md transition-all duration-300 flex items-center justify-center"
              :class="[
                cell === BLACK ? 'bg-gradient-to-br from-stone-600 to-stone-900' : 'bg-gradient-to-br from-white to-stone-200 border border-stone-300',
                isWinningPiece(r, c) ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#DEB887] animate-pulse z-20' : ''
              ]"
            >
              <!-- Step Number -->
              <span v-if="showSteps && stepMap.has(`${r},${c}`)"
                    class="text-xs sm:text-sm font-bold"
                    :class="cell === BLACK ? 'text-white' : 'text-stone-800'">
                {{ stepMap.get(`${r},${c}`) }}
              </span>
              <!-- Last move indicator -->
              <div v-else-if="moveHistory.length > 0 && moveHistory[moveHistory.length - 1].r === r && moveHistory[moveHistory.length - 1].c === c"
                   class="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full"
                   :class="cell === BLACK ? 'bg-white/70' : 'bg-stone-800/70'">
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
              class="relative z-10 w-[85%] h-[85%] rounded-full opacity-60 flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm"
              :class="[
                thinkingMap.get(`${r},${c}`)!.player === BLACK ? 'bg-gradient-to-br from-stone-600 to-stone-900' : 'bg-gradient-to-br from-white to-stone-200 border border-stone-300',
                showSteps ? (thinkingMap.get(`${r},${c}`)!.player === BLACK ? 'text-blue-400' : 'text-blue-600') : (thinkingMap.get(`${r},${c}`)!.player === BLACK ? 'text-white' : 'text-stone-800')
              ]"
            >
              {{ thinkingMap.get(`${r},${c}`)!.index }}
            </div>

            <!-- Hover Indicator -->
            <div 
              v-else-if="winner === EMPTY && (mode === 'pvp' || isAnalysisMode || currentPlayer !== aiPlayer)"
              class="relative z-10 w-[85%] h-[85%] rounded-full opacity-0 group-hover:opacity-40 transition-opacity"
              :class="currentPlayer === BLACK ? 'bg-stone-900' : 'bg-white'"
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
      <div class="flex mt-1 sm:mt-2 text-stone-800 font-bold text-xs sm:text-sm select-none opacity-70">
        <div v-for="l in 15" :key="l" class="w-7 sm:w-10 flex items-center justify-center">{{ String.fromCharCode(96 + l) }}</div>
      </div>
    </div>
  </div>
</template>
