import { ref } from 'vue';

export type PlayMode = 'chat' | 'gomoku' | 'vision-confirm' | 'chess-vision-confirm';

export function useAgentPlay() {
  const playMode = ref<PlayMode>('chat');
  const isAIThinking = ref(false);

  const visionCandidates = ref<number[][][] | null>(null);
  const chessVisionCandidates = ref<number[][][] | null>(null);
  const pendingImageBase64 = ref<string | null>(null);
  const pendingQuestion = ref<string | null>(null);

  const enterGomokuMode = () => {
    playMode.value = 'gomoku';
  };

  const enterVisionConfirmMode = (
    candidates: number[][][],
    imageBase64: string,
    question?: string,
  ) => {
    visionCandidates.value = candidates;
    pendingImageBase64.value = imageBase64;
    pendingQuestion.value = question ?? null;
    playMode.value = 'vision-confirm';
  };

  const enterChessVisionConfirmMode = (
    candidates: number[][][],
    imageBase64: string,
    question?: string,
  ) => {
    chessVisionCandidates.value = candidates;
    pendingImageBase64.value = imageBase64;
    pendingQuestion.value = question ?? null;
    playMode.value = 'chess-vision-confirm';
  };

  const exitPlayMode = () => {
    playMode.value = 'chat';
    isAIThinking.value = false;
    visionCandidates.value = null;
    chessVisionCandidates.value = null;
    pendingImageBase64.value = null;
    pendingQuestion.value = null;
  };

  return {
    playMode,
    isAIThinking,
    visionCandidates,
    chessVisionCandidates,
    pendingImageBase64,
    pendingQuestion,
    enterGomokuMode,
    enterVisionConfirmMode,
    enterChessVisionConfirmMode,
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
