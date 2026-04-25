<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Send, ArrowLeft } from 'lucide-vue-next';
import { currentTheme, t } from '../i18n';
import { chatApi, type ChatMessage } from '../api/chat-api';
import { gomokuAiApi } from '../api/gomoku-ai-api';
import { useMarkdown } from '../composables/useMarkdown';
import { useGlobalAgentPlay } from '../composables/useAgentPlay';
import { BOARD_SIZE, EMPTY, BLACK, WHITE } from '../games/gomoku/gameLogic';
import ThinkingProcess from '../common/components/ui/ThinkingProcess.vue';
import AnswerContent from '../common/components/ui/AnswerContent.vue';
import MessageActions from '../common/components/ui/MessageActions.vue';
import AgentGomokuPanel from '../components/AgentGomokuPanel.vue';

defineOptions({
  name: 'AgentView'
});

const query = ref('');
interface Message {
  role: 'user' | 'agent';
  text: string;
  reasoningContent?: string;
  relatedUserQuery?: string;
}
const messages = ref<Message[]>([]);
const isThinking = ref(false);
const thinkingContent = ref('');
const answerContent = ref('');
const showThinkingProcess = ref(true);
const messagesContainer = ref<HTMLElement | null>(null);
const { renderMarkdown } = useMarkdown();
const { playMode, enterGomokuMode, exitPlayMode } = useGlobalAgentPlay();
const gomokuPanelRef = ref<InstanceType<typeof AgentGomokuPanel> | null>(null);

// 分屏拖拽状态
const leftPanelWidth = ref(35);
const isDragging = ref(false);
const startX = ref(0);
const startWidth = ref(0);

const startDrag = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();

  isDragging.value = true;
  startX.value = event.clientX;
  startWidth.value = leftPanelWidth.value;

  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return;

  event.preventDefault();

  const containerWidth = window.innerWidth;
  const deltaX = event.clientX - startX.value;
  const deltaPercent = (deltaX / containerWidth) * 100;
  const newWidth = startWidth.value + deltaPercent;

  leftPanelWidth.value = Math.max(25, Math.min(50, newWidth));
};

const stopDrag = (event: MouseEvent) => {
  if (!isDragging.value) return;

  event?.preventDefault();
  isDragging.value = false;
  document.body.style.userSelect = '';
  document.body.style.cursor = '';

  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

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

  await scrollToBottom();

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

      await scrollToBottom();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : t('llmMoveFailed');
    messages.value.push({
      role: 'agent',
      text: `${t('genericErrorPrefix')}${errorMessage}`,
    });
    isThinking.value = false;
    showThinkingProcess.value = true;
    await scrollToBottom();
  }
};

const handleSurrender = () => {
  messages.value.push({
    role: 'agent',
    text: t('agentSurrenderNotification')
  });
};

// 当前正在处理的用户提问（用于重新生成）
const currentUserQuery = ref('');

// 将消息转换为聊天历史格式
const getChatHistory = (): ChatMessage[] => {
  return messages.value.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.text,
  }));
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Textarea自适应高度
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const adjustTextareaHeight = () => {
  nextTick(() => {
    if (textareaRef.value) {
      // 重置高度为auto以计算正确的高度
      textareaRef.value.style.height = 'auto';
      // 计算内容高度（最小高度56px，最大7行）
      const lineHeight = 24; // 1.5rem，假设行高
      const minHeight = 56; // 最小高度
      const maxHeight = lineHeight * 7 + 24; // 7行高度加padding

      // 计算scrollHeight
      const scrollHeight = textareaRef.value.scrollHeight;

      // 应用限制
      let newHeight = Math.max(minHeight, scrollHeight);
      newHeight = Math.min(newHeight, maxHeight);

      textareaRef.value.style.height = `${newHeight}px`;
    }
  });
};

const handleTextareaEnter = (event: KeyboardEvent) => {
  // 如果按下了Ctrl+Enter或Cmd+Enter，发送消息
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    sendMessage();
  }
  // 如果只是按下了Enter，添加换行
  else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    // 插入换行符
    query.value += '\n';
    // 调整高度
    adjustTextareaHeight();
  }
  // Shift+Enter 是默认行为，不处理
};

const resetTextareaHeight = () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = '56px'; // 重置为最小高度
    }
  });
};

// 获取指定索引消息的渲染文本
const getRenderedTextForMessage = async (index: number): Promise<string> => {
  await nextTick();

  // 通过 data-index 属性查找对应的 markdown 元素
  const selector = `.message-markdown[data-index="${index}"]`;
  const element = document.querySelector(selector);

  if (element) {
    return element.textContent || '';
  }

  // 如果找不到元素，返回原始文本
  const message = messages.value[index];
  return message?.text || '';
};

const sendMessage = async () => {
  if (!query.value.trim() || isThinking.value) return;

  const userQuery = query.value;
  messages.value.push({ role: 'user', text: userQuery });
  currentUserQuery.value = userQuery; // 存储当前用户提问
  query.value = '';
  resetTextareaHeight(); // 重置textarea高度

  // 重置流式响应状态
  isThinking.value = true;
  thinkingContent.value = '';
  answerContent.value = '';
  showThinkingProcess.value = true; // 重置为展开状态

  await scrollToBottom();

  try {
    // 调用流式聊天API
    await chatApi.sendMessageStream(
      {
        message: userQuery,
        history: getChatHistory(),
      },
      (chunk) => {
        // 处理流式数据块
        if (chunk.type === 'thinking') {
          thinkingContent.value += chunk.text;
        } else if (chunk.type === 'answer') {
          answerContent.value += chunk.text;

          // 当收到第一条正式回答时，自动收起思考过程面板
          if (showThinkingProcess.value) {
            showThinkingProcess.value = false;
          }
        }

        // 自动滚动到底部
        scrollToBottom();
      },
      (error) => {
        console.error('Chat API Stream Error:', error);
        const errorMessage = error instanceof Error ? error.message : t('connectionError');
        messages.value.push({
          role: 'agent',
          text: `${t('genericErrorPrefix')}${errorMessage}`
        });
        scrollToBottom();
      },
      () => {
        // 流式响应完成
        // 将完整回答添加到消息历史，关联用户提问
        if (answerContent.value.trim()) {
          messages.value.push({
            role: 'agent',
            text: answerContent.value,
            reasoningContent: thinkingContent.value.trim() || undefined,
            relatedUserQuery: currentUserQuery.value
          });
        } else if (thinkingContent.value.trim()) {
          // 如果没有正式回答但只有思考内容，将其作为回答
          messages.value.push({
            role: 'agent',
            text: thinkingContent.value,
            relatedUserQuery: currentUserQuery.value
          });
        }

        // 保持最近20条消息以管理历史记录
        if (messages.value.length > 20) {
          messages.value = messages.value.slice(-20);
        }

        // 重置流式状态
        thinkingContent.value = '';
        answerContent.value = '';
        isThinking.value = false;
        showThinkingProcess.value = true; // 重置为展开状态
        scrollToBottom();
      }
    );
  } catch (error) {
    console.error('Chat API Error:', error);
    const errorMessage = error instanceof Error ? error.message : t('connectionError');
    messages.value.push({
      role: 'agent',
      text: `${t('genericErrorPrefix')}${errorMessage}`
    });
    isThinking.value = false;
    showThinkingProcess.value = true; // 重置为展开状态
    await scrollToBottom();
  }
};

// 重新生成流式响应中的回答
const regenerateStreamingAnswer = async () => {
  if (isThinking.value || !currentUserQuery.value) return;

  // 重置流式响应状态
  isThinking.value = true;
  thinkingContent.value = '';
  answerContent.value = '';
  showThinkingProcess.value = true;

  await scrollToBottom();

  try {
    // 调用流式聊天API
    await chatApi.sendMessageStream(
      {
        message: currentUserQuery.value,
        history: getChatHistory(),
      },
      (chunk) => {
        // 处理流式数据块
        if (chunk.type === 'thinking') {
          thinkingContent.value += chunk.text;
        } else if (chunk.type === 'answer') {
          answerContent.value += chunk.text;

          // 当收到第一条正式回答时，自动收起思考过程面板
          if (showThinkingProcess.value) {
            showThinkingProcess.value = false;
          }
        }

        // 自动滚动到底部
        scrollToBottom();
      },
      (error) => {
        console.error('Chat API Stream Error:', error);
        const errorMessage = error instanceof Error ? error.message : t('connectionError');
        messages.value.push({
          role: 'agent',
          text: `${t('genericErrorPrefix')}${errorMessage}`
        });
        scrollToBottom();
      },
      () => {
        // 流式响应完成
        // 将完整回答添加到消息历史，关联用户提问
        if (answerContent.value.trim()) {
          messages.value.push({
            role: 'agent',
            text: answerContent.value,
            reasoningContent: thinkingContent.value.trim() || undefined,
            relatedUserQuery: currentUserQuery.value
          });
        } else if (thinkingContent.value.trim()) {
          // 如果没有正式回答但只有思考内容，将其作为回答
          messages.value.push({
            role: 'agent',
            text: thinkingContent.value,
            relatedUserQuery: currentUserQuery.value
          });
        }

        // 保持最近20条消息以管理历史记录
        if (messages.value.length > 20) {
          messages.value = messages.value.slice(-20);
        }

        // 重置流式状态
        thinkingContent.value = '';
        answerContent.value = '';
        isThinking.value = false;
        showThinkingProcess.value = true; // 重置为展开状态
        scrollToBottom();
      }
    );
  } catch (error) {
    console.error('Chat API Error:', error);
    const errorMessage = error instanceof Error ? error.message : t('connectionError');
    messages.value.push({
      role: 'agent',
      text: `${t('genericErrorPrefix')}${errorMessage}`
    });
    isThinking.value = false;
    showThinkingProcess.value = true; // 重置为展开状态
    await scrollToBottom();
  }
};

// 重新生成历史消息中的回答
const regenerateAnswer = async (index: number) => {
  if (isThinking.value) return;

  const message = messages.value[index];
  if (message.role !== 'agent') return;

  // 查找对应的用户提问
  let relatedUserQuery = message.relatedUserQuery;

  // 如果没有关联的用户提问，查找前一条用户消息
  if (!relatedUserQuery && index > 0) {
    const prevMessage = messages.value[index - 1];
    if (prevMessage.role === 'user') {
      relatedUserQuery = prevMessage.text;
    }
  }

  if (!relatedUserQuery) {
    console.warn('No related user query found for regeneration');
    return;
  }

  // 清空当前回答（从消息列表中删除）
  messages.value.splice(index, 1);

  // 设置当前用户提问
  currentUserQuery.value = relatedUserQuery;

  // 重置流式响应状态
  isThinking.value = true;
  thinkingContent.value = '';
  answerContent.value = '';
  showThinkingProcess.value = true;

  await scrollToBottom();

  try {
    // 调用流式聊天API
    await chatApi.sendMessageStream(
      {
        message: relatedUserQuery,
        history: getChatHistory(),
      },
      (chunk) => {
        // 处理流式数据块
        if (chunk.type === 'thinking') {
          thinkingContent.value += chunk.text;
        } else if (chunk.type === 'answer') {
          answerContent.value += chunk.text;

          // 当收到第一条正式回答时，自动收起思考过程面板
          if (showThinkingProcess.value) {
            showThinkingProcess.value = false;
          }
        }

        // 自动滚动到底部
        scrollToBottom();
      },
      (error) => {
        console.error('Chat API Stream Error:', error);
        const errorMessage = error instanceof Error ? error.message : t('connectionError');
        messages.value.push({
          role: 'agent',
          text: `${t('genericErrorPrefix')}${errorMessage}`
        });
        scrollToBottom();
      },
      () => {
        // 流式响应完成
        // 将完整回答添加到消息历史，关联用户提问
        if (answerContent.value.trim()) {
          messages.value.push({
            role: 'agent',
            text: answerContent.value,
            reasoningContent: thinkingContent.value.trim() || undefined,
            relatedUserQuery: relatedUserQuery
          });
        } else if (thinkingContent.value.trim()) {
          // 如果没有正式回答但只有思考内容，将其作为回答
          messages.value.push({
            role: 'agent',
            text: thinkingContent.value,
            relatedUserQuery: relatedUserQuery
          });
        }

        // 保持最近20条消息以管理历史记录
        if (messages.value.length > 20) {
          messages.value = messages.value.slice(-20);
        }

        // 重置流式状态
        thinkingContent.value = '';
        answerContent.value = '';
        isThinking.value = false;
        showThinkingProcess.value = true; // 重置为展开状态
        scrollToBottom();
      }
    );
  } catch (error) {
    console.error('Chat API Error:', error);
    const errorMessage = error instanceof Error ? error.message : t('connectionError');
    messages.value.push({
      role: 'agent',
      text: `${t('genericErrorPrefix')}${errorMessage}`
    });
    isThinking.value = false;
    showThinkingProcess.value = true; // 重置为展开状态
    await scrollToBottom();
  }
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

      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center flex-1 w-full mt-12">
        <div class="w-24 h-24 mb-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <span class="text-4xl text-white font-bold">五</span>
        </div>
        <h2 class="text-4xl font-bold mb-4 tracking-tight" :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'">{{ t('agentTitle') }}</h2>
        <p class="text-lg text-center max-w-2xl" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
          {{ t('agentGreeting') }}
        </p>
      </div>

      <div v-else ref="messagesContainer" class="flex flex-col w-full flex-1 overflow-y-auto mb-6 space-y-6 pr-2 custom-scrollbar mt-4 pb-4"
           :class="playMode === 'gomoku' ? 'px-4' : ''">
        <!-- 历史消息 -->
        <div v-for="(msg, index) in messages" :key="index" class="flex w-full" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <div v-if="msg.role === 'user'" class="max-w-[80%] rounded-2xl px-6 py-4 shadow-sm bg-indigo-600 text-white rounded-br-sm">
            <div class="whitespace-pre-wrap">{{ msg.text }}</div>
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
                  {{ t('agentReasoningSummary') }}
                </summary>
                <div class="mt-2 text-xs leading-relaxed whitespace-pre-wrap font-mono opacity-70"
                     :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
                  {{ msg.reasoningContent }}
                </div>
              </details>

              <div class="markdown-body message-markdown" :data-index="index" v-html="renderMarkdown(msg.text)"></div>

              <!-- 操作栏 -->
              <div v-if="msg.text.trim()" class="flex justify-end mt-3">
                <MessageActions
                  :content="msg.text"
                  :is-streaming="false"
                  :on-regenerate="() => regenerateAnswer(index)"
                  :get-text-to-copy="() => getRenderedTextForMessage(index)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 流式响应区域 -->
        <div v-if="isThinking" class="space-y-4">
          <!-- 思考过程面板 -->
          <ThinkingProcess
            :is-thinking="isThinking"
            :content="thinkingContent"
            :show="showThinkingProcess"
            @toggle="(show) => showThinkingProcess = show"
          />

          <!-- 正式回答内容 -->
          <div v-if="answerContent.trim()" class="flex w-full justify-start">
            <AnswerContent
              :content="answerContent"
              :is-streaming="isThinking"
              :on-regenerate="regenerateStreamingAnswer"
            />
          </div>
        </div>
      </div>

      <div class="w-full relative mt-auto mb-8"
           :class="playMode === 'gomoku' ? 'px-4 max-w-full' : 'max-w-3xl'">
        <!-- 快捷操作按钮区域 -->
        <div v-if="messages.length === 0" class="flex flex-wrap gap-3 mb-4">
          <button
            @click="handleEnterGomokuMode"
            class="px-5 py-2.5 rounded-full font-medium transition-all duration-200 shadow-sm hover:shadow-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {{ t('agentActionGomoku') }}
          </button>
        </div>
        <div class="flex flex-wrap items-end w-full rounded-2xl shadow-sm border transition-colors focus-within:ring-2 focus-within:ring-indigo-500 gap-2 p-2"
             :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-300'">
          <textarea
            ref="textareaRef"
            v-model="query"
            :placeholder="t('agentPlaceholder')"
            class="w-full bg-transparent px-4 py-3 outline-none resize-none min-h-[56px] max-h-[calc(1.5rem*7+1.5rem)] overflow-y-auto"
            :class="currentTheme === 'dark' ? 'text-stone-100 placeholder-stone-500' : 'text-stone-900 placeholder-stone-400'"
            @keydown.enter.prevent="handleTextareaEnter"
            @input="adjustTextareaHeight"
            :disabled="isThinking"
            rows="1"
          />
          <button
            @click="sendMessage"
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

<style scoped>
details[open] .details-chevron {
  transform: rotate(90deg);
}
</style>
