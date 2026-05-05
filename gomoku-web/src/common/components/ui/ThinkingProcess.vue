<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-vue-next';
import { currentTheme, t } from '@/src/i18n';

defineOptions({
  name: 'ThinkingProcess'
});

interface Props {
  isThinking: boolean;
  content: string;
  show?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
});

const emit = defineEmits<{
  toggle: [show: boolean];
}>();

const scrollRef = ref<HTMLElement | null>(null);

const hasContent = computed(() => {
  return props.content.trim().length > 0;
});

watch(() => props.content, () => {
  if (!props.isThinking || !scrollRef.value) return;
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  });
});

const handleToggle = () => {
  emit('toggle', !props.show);
};

// 思考内容样式类
const contentClasses = computed(() => {
  const base = 'whitespace-pre-wrap font-mono text-sm leading-relaxed transition-opacity duration-200';
  const light = 'text-stone-600 opacity-80';
  const dark = 'text-stone-400 opacity-80';
  return `${base} ${currentTheme.value === 'dark' ? dark : light}`;
});

// 容器样式类
const containerClasses = computed(() => {
  const base = 'rounded-lg border transition-all duration-300 overflow-hidden';
  const light = 'bg-stone-50 border-stone-200';
  const dark = 'bg-stone-900 border-stone-700';
  return `${base} ${currentTheme.value === 'dark' ? dark : light}`;
});

// 头部样式类
const headerClasses = computed(() => {
  const base = 'flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:opacity-90 transition-opacity';
  const light = 'bg-stone-100 border-b border-stone-200';
  const dark = 'bg-stone-800 border-b border-stone-700';
  return `${base} ${currentTheme.value === 'dark' ? dark : light}`;
});
</script>

<template>
  <div :class="containerClasses">
    <!-- 头部 -->
    <div :class="headerClasses" @click="handleToggle">
      <div class="flex items-center gap-3">
        <Loader2 v-if="isThinking" class="w-4 h-4 animate-spin" />
        <span class="text-sm font-medium" :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">
          {{ isThinking ? t('thinkingInProgress') : t('thinkingProcess') }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
          {{ hasContent ? `${content.length} ${t('character')}` : t('waiting') }}
        </span>
        <ChevronUp v-if="show" class="w-4 h-4" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'" />
        <ChevronDown v-else class="w-4 h-4" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'" />
      </div>
    </div>

    <!-- 内容区 -->
    <transition name="slide">
      <div v-if="show && hasContent" ref="scrollRef" class="px-4 py-3 max-h-96 overflow-y-auto">
        <div :class="contentClasses">
          {{ content }}
        </div>
      </div>
    </transition>

    <!-- 空状态 -->
    <div v-if="show && !hasContent && isThinking" class="px-4 py-6 text-center">
      <div class="inline-flex items-center gap-2">
        <Loader2 class="w-4 h-4 animate-spin" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'" />
        <span class="text-sm" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
          {{ t('modelThinking') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 96px; /* 对应 max-h-24 */
  opacity: 1;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}
</style>