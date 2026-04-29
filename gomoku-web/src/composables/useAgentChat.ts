import { ref } from 'vue';
import { t } from '../i18n';
import { chatApi, type ChatMessage } from '../api/chat-api';
import type { AgentMessage } from '../types/agent';

export function useAgentChat(options?: { scrollToBottom?: () => Promise<void> }) {
  const externalScrollToBottom = options?.scrollToBottom;

  const messages = ref<AgentMessage[]>([]);
  const isThinking = ref(false);
  const thinkingContent = ref('');
  const answerContent = ref('');
  const showThinkingProcess = ref(true);
  const currentUserQuery = ref('');

  const scrollToBottom = async () => {
    if (externalScrollToBottom) {
      await externalScrollToBottom();
    }
  };

  const getChatHistory = (): ChatMessage[] => {
    return messages.value.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));
  };

  const resetStreamingState = () => {
    isThinking.value = true;
    thinkingContent.value = '';
    answerContent.value = '';
    showThinkingProcess.value = true;
  };

  const executeStreamingChat = async (userQuery: string) => {
    try {
      await chatApi.sendMessageStream(
        {
          message: userQuery,
          history: getChatHistory(),
        },
        (chunk) => {
          if (chunk.type === 'thinking') {
            thinkingContent.value += chunk.text;
          } else if (chunk.type === 'answer') {
            answerContent.value += chunk.text;
            if (showThinkingProcess.value) {
              showThinkingProcess.value = false;
            }
          }
          scrollToBottom();
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : t('connectionError');
          messages.value.push({
            role: 'agent',
            text: `${t('genericErrorPrefix')}${errorMessage}`
          });
          scrollToBottom();
        },
        () => {
          if (answerContent.value.trim()) {
            messages.value.push({
              role: 'agent',
              text: answerContent.value,
              reasoningContent: thinkingContent.value.trim() || undefined,
              relatedUserQuery: currentUserQuery.value
            });
          } else if (thinkingContent.value.trim()) {
            messages.value.push({
              role: 'agent',
              text: thinkingContent.value,
              relatedUserQuery: currentUserQuery.value
            });
          }

          if (messages.value.length > 50) {
            messages.value = messages.value.slice(-50);
          }

          thinkingContent.value = '';
          answerContent.value = '';
          isThinking.value = false;
          showThinkingProcess.value = true;
          scrollToBottom();
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('connectionError');
      messages.value.push({
        role: 'agent',
        text: `${t('genericErrorPrefix')}${errorMessage}`
      });
      isThinking.value = false;
      showThinkingProcess.value = true;
      await scrollToBottom();
    }
  };

  const sendMessage = async (query: string, afterSend: () => void) => {
    if (!query.trim() || isThinking.value) return;

    messages.value.push({ role: 'user', text: query });
    currentUserQuery.value = query;
    afterSend();

    resetStreamingState();
    await scrollToBottom();
    await executeStreamingChat(query);
  };

  const regenerateStreamingAnswer = async () => {
    if (isThinking.value || !currentUserQuery.value) return;

    resetStreamingState();
    await scrollToBottom();
    await executeStreamingChat(currentUserQuery.value);
  };

  const regenerateAnswer = async (index: number) => {
    if (isThinking.value) return;

    const message = messages.value[index];
    if (message.role !== 'agent') return;

    let relatedUserQuery = message.relatedUserQuery;

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

    messages.value.splice(index, 1);
    currentUserQuery.value = relatedUserQuery;

    resetStreamingState();
    await scrollToBottom();
    await executeStreamingChat(relatedUserQuery);
  };

  return {
    messages,
    isThinking,
    thinkingContent,
    answerContent,
    showThinkingProcess,
    currentUserQuery,
    getChatHistory,
    sendMessage,
    regenerateStreamingAnswer,
    regenerateAnswer,
  };
}
