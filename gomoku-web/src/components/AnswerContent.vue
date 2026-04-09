<script setup lang="ts">
import { computed } from 'vue';
import { useMarkdown } from '../composables/useMarkdown';
import { currentTheme, t } from '../i18n';

defineOptions({
  name: 'AnswerContent'
});

interface Props {
  content: string;
  isStreaming?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
});

const { renderMarkdown } = useMarkdown();

// 容器样式类
const containerClasses = computed(() => {
  const base = 'rounded-2xl px-6 py-4 shadow-sm transition-all duration-300';
  const dark = 'bg-stone-800 text-stone-100 border-l-4 border-indigo-500 rounded-bl-sm';
  const light = 'bg-white text-stone-800 border border-stone-200 border-l-4 border-indigo-500 rounded-bl-sm';
  return `${base} ${currentTheme.value === 'dark' ? dark : light}`;
});

// 流式指示器样式
const streamingIndicatorClasses = computed(() => {
  const base = 'inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-medium';
  const dark = 'bg-stone-700 text-stone-300';
  const light = 'bg-stone-100 text-stone-600';
  return `${base} ${currentTheme.value === 'dark' ? dark : light}`;
});

// 光标闪烁动画
const cursorClasses = computed(() => {
  const base = 'inline-block w-0.5 h-5 ml-1 animate-pulse';
  const dark = 'bg-indigo-400';
  const light = 'bg-indigo-500';
  return `${base} ${currentTheme.value === 'dark' ? dark : light}`;
});
</script>

<template>
  <div :class="containerClasses">
    <!-- 流式指示器 -->
    <div v-if="isStreaming" :class="streamingIndicatorClasses">
      <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>{{ t('generatingAnswer') }}</span>
    </div>

    <!-- 回答内容 -->
    <div class="markdown-body" v-html="renderMarkdown(content)"></div>

    <!-- 流式光标 -->
    <div v-if="isStreaming && content.trim()" :class="cursorClasses"></div>
  </div>
</template>

<style scoped>
.markdown-body {
  font-size: 1rem;
  line-height: 1.7;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  color: inherit;
}

.markdown-body :deep(p) {
  margin-bottom: 1em;
}

.markdown-body :deep(code) {
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin-bottom: 1em;
  padding-left: 2em;
}

.markdown-body :deep(li) {
  margin-bottom: 0.5em;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid;
  margin: 1em 0;
  padding-left: 1em;
  opacity: 0.8;
}

:root[data-theme="dark"] .markdown-body :deep(code) {
  background-color: rgba(255, 255, 255, 0.1);
}

:root[data-theme="light"] .markdown-body :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
}

:root[data-theme="dark"] .markdown-body :deep(pre) {
  background-color: rgba(255, 255, 255, 0.05);
}

:root[data-theme="light"] .markdown-body :deep(pre) {
  background-color: rgba(0, 0, 0, 0.02);
}

:root[data-theme="dark"] .markdown-body :deep(blockquote) {
  border-color: #6366f1;
}

:root[data-theme="light"] .markdown-body :deep(blockquote) {
  border-color: #4f46e5;
}
</style>