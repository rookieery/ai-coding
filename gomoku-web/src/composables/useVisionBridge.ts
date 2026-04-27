import { ref } from 'vue';

const pendingVisionCandidates = ref<number[][][] | null>(null);

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

export const useVisionBridge = () => ({
  pendingVisionCandidates,
  setVisionCandidates,
  consumeVisionCandidates,
});
