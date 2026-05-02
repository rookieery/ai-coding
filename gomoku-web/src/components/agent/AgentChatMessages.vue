<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { currentTheme, t } from '../../i18n';
import { useMarkdown } from '../../composables/useMarkdown';
import ThinkingProcess from '../../common/components/ui/ThinkingProcess.vue';
import AnswerContent from '../../common/components/ui/AnswerContent.vue';
import MessageActions from '../../common/components/ui/MessageActions.vue';
import type { AgentMessage } from '../../types/agent';

defineOptions({
  name: 'AgentChatMessages'
});

interface Props {
  messages: AgentMessage[];
  isThinking: boolean;
  thinkingContent: string;
  answerContent: string;
  showThinkingProcess: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  regenerate: [index: number];
  toggleThinking: [show: boolean];
  regenerateStreaming: [];
  selectGame: [gameType: string, message: AgentMessage];
}>();

const { renderMarkdown } = useMarkdown();
const containerRef = ref<HTMLElement | null>(null);
const previewImageSrc = ref<string | null>(null);
const showImagePreview = ref(false);

const scrollToBottom = async () => {
  await nextTick();
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight;
  }
};

const getRenderedTextForMessage = async (index: number): Promise<string> => {
  await nextTick();
  const selector = `.message-markdown[data-index="${index}"]`;
  const element = document.querySelector(selector);
  if (element) {
    return element.textContent || '';
  }
  return '';
};

const openImagePreview = (src: string) => {
  previewImageSrc.value = src;
  showImagePreview.value = true;
};

const closeImagePreview = () => {
  showImagePreview.value = false;
  previewImageSrc.value = null;
};

defineExpose({
  scrollToBottom,
});
</script>

<template>
  <div ref="containerRef" class="flex flex-col w-full flex-1 overflow-y-auto mb-6 space-y-6 pr-2 custom-scrollbar mt-4 pb-4 px-4">
    <!-- 历史消息 -->
    <template v-for="(msg, index) in messages" :key="index">
      <!-- 用户消息 -->
      <div v-if="msg.role === 'user'" class="flex flex-col items-end gap-2 w-full">
        <!-- 图片气泡 -->
        <div v-if="msg.hasImage && msg.imageBase64" class="max-w-[80%]">
          <img
            :src="msg.imageBase64"
            :alt="t('selectedImagePreview')"
            class="max-h-64 max-w-full object-contain rounded-2xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
            :class="currentTheme === 'dark' ? 'bg-stone-800/50' : 'bg-stone-50'"
            @click="openImagePreview(msg.imageBase64!)"
          />
        </div>
        <!-- 文本气泡 -->
        <div v-if="msg.text.trim()" class="max-w-[80%] rounded-2xl px-6 py-4 shadow-sm bg-indigo-600 text-white rounded-br-sm">
          <div class="whitespace-pre-wrap">{{ msg.text }}</div>
        </div>
      </div>

      <!-- AI消息 -->
      <div v-else class="relative">
        <div class="max-w-[80%] rounded-2xl px-6 py-4 shadow-sm"
             :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100 rounded-bl-sm' : 'bg-white text-stone-800 border border-stone-200 rounded-bl-sm'">
          <details v-if="msg.reasoningContent" class="mb-3">
            <summary class="text-xs font-medium cursor-pointer select-none list-none flex items-center gap-1"
                     :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
              <svg class="w-3 h-3 transition-transform details-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {{ msg.isGameReasoning ? t('agentReasoningSummary') : t('agentChatReasoningSummary') }}
            </summary>
            <div class="mt-2 text-xs leading-relaxed whitespace-pre-wrap font-mono opacity-70"
                 :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
              {{ msg.reasoningContent }}
            </div>
          </details>

          <div class="markdown-body message-markdown" :data-index="index" v-html="renderMarkdown(msg.text)"></div>

          <!-- 游戏选择按钮 -->
          <div v-if="msg.isGameSelector" class="flex gap-3 mt-4">
            <button
              @click="$emit('selectGame', 'gomoku', msg)"
              :disabled="msg.isGameSelectorDismissed"
              class="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm"
              :class="msg.isGameSelectorDismissed
                ? (currentTheme === 'dark' ? 'cursor-not-allowed bg-stone-700 text-stone-500' : 'cursor-not-allowed bg-stone-200 text-stone-400')
                : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'"
            >
              {{ t('agentGameGomoku') }}
            </button>
            <button
              @click="$emit('selectGame', 'chinese-chess', msg)"
              :disabled="msg.isGameSelectorDismissed"
              class="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm"
              :class="msg.isGameSelectorDismissed
                ? (currentTheme === 'dark' ? 'cursor-not-allowed bg-stone-700 text-stone-500' : 'cursor-not-allowed bg-stone-200 text-stone-400')
                : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'"
            >
              {{ t('chessPlayModeTitle') }}
            </button>
          </div>

          <!-- 操作栏 -->
          <div v-if="msg.text.trim()" class="flex justify-end mt-3">
            <MessageActions
              :content="msg.text"
              :is-streaming="false"
              :on-regenerate="() => emit('regenerate', index)"
              :get-text-to-copy="() => getRenderedTextForMessage(index)"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- 流式响应区域 -->
    <div v-if="isThinking" class="space-y-4">
      <!-- 思考过程面板 -->
      <ThinkingProcess
        :is-thinking="isThinking"
        :content="thinkingContent"
        :show="showThinkingProcess"
        @toggle="(show: boolean) => emit('toggleThinking', show)"
      />

      <!-- 正式回答内容 -->
      <div v-if="answerContent.trim()" class="flex w-full justify-start">
        <AnswerContent
          :content="answerContent"
          :is-streaming="isThinking"
          :on-regenerate="() => emit('regenerateStreaming')"
        />
      </div>
    </div>
  </div>

  <!-- 图片预览弹窗 -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showImagePreview && previewImageSrc"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click="closeImagePreview"
      >
        <img
          :src="previewImageSrc"
          :alt="t('selectedImagePreview')"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          @click.stop
        />
        <button
          class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          :aria-label="t('close')"
          @click="closeImagePreview"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
details[open] .details-chevron {
  transform: rotate(90deg);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
