<script setup lang="ts">
import { ref } from 'vue';
import { ArrowLeft } from 'lucide-vue-next';
import { currentTheme, t } from '../i18n';
import { gomokuAiApi } from '../api/gomoku-ai-api';
import { useGlobalAgentPlay } from '../composables/useAgentPlay';
import { useAgentChat } from '../composables/useAgentChat';
import { useSplitDrag } from '../composables/useSplitDrag';
import { BOARD_SIZE } from '../games/gomoku/gameLogic';
import AgentGomokuPanel from '../components/AgentGomokuPanel.vue';
import AgentWelcomeScreen from '../components/agent/AgentWelcomeScreen.vue';
import AgentChatMessages from '../components/agent/AgentChatMessages.vue';
import AgentChatInput from '../components/agent/AgentChatInput.vue';

defineOptions({
  name: 'AgentView'
});

const query = ref('');
const chatMessagesRef = ref<InstanceType<typeof AgentChatMessages> | null>(null);
const chatInputRef = ref<InstanceType<typeof AgentChatInput> | null>(null);
const gomokuPanelRef = ref<InstanceType<typeof AgentGomokuPanel> | null>(null);

const { playMode, enterGomokuMode, exitPlayMode } = useGlobalAgentPlay();

const {
  messages,
  isThinking,
  thinkingContent,
  answerContent,
  showThinkingProcess,
  sendMessage,
  regenerateStreamingAnswer,
  regenerateAnswer,
} = useAgentChat({
  scrollToBottom: async () => {
    await chatMessagesRef.value?.scrollToBottom();
  },
});

const { leftPanelWidth, isDragging, startDrag } = useSplitDrag();

const handleEnterGomokuMode = () => {
  enterGomokuMode();
  messages.value.push({
    role: 'agent',
    text: t('agentGomokuModeEntered')
  });
};

const handleUserMove = async (r: number, c: number) => {
  const colLetter = String.fromCharCode(65 + c);
  const rowNumber = BOARD_SIZE - r;
  const moveCoord = `${colLetter}${rowNumber}`;

  messages.value.push({
    role: 'agent',
    text: t('agentUserMoveNotification', moveCoord)
  });

  if (!gomokuPanelRef.value) return;

  const board = gomokuPanelRef.value.getBoard();
  const moveHistory = gomokuPanelRef.value.getMoveHistory();

  isThinking.value = true;
  thinkingContent.value = t('agentAiThinkingMove');
  answerContent.value = '';
  showThinkingProcess.value = true;

  await chatMessagesRef.value?.scrollToBottom();

  try {
    const response = await gomokuAiApi.generateMove({
      board,
      currentPlayer: 'white',
      moveHistory,
    });

    if (response.success && response.data) {
      const { x, y, reason, isFallback } = response.data;

      thinkingContent.value = reason;

      if (isFallback) {
        showThinkingProcess.value = false;
      }

      messages.value.push({
        role: 'agent',
        text: reason,
        reasoningContent: isFallback ? undefined : reason,
      });

      gomokuPanelRef.value.placeAiPiece(y, x);

      isThinking.value = false;
      thinkingContent.value = '';
      answerContent.value = '';
      showThinkingProcess.value = true;

      await chatMessagesRef.value?.scrollToBottom();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : t('llmMoveFailed');
    messages.value.push({
      role: 'agent',
      text: `${t('genericErrorPrefix')}${errorMessage}`,
    });
    isThinking.value = false;
    showThinkingProcess.value = true;
    await chatMessagesRef.value?.scrollToBottom();
  }
};

const handleSurrender = () => {
  messages.value.push({
    role: 'agent',
    text: t('agentSurrenderNotification')
  });
};

const handleSend = () => {
  sendMessage(query.value, () => {
    query.value = '';
    chatInputRef.value?.resetTextareaHeight();
  });
};
</script>

<template>
  <div class="flex w-full h-full transition-all duration-300 ease-in-out"
       :class="playMode === 'gomoku' ? 'flex-row' : 'flex-col items-center justify-center'">

    <!-- 左侧聊天区域 -->
    <div class="flex flex-col h-full shrink-0"
         :class="[
           !isDragging ? 'transition-all duration-300 ease-in-out' : '',
           playMode === 'gomoku' ? 'min-w-[320px] border-r' : 'max-w-4xl mx-auto min-h-[80vh] px-4'
         ]"
         :style="playMode === 'gomoku' ? `width: ${leftPanelWidth}%` : 'width: 100%'">

      <!-- 返回按钮（仅分屏模式显示） -->
      <div v-if="playMode === 'gomoku'" class="flex items-center px-4 py-3 border-b shrink-0"
           :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'">
        <button @click="exitPlayMode"
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
        @enter-gomoku="handleEnterGomokuMode"
      />

      <!-- 消息列表 -->
      <AgentChatMessages
        v-else
        ref="chatMessagesRef"
        :messages="messages"
        :is-thinking="isThinking"
        :thinking-content="thinkingContent"
        :answer-content="answerContent"
        :show-thinking-process="showThinkingProcess"
        @regenerate="regenerateAnswer"
        @toggle-thinking="(show: boolean) => showThinkingProcess = show"
        @regenerate-streaming="regenerateStreamingAnswer"
      />

      <!-- 输入区域 -->
      <AgentChatInput
        ref="chatInputRef"
        v-model:query="query"
        :is-thinking="isThinking"
        @send="handleSend"
        :class="playMode === 'gomoku' ? 'px-4 max-w-full' : 'max-w-3xl'"
      >
        <template #actions>
          <button
            v-if="messages.length === 0"
            @click="handleEnterGomokuMode"
            class="px-5 py-2.5 rounded-full font-medium transition-all duration-200 shadow-sm hover:shadow-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
          >
            {{ t('agentActionGomoku') }}
          </button>
        </template>
      </AgentChatInput>
    </div>

    <!-- 分割线（仅分屏模式显示） -->
    <div v-if="playMode === 'gomoku'"
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
    <div v-if="playMode === 'gomoku'" class="flex-1 h-full overflow-hidden"
         :class="currentTheme === 'dark' ? 'bg-stone-900' : 'bg-stone-50'">
      <AgentGomokuPanel
        ref="gomokuPanelRef"
        @userMove="handleUserMove"
        @surrender="handleSurrender"
      />
    </div>
  </div>
</template>
