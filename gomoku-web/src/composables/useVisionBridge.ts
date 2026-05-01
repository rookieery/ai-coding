import { ref } from 'vue';

const pendingVisionCandidates = ref<number[][][] | null>(null);
const resolveConfirmation = ref<((pieces: number[][]) => void) | null>(null);

const pendingQuestion = ref<string | null>(null);
const pendingImageBase64 = ref<string | null>(null);

export interface PendingAnalysis {
  pieces: number[][];
  question: string;
  imageBase64: string;
}

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

const setPendingAnalysis = (analysis: PendingAnalysis) => {
  pendingAnalysis.value = analysis;
};

const consumePendingAnalysis = (): PendingAnalysis | null => {
  const current = pendingAnalysis.value;
  pendingAnalysis.value = null;
  return current;
};

const clearPendingRequest = () => {
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
