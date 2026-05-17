<script setup lang="ts">
/**
 * ChatPanel — In-game chat panel for online play.
 * Players see the "players" channel; spectators see the "spectators" channel.
 * Auto-scrolls to bottom on new messages.
 */
import { ref, nextTick, watch } from 'vue';
import { Send } from 'lucide-vue-next';
import { currentTheme, t } from '../../../../i18n';
import { useChat } from '../../../../composables/useChat';

const props = defineProps<{
  roomId: string;
  isPlayer: boolean;
}>();

const { messagesForActiveChannel, sendMessage, cleanup } = useChat(
  props.roomId,
  props.isPlayer,
);

const inputText = ref('');
const messageListRef = ref<HTMLElement | null>(null);

function formatTime(createdAt: string): string {
  const date = new Date(createdAt);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function handleSend(): void {
  const text = inputText.value.trim();
  if (!text) return;
  sendMessage(text);
  inputText.value = '';
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

function scrollToBottom(): void {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
}

watch(messagesForActiveChannel, () => {
  scrollToBottom();
}, { deep: true });

defineExpose({ cleanup });
</script>

<template>
  <div
    class="flex flex-col rounded-xl border overflow-hidden"
    :class="
      currentTheme === 'dark'
        ? 'border-stone-700 bg-stone-800'
        : 'border-stone-200 bg-white'
    "
  >
    <!-- Channel header -->
    <div
      class="px-3 py-2 text-xs font-semibold border-b"
      :class="
        currentTheme === 'dark'
          ? 'border-stone-700 bg-stone-900/50 text-stone-400'
          : 'border-stone-200 bg-stone-50 text-stone-500'
      "
    >
      {{ isPlayer ? t('onlineChatPlayersChannel') : t('onlineChatSpectatorsChannel') }}
    </div>

    <!-- Message list -->
    <div
      ref="messageListRef"
      class="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0"
      :class="
        currentTheme === 'dark'
          ? 'scrollbar-thin scrollbar-thumb-stone-600'
          : 'scrollbar-thin scrollbar-thumb-stone-300'
      "
      style="max-height: 280px;"
    >
      <div
        v-for="msg in messagesForActiveChannel"
        :key="msg.id"
        class="flex flex-col gap-0.5"
      >
        <div class="flex items-baseline gap-2">
          <span
            class="text-xs font-semibold shrink-0"
            :class="
              currentTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
            "
          >
            {{ msg.username }}
          </span>
          <span
            class="text-xs"
            :class="
              currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'
            "
          >
            {{ formatTime(msg.createdAt) }}
          </span>
        </div>
        <span
          class="text-sm break-words"
          :class="
            currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'
          "
        >
          {{ msg.content }}
        </span>
      </div>

      <!-- Empty state -->
      <div
        v-if="messagesForActiveChannel.length === 0"
        class="flex items-center justify-center h-full py-6"
      >
        <span
          class="text-xs"
          :class="
            currentTheme === 'dark' ? 'text-stone-600' : 'text-stone-400'
          "
        >
          ···
        </span>
      </div>
    </div>

    <!-- Input area -->
    <div
      class="flex items-center gap-2 px-3 py-2 border-t"
      :class="
        currentTheme === 'dark'
          ? 'border-stone-700 bg-stone-900/30'
          : 'border-stone-200 bg-stone-50'
      "
    >
      <input
        v-model="inputText"
        type="text"
        :placeholder="t('onlineChatPlaceholder')"
        maxlength="500"
        class="flex-1 bg-transparent text-sm outline-none"
        :class="
          currentTheme === 'dark'
            ? 'text-stone-200 placeholder-stone-600'
            : 'text-stone-800 placeholder-stone-400'
        "
        @keydown="handleKeydown"
      />
      <button
        @click="handleSend"
        :disabled="!inputText.trim()"
        class="shrink-0 p-1.5 rounded-lg transition-colors"
        :class="[
          inputText.trim()
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : currentTheme === 'dark'
              ? 'bg-stone-700 text-stone-500'
              : 'bg-stone-200 text-stone-400',
        ]"
      >
        <Send class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
