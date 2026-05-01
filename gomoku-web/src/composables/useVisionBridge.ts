import { ref } from 'vue';

const pendingVisionCandidates = ref<number[][][] | null>(null);
const resolveConfirmation = ref<((pieces: number[][]) => void) | null>(null);

const setVisionCandidates = (candidates: number[][][]) => {
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

export const useVisionBridge = () => ({
  pendingVisionCandidates,
  resolveConfirmation,
  setVisionCandidates,
  consumeVisionCandidates,
  requestBoardConfirmation,
  confirmBoard,
  hasPendingConfirmation,
});
