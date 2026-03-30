<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { BLACK } from '../gameLogic';
import { t, currentTheme } from '../i18n';
import { Copy } from 'lucide-vue-next';

const props = defineProps<{
  moveHistory: {r: number, c: number, player: number}[];
}>();

const emit = defineEmits<{
  (e: 'copySuccess'): void;
}>();

const historyScrollRef = ref<HTMLElement | null>(null);

const copyHistory = async () => {
  if (props.moveHistory.length === 0) return;

  const text = props.moveHistory.map((move, index) => {
    const step = index + 1;
    const player = move.player === BLACK ? t('black') : t('white');
    const coord = `${String.fromCharCode(97 + move.c)}${move.r + 1}`;
    return `第${step}步${player}落子${coord}`;
  }).join('；') + '。';

  try {
    await navigator.clipboard.writeText(text);
    emit('copySuccess');
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

watch(() => props.moveHistory.length, async () => {
  await nextTick();
  if (historyScrollRef.value) {
    historyScrollRef.value.scrollTop = historyScrollRef.value.scrollHeight;
  }
});
</script>

<template>
  <div class="w-full rounded-lg shadow-md border flex flex-col h-full shrink-0 transition-colors"
       :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'">
    <div class="p-4 border-b font-semibold flex justify-between items-center rounded-t-lg transition-colors"
         :class="currentTheme === 'dark' ? 'bg-stone-800/50 border-stone-700 text-stone-200' : 'bg-stone-50 border-stone-200 text-stone-700'">
      <div class="flex items-center gap-2">
        <span>{{ t('history') }}</span>
        <button 
          v-if="moveHistory.length > 0"
          @click="copyHistory"
          class="p-1 rounded-md hover:bg-stone-700/50 transition-colors cursor-pointer"
          :title="t('copySuccess')"
        >
          <Copy class="w-4 h-4" />
        </button>
      </div>
      <span class="text-xs font-normal transition-colors" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">{{ t('totalMoves', moveHistory.length) }}</span>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-1" ref="historyScrollRef">
      <div 
        v-for="(move, index) in moveHistory" 
        :key="index"
        class="flex items-center justify-between px-3 py-2 rounded text-sm transition-colors"
        :class="[
          currentTheme === 'dark' ? 'hover:bg-stone-700' : 'hover:bg-stone-100',
          index % 2 === 0 ? (currentTheme === 'dark' ? 'bg-stone-700/30' : 'bg-stone-50/50') : ''
        ]"
      >
        <div class="flex items-center gap-2">
          <span class="w-6 text-right transition-colors" :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'">{{ index + 1 }}.</span>
          <span class="w-3 h-3 rounded-full inline-block shadow-sm" :class="move.player === BLACK ? 'bg-stone-800 border border-stone-900' : 'bg-white border border-stone-300'"></span>
          <span class="transition-colors" :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">{{ move.player === BLACK ? t('black') : t('white') }}</span>
        </div>
        <span class="font-mono font-medium px-2 py-0.5 rounded transition-colors"
              :class="currentTheme === 'dark' ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'">
          {{ String.fromCharCode(97 + move.c) }}{{ move.r + 1 }}
        </span>
      </div>
      <div v-if="moveHistory.length === 0" class="text-center py-8 text-sm transition-colors"
           :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'">
        {{ t('noMoves') }}
      </div>
    </div>
  </div>
</template>
