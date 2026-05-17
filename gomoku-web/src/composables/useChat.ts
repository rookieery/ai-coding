/**
 * Chat composable
 * Manages chat messages per channel and Socket.io chat events for online play.
 * Players use the "players" channel; spectators use the "spectators" channel.
 */
import { ref, computed, onUnmounted } from 'vue';
import { socketService } from '../services/socket.service';

// ── Types ──────────────────────────────────────────────────────────────────

export type ChatChannel = 'players' | 'spectators';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  channel: ChatChannel;
  createdAt: string;
}

// ── Shared state (singleton across component instances) ────────────────

const messagesMap = ref<Map<ChatChannel, ChatMessage[]>>(new Map());
const activeChannel = ref<ChatChannel>('players');
let listenerCount = 0;

// ── Socket event handlers ──────────────────────────────────────────────

function onChatMessage(payload: unknown): void {
  const data = payload as { roomId: string; message: ChatMessage };
  const channel = data.message.channel;
  const list = messagesMap.value.get(channel) ?? [];
  list.push(data.message);
  messagesMap.value.set(channel, list);
}

// ── Composable ─────────────────────────────────────────────────────────

export function useChat(roomId: string, isPlayer: boolean) {
  // Set active channel based on role
  activeChannel.value = isPlayer ? 'players' : 'spectators';

  const messagesForActiveChannel = computed(() => {
    return messagesMap.value.get(activeChannel.value) ?? [];
  });

  function sendMessage(content: string): void {
    const trimmed = content.trim();
    if (!trimmed) return;

    const channel: ChatChannel = isPlayer ? 'players' : 'spectators';
    socketService.emit('chat:send', {
      roomId,
      content: trimmed,
      channel,
    });
  }

  // ── Listener lifecycle ──────────────────────────────────────────────

  function registerListeners(): void {
    if (listenerCount === 0) {
      socketService.on('chat:message', onChatMessage);
    }
    listenerCount++;
  }

  function unregisterListeners(): void {
    listenerCount--;
    if (listenerCount <= 0) {
      listenerCount = 0;
      socketService.off('chat:message', onChatMessage);
    }
  }

  function cleanup(): void {
    unregisterListeners();
    messagesMap.value.clear();
  }

  registerListeners();
  onUnmounted(() => {
    unregisterListeners();
  });

  return {
    // State
    messagesForActiveChannel,
    activeChannel,

    // Methods
    sendMessage,
    cleanup,
  };
}
