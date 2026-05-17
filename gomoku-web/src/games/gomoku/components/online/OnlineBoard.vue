<script setup lang="ts">
import { computed } from 'vue';
import { currentTheme, t } from '../../../../i18n';
import { BOARD_SIZE, EMPTY, BLACK, WHITE, isStarPoint } from '../../gameConstants';
import type { ThemeKey } from '../../../../common/theme';
import { getThemeColors } from '../../../../common/theme';
import type { PlayerColor } from '../../../../api/room-api';

const props = defineProps<{
  boardState: number[][];
  currentPlayer: PlayerColor;
  isMyTurn: boolean;
  isSpectator: boolean;
  lastMove: { r: number; c: number } | null;
  theme?: ThemeKey;
}>();

const emit = defineEmits<{
  (e: 'move', r: number, c: number): void;
}>();

const themeColors = computed(() => {
  const themeKey = props.theme || 'default';
  return getThemeColors(themeKey);
});

const isLastMove = (r: number, c: number): boolean => {
  return props.lastMove !== null && props.lastMove.r === r && props.lastMove.c === c;
};

const canInteract = computed(() => props.isMyTurn && !props.isSpectator);

const turnColorLabel = computed(() =>
  props.currentPlayer === 'black' ? t('black') : t('white'),
);

const pieceBorderClass = (player: number): string => {
  const theme = props.theme || 'default';
  if (theme === 'cyber') {
    return player === BLACK ? 'border-[#F43F5E]/50' : 'border-[#2DD4BF]/50';
  }
  if (theme === 'zen') {
    return player === WHITE ? 'border-[#D1D5DB]' : '';
  }
  if (theme === 'minimal') {
    return player === WHITE ? 'border-gray-300 dark:border-gray-400' : '';
  }
  return player === WHITE ? 'border-gray-300 dark:border-gray-600' : '';
};

function handleCellClick(r: number, c: number): void {
  if (!canInteract.value) return;
  if (props.boardState[r][c] !== EMPTY) return;
  emit('move', r, c);
}
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <!-- Turn indicator -->
    <div
      class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      :class="
        currentTheme === 'dark'
          ? 'bg-stone-800 text-stone-300'
          : 'bg-stone-100 text-stone-700'
      "
    >
      <span
        class="w-3 h-3 rounded-full border"
        :class="[
          currentPlayer === 'black'
            ? themeColors.gomokuBlack
            : themeColors.gomokuWhite,
          currentPlayer === 'white' ? 'border-gray-400' : 'border-transparent',
        ]"
      />
      {{ t('onlineCurrentTurn') }}: {{ turnColorLabel }}
      <span v-if="isMyTurn" class="text-emerald-500 font-bold">
        ({{ t('onlineYourTurn') }})
      </span>
    </div>

    <!-- Board -->
    <div
      class="relative p-2 sm:p-3 md:p-4 lg:p-5 rounded-md shadow-2xl border-[3px] flex"
      :class="[themeColors.boardBackground, themeColors.lineColor]"
    >
      <!-- Left Coordinates -->
      <div
        class="flex flex-col mr-1 sm:mr-2 font-bold text-xs sm:text-sm select-none opacity-70"
        :class="themeColors.textPrimary"
      >
        <div
          v-for="n in 15"
          :key="n"
          class="h-5 sm:h-6 md:h-7 lg:h-9 xl:h-10 flex items-center justify-center w-2.5 sm:w-3 md:w-3.5 lg:w-4.5 xl:w-5"
        >
          {{ 16 - n }}
        </div>
      </div>

      <div class="flex flex-col">
        <!-- Grid -->
        <div
          class="relative z-10 grid"
          :style="{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }"
        >
          <template v-for="(row, r) in boardState" :key="r">
            <div
              v-for="(cell, c) in row"
              :key="`${r}-${c}`"
              class="relative w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-9 lg:h-9 xl:w-10 xl:h-10 flex items-center justify-center cursor-pointer group"
              :class="canInteract && cell === EMPTY ? '' : 'cursor-default'"
              @click="handleCellClick(r, c)"
            >
              <!-- Cross lines -->
              <div class="absolute inset-0 pointer-events-none">
                <div
                  class="absolute top-1/2 h-[1px]"
                  :class="themeColors.lineBackground"
                  :style="{ left: c === 0 ? '50%' : '0', right: c === BOARD_SIZE - 1 ? '50%' : '0' }"
                />
                <div
                  class="absolute left-1/2 w-[1px]"
                  :class="themeColors.lineBackground"
                  :style="{ top: r === 0 ? '50%' : '0', bottom: r === BOARD_SIZE - 1 ? '50%' : '0' }"
                />
              </div>

              <!-- Star point -->
              <div
                v-if="isStarPoint(r, c)"
                class="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full pointer-events-none"
                :class="themeColors.gomokuBlack"
              />

              <!-- Piece -->
              <div
                v-if="cell !== EMPTY"
                class="relative z-10 w-[85%] h-[85%] rounded-full shadow-md transition-all duration-300 flex items-center justify-center border-2"
                :class="[
                  cell === BLACK ? themeColors.gomokuBlack : themeColors.gomokuWhite,
                  pieceBorderClass(cell),
                  isLastMove(r, c) ? 'ring-3 ring-emerald-400 ring-offset-1 z-20' : '',
                ]"
              >
                <!-- Last move indicator dot -->
                <div
                  v-if="isLastMove(r, c)"
                  class="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full"
                  :class="cell === BLACK ? themeColors.gomokuWhite : themeColors.gomokuBlack"
                />
              </div>

              <!-- Hover preview (only when it's my turn and cell is empty) -->
              <div
                v-else-if="canInteract"
                class="relative z-10 w-[85%] h-[85%] rounded-full opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none"
                :class="currentPlayer === 'black' ? themeColors.gomokuBlack : themeColors.gomokuWhite"
              />
            </div>
          </template>
        </div>

        <!-- Bottom Coordinates -->
        <div
          class="flex mt-1 sm:mt-2 font-bold text-xs sm:text-sm select-none opacity-70"
          :class="themeColors.textPrimary"
        >
          <div
            v-for="l in 15"
            :key="l"
            class="w-5 sm:w-6 md:w-7 lg:w-9 xl:w-10 flex items-center justify-center"
          >
            {{ String.fromCharCode(64 + l) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
