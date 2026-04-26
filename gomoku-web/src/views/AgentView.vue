<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { ArrowLeft } from 'lucide-vue-next';
import { currentTheme, t } from '../i18n';
import { gomokuAiApi } from '../api/gomoku-ai-api';
import { useGlobalAgentPlay } from '../composables/useAgentPlay';
import { useAgentChat } from '../composables/useAgentChat';
import { useSplitDrag } from '../composables/useSplitDrag';
import { BOARD_SIZE } from '../games/gomoku/gameLogic';
import { parseMoveText } from '../games/gomoku/moveParser';
import AgentGomokuPanel from '../components/AgentGomokuPanel.vue';
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
const showExitConfirm = ref(false);
const gameSelectorActive = ref(false);

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
  }

  messages.value.push({
    role: 'agent',
    text: t('agentGomokuModeEntered')
  });

  await nextTick();
  chatMessagesRef.value?.scrollToBottom();
};

const handleUserMove = async (r: number, c: number, userCoord?: string) => {
  const colLetter = String.fromCharCode(65 + c);
  const rowNumber = BOARD_SIZE - r;
  const moveCoord = userCoord || `${colLetter}${rowNumber}`;

  messages.value.push({
    role: 'user',
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
        isGameReasoning: true,
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

const handleAiFirstMove = async () => {
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
      currentPlayer: 'black',
      moveHistory,
    });

    if (response.success && response.data) {
      const { x, y, reason, isFallback } = response.data;

      gomokuPanelRef.value.placeAiPiece(y, x);

      const colLetter = String.fromCharCode(65 + x);
      const rowNumber = BOARD_SIZE - y;
      const moveCoord = `${colLetter}${rowNumber}`;

      if (isFallback) {
        messages.value.push({
          role: 'agent',
          text: t('agentAiFirstMoveNotification', moveCoord)
        });
      } else {
        thinkingContent.value = reason;
        messages.value.push({
          role: 'agent',
          text: reason,
          reasoningContent: reason,
          isGameReasoning: true,
        });
      }

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

const handleExitClick = () => {
  showExitConfirm.value = true;
};

const confirmExit = () => {
  showExitConfirm.value = false;
  gameSelectorActive.value = false;
  exitPlayMode();
};

const cancelExit = () => {
  showExitConfirm.value = false;
};

const handleSend = (payload: { text: string; imageBase64: string | null }) => {
  if (gameSelectorActive.value) {
    gameSelectorActive.value = false;
    const selectorMsg = messages.value.find(m => m.isGameSelector);
    if (selectorMsg) {
      selectorMsg.isGameSelectorDismissed = true;
    }
  }

  // Intercept chess move commands in gomoku mode
  if (playMode.value === 'gomoku') {
    const parsed = parseMoveText(payload.text);
    if (parsed) {
      const { r, c, coord } = parsed;

      // Validate the move
      if (gomokuPanelRef.value?.isValidMove(r, c)) {
        // Clear input
        query.value = '';
        chatInputRef.value?.resetTextareaHeight();

        // Execute the move (handleUserMove will add the notification message)
        gomokuPanelRef.value.placeUserPieceFromChat(r, c, coord);
      } else {
        // Invalid move - show error message
        messages.value.push({
          role: 'user',
          text: payload.text
        });
        messages.value.push({
          role: 'agent',
          text: t('agentInvalidMove', coord)
        });

        query.value = '';
        chatInputRef.value?.resetTextareaHeight();
      }
      return;
    }
  }

  // Default: regular chat message
  sendMessage(payload.text, () => {
    query.value = '';
    chatInputRef.value?.resetTextareaHeight();
  });
};
</script>

<template>
  <div class="flex w-full transition-all duration-300 ease-in-out"
       :class="[
         playMode === 'gomoku' ? 'flex-row h-screen overflow-hidden' : 'flex-col items-center justify-center min-h-screen'
       ]">

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
        :class="playMode === 'gomoku' ? 'flex-1' : 'w-full'"
      />

      <!-- 消息列表 -->
      <div :class="playMode === 'gomoku' ? 'flex-1 overflow-y-auto' : 'w-full'">
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
        :class="[
          'shrink-0',
          playMode === 'gomoku' ? 'px-4 max-w-full' : 'max-w-3xl'
        ]"
      >
        <template #actions>
          <button
            v-if="playMode !== 'gomoku' && !gameSelectorActive"
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
        @aiFirstMove="handleAiFirstMove"
      />
    </div>

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
