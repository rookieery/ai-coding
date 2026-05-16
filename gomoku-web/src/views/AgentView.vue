<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onActivated } from 'vue';
import { ArrowLeft } from 'lucide-vue-next';
import { currentTheme, t } from '../i18n';
import { visionApi } from '../api/vision-api';
import { useGlobalAgentPlay } from '../composables/useAgentPlay';
import { useAgentChat } from '../composables/useAgentChat';
import { useSplitDrag } from '../composables/useSplitDrag';
import { useVisionBridge } from '../composables/useVisionBridge';
import { useAgentGomoku } from '../composables/useAgentGomoku';
import { useAgentChess } from '../composables/useAgentChess';
import { useAgentVision } from '../composables/useAgentVision';
import AgentGomokuPanel from '../components/AgentGomokuPanel.vue';
import AgentChessPanel from '../components/agent/AgentChessPanel.vue';
import AgentVisionPanel from '../components/agent/AgentVisionPanel.vue';
import AgentChessVisionPanel from '../components/agent/AgentChessVisionPanel.vue';
import AgentWelcomeScreen from '../components/agent/AgentWelcomeScreen.vue';
import AgentChatMessages from '../components/agent/AgentChatMessages.vue';
import AgentChatInput from '../components/agent/AgentChatInput.vue';
import type { AgentMessage } from '../types/agent';

defineOptions({
  name: 'AgentView'
});

const query = ref('');
const chatMessagesRef = ref<InstanceType<typeof AgentChatMessages> | null>(null);
const chatInputRef = ref<InstanceType<typeof AgentChatInput> | null>(null);
const gomokuPanelRef = ref<InstanceType<typeof AgentGomokuPanel> | null>(null);
const chessPanelRef = ref<InstanceType<typeof AgentChessPanel> | null>(null);
const visionPanelRef = ref<InstanceType<typeof AgentVisionPanel> | null>(null);
const showExitConfirm = ref(false);
const gameSelectorActive = ref(false);
const isExitingGomoku = ref(false);
const activeAbortController = ref<AbortController | null>(null);

const {
  playMode, enterGomokuMode, enterChessMode,
  enterVisionConfirmMode, enterChessVisionConfirmMode,
  exitPlayMode, visionCandidates, chessVisionCandidates,
  pendingImageBase64, pendingQuestion, isAIThinking,
} = useGlobalAgentPlay();

const {
  consumePendingAnalysis, setVisionCandidatesForReplay,
  setChessVisionCandidatesForReplay, clearPendingRequest, consumeChessAnalysis,
} = useVisionBridge();

const isSplitLayout = computed(() =>
  playMode.value === 'gomoku' || playMode.value === 'chinese-chess' ||
  playMode.value === 'vision-confirm' || playMode.value === 'chess-vision-confirm' ||
  isExitingGomoku.value
);

const {
  messages, isThinking, thinkingContent, answerContent, showThinkingProcess,
  currentUserQuery, sendMessage, executeStreamingChat,
  regenerateStreamingAnswer, regenerateAnswer, stopGeneration,
  pushThinkingContent, setThinkingContent, setAnswerContent, flushStreamingBuffers,
} = useAgentChat({
  scrollToBottom: async () => { await chatMessagesRef.value?.scrollToBottom(); },
});

const { leftPanelWidth, isDragging, startDrag } = useSplitDrag();

const resetThinkingState = () => {
  isThinking.value = false;
  setThinkingContent('');
  setAnswerContent('');
  showThinkingProcess.value = true;
  activeAbortController.value = null;
};

const handleStop = () => {
  if (activeAbortController.value) {
    activeAbortController.value.abort();
    activeAbortController.value = null;
  }
  stopGeneration();
};

// --- Game Composables ---

const { handleUserMove, handleAiFirstMove, handleSurrender, tryInterceptMove: tryInterceptGomokuMove } = useAgentGomoku({
  messages, chatMessagesRef, gomokuPanelRef, isThinking, activeAbortController,
  setThinkingContent, setAnswerContent, showThinkingProcess, resetThinkingState,
});

const {
  handleChessUserMove, handleChessAiMove, handleChessGameOver,
  handleChessAiFirstMove, tryInterceptMove: tryInterceptChessMove,
} = useAgentChess({
  messages, chatMessagesRef, chessPanelRef, isThinking, isAIThinking,
  setThinkingContent, setAnswerContent, showThinkingProcess, resetThinkingState,
});

const {
  handleConfirmReplay, handleConfirmAnalysis, handleVisionConfirmClose,
  handleChessConfirmReplay, handleChessConfirmAnalysis, handleChessVisionConfirmClose,
  processPendingAnalysis,
} = useAgentVision({
  messages, chatMessagesRef, isThinking, isExitingGomoku, pendingQuestion,
  setThinkingContent, setAnswerContent, showThinkingProcess, currentUserQuery,
  executeStreamingChat, exitPlayMode, setVisionCandidatesForReplay,
  setChessVisionCandidatesForReplay, clearPendingRequest,
  consumePendingAnalysis, consumeChessAnalysis,
});

// --- UI Handlers ---

const handleEnterGomokuMode = () => {
  gameSelectorActive.value = true;
  messages.value.push({
    role: 'agent',
    text: t('agentGameSelectorPrompt'),
    isGameSelector: true
  });
};

const handleGameSelection = async (gameType: string, msg: AgentMessage) => {
  msg.isGameSelector = false;
  gameSelectorActive.value = false;

  const gameName = gameType === 'gomoku' ? t('agentGameGomoku') : t('agentGameChineseChess');

  messages.value = [
    { role: 'agent', text: t('agentGameSelectorPrompt') },
    { role: 'user', text: gameName },
  ];

  if (gameType === 'gomoku') {
    enterGomokuMode();
    gomokuPanelRef.value?.resetGame();
  } else if (gameType === 'chinese-chess') {
    enterChessMode();
    chessPanelRef.value?.resetGame();
  }

  messages.value.push({
    role: 'agent',
    text: gameType === 'chinese-chess' ? t('chessPlayModeEntered') : t('agentGomokuModeEntered')
  });

  await nextTick();
  chatMessagesRef.value?.scrollToBottom();
};

const handleExitClick = () => {
  showExitConfirm.value = true;
};

const confirmExit = () => {
  showExitConfirm.value = false;
  gameSelectorActive.value = false;
  isExitingGomoku.value = true;
  exitPlayMode();
  setTimeout(() => { isExitingGomoku.value = false; }, 400);
};

const cancelExit = () => {
  showExitConfirm.value = false;
};

const clearInput = () => {
  query.value = '';
  chatInputRef.value?.resetTextareaHeight();
};

onMounted(processPendingAnalysis);
onActivated(processPendingAnalysis);

const handleSend = async (payload: { text: string; imageBase64: string | null }) => {
  if (gameSelectorActive.value) {
    gameSelectorActive.value = false;
    const selectorMsg = messages.value.find(m => m.isGameSelector);
    if (selectorMsg) {
      selectorMsg.isGameSelectorDismissed = true;
    }
  }

  if (payload.imageBase64) {
    const userText = payload.text?.trim() || '';

    messages.value.push({
      role: 'user',
      text: userText,
      hasImage: true,
      imageBase64: payload.imageBase64,
    });

    clearInput();
    isThinking.value = true;
    setThinkingContent('');
    setAnswerContent('');
    showThinkingProcess.value = true;
    activeAbortController.value = new AbortController();

    let visionBoardType: 'gomoku' | 'chinese_chess' | null = null;

    await nextTick();
    chatMessagesRef.value?.scrollToBottom();

    try {
      await visionApi.recognizeBoardStream(
        payload.imageBase64,
        (chunk) => {
          if (chunk.type === 'thinking' && chunk.text) {
            pushThinkingContent(chunk.text);
            if (!visionBoardType) {
              const thinking = thinkingContent.value.toLowerCase();
              if (thinking.includes('中国象棋') || thinking.includes('chinese_chess')) {
                visionBoardType = 'chinese_chess';
              } else if (thinking.includes('五子棋') || thinking.includes('gomoku')) {
                visionBoardType = 'gomoku';
              }
            }
          } else if (chunk.type === 'answer' && chunk.text) {
            if (!answerContent.value) {
              setAnswerContent(visionBoardType === 'chinese_chess'
                ? t('visionRenderingChessBoard')
                : visionBoardType === 'gomoku'
                  ? t('visionRenderingGomokuBoard')
                  : t('visionRenderingBoard'));
            }
          }
        },
        (error) => {
          flushStreamingBuffers();
          const errorMessage = error instanceof Error ? error.message : t('visionParseFailed');
          messages.value.push({
            role: 'agent',
            text: `${t('genericErrorPrefix')}${errorMessage}`,
          });
          resetThinkingState();
          nextTick(() => chatMessagesRef.value?.scrollToBottom());
        },
        (boardData) => {
          flushStreamingBuffers();
          if (!boardData) {
            messages.value.push({
              role: 'agent',
              text: `${t('genericErrorPrefix')}${t('visionParseFailed')}`,
            });
            resetThinkingState();
            nextTick(() => chatMessagesRef.value?.scrollToBottom());
            return;
          }

          if (boardData.boardType === 'chinese_chess') {
            enterChessVisionConfirmMode(boardData.candidates, payload.imageBase64!, userText || undefined);
          } else {
            enterVisionConfirmMode(boardData.candidates, payload.imageBase64!, userText || undefined);
          }

          resetThinkingState();

          messages.value.push({
            role: 'agent',
            text: t('agentVisionConfirmEntered'),
          });

          nextTick(() => chatMessagesRef.value?.scrollToBottom());
        },
        activeAbortController.value.signal
      );
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        resetThinkingState();
        return;
      }
      throw error;
    }

    return;
  }

  if (playMode.value === 'chinese-chess') {
    if (tryInterceptChessMove(payload.text, clearInput)) return;
  }

  if (playMode.value === 'gomoku') {
    if (tryInterceptGomokuMove(payload.text, clearInput)) return;
  }

  sendMessage(payload.text, () => { clearInput(); });
};
</script>

<template>
  <div class="flex w-full"
       :class="[
         isSplitLayout ? 'flex-row h-screen overflow-hidden' : 'flex-col items-center justify-center min-h-screen'
       ]">

    <!-- 左侧聊天区域 -->
    <div class="flex flex-col h-full shrink-0"
         :class="[
           isSplitLayout ? 'min-w-[320px] border-r panel-split' : 'max-w-4xl mx-auto min-h-[80vh] px-4 panel-full'
         ]"
         :style="isSplitLayout ? `width: ${leftPanelWidth}%` : 'width: 100%'">

      <!-- 返回按钮（仅分屏模式显示） -->
      <div v-if="playMode === 'gomoku' || playMode === 'chinese-chess' || playMode === 'vision-confirm' || playMode === 'chess-vision-confirm'" class="flex items-center px-4 py-3 border-b shrink-0"
           :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'">
        <button @click="handleExitClick"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                :class="currentTheme === 'dark'
                  ? 'text-stone-300 hover:bg-stone-700'
                  : 'text-stone-600 hover:bg-stone-100'">
          <ArrowLeft class="w-4 h-4" />
          {{ t('agentBackToChat') }}
        </button>
      </div>

      <!-- 欢迎页 -->
      <AgentWelcomeScreen
        v-if="messages.length === 0"
        :class="isSplitLayout ? 'flex-1' : 'w-full'"
      />

      <!-- 消息列表 -->
      <div :class="isSplitLayout ? 'flex-1 overflow-y-auto' : 'w-full'">
        <AgentChatMessages
          v-if="messages.length > 0"
          ref="chatMessagesRef"
          :messages="messages"
          :is-thinking="isThinking"
          :thinking-content="thinkingContent"
          :answer-content="answerContent"
          :show-thinking-process="showThinkingProcess"
          @regenerate="regenerateAnswer"
          @toggle-thinking="(show: boolean) => showThinkingProcess = show"
          @regenerate-streaming="regenerateStreamingAnswer"
          @select-game="handleGameSelection"
        />
      </div>

      <!-- 输入区域 -->
      <AgentChatInput
        ref="chatInputRef"
        v-model:query="query"
        :is-thinking="isThinking"
        @send="handleSend"
        @stop="handleStop"
        :class="[
          'shrink-0',
          isSplitLayout ? 'px-4 max-w-full' : 'max-w-3xl'
        ]"
      >
        <template #actions>
          <button
            v-if="!isSplitLayout && !gameSelectorActive"
            @click="handleEnterGomokuMode"
            class="px-5 py-2.5 rounded-full font-medium transition-all duration-200 shadow-sm hover:shadow-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
          >
            {{ t('agentActionGomoku') }}
          </button>
        </template>
      </AgentChatInput>
    </div>

    <!-- 分割线（仅分屏模式显示） -->
    <div v-if="isSplitLayout"
         @mousedown="startDrag"
         class="w-1 self-stretch cursor-col-resize group transition-colors duration-200 z-50 relative"
         :class="isDragging
           ? 'bg-indigo-500'
           : (currentTheme === 'dark'
               ? 'bg-stone-700 hover:bg-indigo-400'
               : 'bg-stone-200 hover:bg-indigo-400')">
      <!-- 拖拽手柄视觉提示 -->
      <div class="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div class="w-1 h-8 rounded-full"
             :class="currentTheme === 'dark' ? 'bg-stone-500' : 'bg-stone-400'"></div>
      </div>
    </div>

    <!-- 右侧对弈面板（仅分屏模式显示） -->
    <transition name="slide-panel">
      <div v-if="playMode === 'gomoku' || playMode === 'chinese-chess' || playMode === 'vision-confirm' || playMode === 'chess-vision-confirm'" class="flex-1 h-full overflow-hidden panel-right"
           :class="currentTheme === 'dark' ? 'bg-stone-900' : 'bg-stone-50'">
        <AgentGomokuPanel
          v-if="playMode === 'gomoku'"
          ref="gomokuPanelRef"
          @userMove="handleUserMove"
          @surrender="handleSurrender"
          @aiFirstMove="handleAiFirstMove"
        />
        <AgentChessPanel
          v-else-if="playMode === 'chinese-chess'"
          ref="chessPanelRef"
          @userMove="handleChessUserMove"
          @aiMove="handleChessAiMove"
          @gameOver="handleChessGameOver"
          @aiFirstMove="handleChessAiFirstMove"
        />
        <AgentVisionPanel
          v-else-if="playMode === 'vision-confirm'"
          ref="visionPanelRef"
          :candidates="visionCandidates!"
          :imageBase64="pendingImageBase64!"
          @confirm-replay="handleConfirmReplay"
          @confirm-analysis="handleConfirmAnalysis"
          @close="handleVisionConfirmClose"
        />
        <AgentChessVisionPanel
          v-else-if="playMode === 'chess-vision-confirm'"
          :candidates="chessVisionCandidates!"
          :imageBase64="pendingImageBase64!"
          @confirm-replay="handleChessConfirmReplay"
          @confirm-analysis="handleChessConfirmAnalysis"
          @close="handleChessVisionConfirmClose"
        />
      </div>
    </transition>

    <!-- 退出确认弹窗 -->
    <div v-if="showExitConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-md p-6 rounded-2xl shadow-xl transition-colors"
           :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100 shadow-stone-900/50' : 'bg-white text-stone-800'">
        <div class="mb-6">
          <h3 class="text-xl font-bold mb-2">{{ t('agentExitConfirmTitle') }}</h3>
          <p class="opacity-70">{{ t('agentExitConfirmMessage') }}</p>
          <p class="opacity-70 mt-2">{{ t('agentExitConfirmWarning') }}</p>
        </div>
        <div class="flex justify-end gap-3">
          <button
            @click="cancelExit"
            class="px-4 py-2 rounded-lg font-medium transition-colors"
            :class="currentTheme === 'dark' ? 'bg-stone-700 hover:bg-stone-600 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'"
          >
            {{ t('cancel') }}
          </button>
          <button
            @click="confirmExit"
            class="px-4 py-2 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            {{ t('confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-split {
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-full {
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
}

.slide-panel-enter-active {
  animation: slide-in 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-panel-leave-active {
  animation: slide-out 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slide-in {
  0% {
    opacity: 0;
    transform: translateX(40px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes slide-out {
  0% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  30% {
    opacity: 0.5;
    transform: translateX(15px) scale(0.99);
  }
  100% {
    opacity: 0;
    transform: translateX(30px) scale(0.97);
  }
}
</style>
