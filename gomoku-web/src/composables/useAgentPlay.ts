import { ref } from 'vue';

export type PlayMode = 'chat' | 'gomoku';

/**
 * Agent分屏对弈状态管理
 */
export function useAgentPlay() {
  const playMode = ref<PlayMode>('chat');
  const isAIThinking = ref(false);

  const enterGomokuMode = () => {
    playMode.value = 'gomoku';
  };

  const exitPlayMode = () => {
    playMode.value = 'chat';
    isAIThinking.value = false;
  };

  return {
    playMode,
    isAIThinking,
    enterGomokuMode,
    exitPlayMode,
  };
}

let agentPlayInstance: ReturnType<typeof useAgentPlay> | null = null;

export function useGlobalAgentPlay() {
  if (!agentPlayInstance) {
    agentPlayInstance = useAgentPlay();
  }
  return agentPlayInstance;
}
