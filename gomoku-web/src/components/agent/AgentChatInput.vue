<script setup lang="ts">
import { Send } from 'lucide-vue-next';
import { currentTheme, t } from '../../i18n';
import { useAutoResize } from '../../composables/useAutoResize';

defineOptions({
  name: 'AgentChatInput'
});

interface Props {
  isThinking: boolean;
  query: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:query': [value: string];
  send: [];
}>();

const { textareaRef, adjustTextareaHeight, resetTextareaHeight } = useAutoResize();

const handleKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    emit('send');
  } else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    emit('update:query', props.query + '\n');
    adjustTextareaHeight();
  }
};

const handleSend = () => {
  if (!props.query.trim() || props.isThinking) return;
  emit('send');
};

defineExpose({
  resetTextareaHeight,
});
</script>

<template>
  <div class="w-full relative mt-auto mb-8 max-w-full">
    <!-- 快捷操作按钮区域（通过 slot 传入） -->
    <div v-if="$slots.actions" class="flex flex-wrap gap-3 mb-4">
      <slot name="actions" />
    </div>
    <div class="flex flex-wrap items-end w-full rounded-2xl shadow-sm border transition-colors focus-within:ring-2 focus-within:ring-indigo-500 gap-2 p-2"
         :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-300'">
      <textarea
        ref="textareaRef"
        :value="query"
        @input="emit('update:query', ($event.target as HTMLTextAreaElement).value); adjustTextareaHeight()"
        :placeholder="t('agentPlaceholder')"
        class="w-full bg-transparent px-4 py-3 outline-none resize-none min-h-[56px] max-h-[calc(1.5rem*7+1.5rem)] overflow-y-auto"
        :class="currentTheme === 'dark' ? 'text-stone-100 placeholder-stone-500' : 'text-stone-900 placeholder-stone-400'"
        @keydown.enter.prevent="handleKeydown"
        :disabled="isThinking"
        rows="1"
      />
      <button
        @click="handleSend"
        class="rounded-full transition-colors p-3 flex-shrink-0 self-end cursor-pointer"
        :class="[
          query.trim() && !isThinking
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : (currentTheme === 'dark' ? 'bg-stone-700 text-stone-500' : 'bg-stone-100 text-stone-400'),
        ]"
        :disabled="!query.trim() || isThinking"
      >
        <Send class="w-5 h-5" />
      </button>
    </div>
    <div class="text-center mt-3 text-xs" :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'">
      {{ t('agentDisclaimer') }}
    </div>
  </div>
</template>
