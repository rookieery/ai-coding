<script setup lang="ts">
import { currentTheme, t } from '../../../../i18n';
import type { PlayerColor } from '../../../../api/room-api';

const props = defineProps<{
  username: string;
  color: PlayerColor;
  isCurrentTurn: boolean;
  isDisconnected: boolean;
}>();
</script>

<template>
  <div
    class="relative rounded-xl border p-3 transition-all duration-200"
    :class="[
      isCurrentTurn
        ? 'border-emerald-500 shadow-md shadow-emerald-500/20'
        : currentTheme === 'dark'
          ? 'border-stone-700 bg-stone-800'
          : 'border-stone-200 bg-white',
      currentTheme === 'dark' ? 'bg-stone-800' : 'bg-white',
    ]"
  >
    <!-- Player info row -->
    <div class="flex items-center gap-3">
      <!-- Color indicator -->
      <div
        class="w-8 h-8 rounded-full border-2 shrink-0"
        :class="[
          color === 'black'
            ? 'bg-stone-900 border-stone-700'
            : 'bg-white border-gray-300',
        ]"
      />

      <!-- Username + turn label -->
      <div class="flex flex-col min-w-0">
        <span
          class="text-sm font-semibold truncate"
          :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'"
        >
          {{ username }}
        </span>
        <span
          v-if="isCurrentTurn && !isDisconnected"
          class="text-xs font-medium text-emerald-500"
        >
          {{ t('onlineCurrentTurn') }}
        </span>
      </div>
    </div>

    <!-- Disconnected overlay -->
    <div
      v-if="isDisconnected"
      class="absolute inset-0 rounded-xl bg-stone-500/30 backdrop-blur-sm flex items-center justify-center"
    >
      <span
        class="text-xs font-medium px-2 py-1 rounded bg-stone-800/80 text-stone-200"
      >
        {{ t('onlineDisconnected') }}
      </span>
    </div>
  </div>
</template>
