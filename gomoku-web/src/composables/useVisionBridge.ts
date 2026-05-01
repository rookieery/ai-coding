import { ref } from 'vue';

const pendingVisionCandidates = ref<number[][][] | null>(null);
const resolveConfirmation = ref<((pieces: number[][]) => void) | null>(null);

const pendingQuestion = ref<string | null>(null);
const pendingImageBase64 = ref<string | null>(null);

/**
 * @deprecated The new AgentVisionPanel flow handles AI analysis directly in AgentView.
 * Kept for backward compatibility with the old GameView → AgentView redirect flow.
 */
export interface PendingAnalysis {
  pieces: number[][];
  question: string;
  imageBase64: string;
}

/**
 * @deprecated See PendingAnalysis.
 */
const pendingAnalysis = ref<PendingAnalysis | null>(null);

const setVisionCandidates = (candidates: number[][][]) => {
  pendingVisionCandidates.value = candidates.map(matrix =>
    matrix.map(row => [...row])
  );
};

const setVisionCandidatesForReplay = (candidates: number[][][]) => {
  pendingVisionCandidates.value = candidates.map(matrix =>
    matrix.map(row => [...row])
  );
};

const consumeVisionCandidates = (): number[][][] | null => {
  const current = pendingVisionCandidates.value;
  pendingVisionCandidates.value = null;
  return current;
};

/** Legacy: only for GameView direct-jump flow. The new AgentVisionPanel flow no longer calls this. */
const requestBoardConfirmation = (candidates: number[][][]): Promise<number[][]> => {
  setVisionCandidates(candidates);

  return new Promise<number[][]>((resolve) => {
    resolveConfirmation.value = resolve;
  });
};

const confirmBoard = (pieces: number[][]) => {
  if (resolveConfirmation.value) {
    const resolve = resolveConfirmation.value;
    resolveConfirmation.value = null;
    resolve(pieces);
  }
};

const hasPendingConfirmation = (): boolean => {
  return resolveConfirmation.value !== null;
};

const setPendingQuestion = (question: string, imageBase64: string) => {
  pendingQuestion.value = question;
  pendingImageBase64.value = imageBase64;
};

const consumePendingQuestion = (): { question: string; imageBase64: string } | null => {
  if (pendingQuestion.value === null) return null;
  const result = {
    question: pendingQuestion.value,
    imageBase64: pendingImageBase64.value || '',
  };
  pendingQuestion.value = null;
  pendingImageBase64.value = null;
  return result;
};

/** @deprecated See PendingAnalysis. */
const setPendingAnalysis = (analysis: PendingAnalysis) => {
  pendingAnalysis.value = analysis;
};

/** @deprecated See PendingAnalysis. */
const consumePendingAnalysis = (): PendingAnalysis | null => {
  const current = pendingAnalysis.value;
  pendingAnalysis.value = null;
  return current;
};

const clearPendingRequest = () => {
  pendingVisionCandidates.value = null;
  pendingQuestion.value = null;
  pendingImageBase64.value = null;
  pendingAnalysis.value = null;
  resolveConfirmation.value = null;
};

export const useVisionBridge = () => ({
  pendingVisionCandidates,
  resolveConfirmation,
  pendingQuestion,
  pendingAnalysis,
  setVisionCandidates,
  setVisionCandidatesForReplay,
  consumeVisionCandidates,
  requestBoardConfirmation,
  confirmBoard,
  hasPendingConfirmation,
  setPendingQuestion,
  consumePendingQuestion,
  setPendingAnalysis,
  consumePendingAnalysis,
  clearPendingRequest,
});
