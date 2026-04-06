<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Send, Loader2 } from 'lucide-vue-next';
import { currentTheme, t } from '../i18n';
import { chatApi, type ChatMessage } from '../api/chat-api';

defineOptions({
  name: 'AgentView'
});

const query = ref('');
const messages = ref<{role: 'user' | 'agent', text: string}[]>([]);
const isThinking = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

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

const sendMessage = async () => {
  if (!query.value.trim() || isThinking.value) return;

  const userQuery = query.value;
  messages.value.push({ role: 'user', text: userQuery });
  query.value = '';
  isThinking.value = true;
  await scrollToBottom();

  try {
    // 调用后端聊天API
    const response = await chatApi.sendMessage({
      message: userQuery,
      history: getChatHistory(),
    });

    const aiResponse = response.response || '抱歉，我没有收到回复';
    messages.value.push({ role: 'agent', text: aiResponse });

    // 保持最近20条消息以管理历史记录
    if (messages.value.length > 20) {
      messages.value = messages.value.slice(-20);
    }
  } catch (error: any) {
    console.error('Chat API Error:', error);
    messages.value.push({
      role: 'agent',
      text: `抱歉，发生了一些错误：${error.message || '无法连接到AI助手'}`
    });
  } finally {
    isThinking.value = false;
    await scrollToBottom();
  }
};
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full max-w-4xl mx-auto min-h-[80vh] px-4">
    <div v-if="messages.length === 0" class="flex flex-col items-center justify-center flex-1 w-full mt-12">
      <div class="w-24 h-24 mb-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
        <span class="text-4xl text-white font-bold">五</span>
      </div>
      <h2 class="text-4xl font-bold mb-4 tracking-tight" :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'">{{ t('agentTitle') }}</h2>
      <p class="text-lg text-center max-w-2xl mb-12" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
        {{ t('agentGreeting') }}
      </p>
    </div>

    <div v-else ref="messagesContainer" class="flex flex-col w-full flex-1 overflow-y-auto mb-6 space-y-6 pr-2 custom-scrollbar mt-4 pb-4">
      <div v-for="(msg, index) in messages" :key="index" class="flex w-full" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
        <div class="max-w-[80%] rounded-2xl px-6 py-4 shadow-sm whitespace-pre-wrap"
             :class="msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-sm' 
                : (currentTheme === 'dark' ? 'bg-stone-800 text-stone-100 rounded-bl-sm' : 'bg-white text-stone-800 border border-stone-200 rounded-bl-sm')">
          {{ msg.text }}
        </div>
      </div>
      <div v-if="isThinking" class="flex w-full justify-start">
        <div class="max-w-[80%] rounded-2xl px-6 py-4 shadow-sm flex items-center gap-2"
             :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-400 rounded-bl-sm' : 'bg-white text-stone-500 border border-stone-200 rounded-bl-sm'">
          <Loader2 class="w-4 h-4 animate-spin" />
          <span>思考中...</span>
        </div>
      </div>
    </div>

    <div class="w-full max-w-3xl relative mt-auto mb-8">
      <div class="relative flex items-center w-full rounded-full shadow-sm border transition-colors focus-within:ring-2 focus-within:ring-indigo-500"
           :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-300'">
        <input 
          v-model="query"
          type="text"
          :placeholder="t('agentPlaceholder')"
          class="w-full bg-transparent px-6 py-4 outline-none"
          :class="currentTheme === 'dark' ? 'text-stone-100 placeholder-stone-500' : 'text-stone-900 placeholder-stone-400'"
          @keyup.enter="sendMessage"
          :disabled="isThinking"
        />
        <button 
          @click="sendMessage"
          class="absolute right-2 p-2 rounded-full transition-colors"
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
</template>
