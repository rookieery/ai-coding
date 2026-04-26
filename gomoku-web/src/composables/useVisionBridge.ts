import { ref } from 'vue';

const pendingVisionBoard = ref<number[][] | null>(null);

const setVisionBoard = (pieces: number[][]) => {
  pendingVisionBoard.value = pieces.map(row => [...row]);
};

const consumeVisionBoard = (): number[][] | null => {
  const current = pendingVisionBoard.value;
  pendingVisionBoard.value = null;
  return current;
};

export const useVisionBridge = () => ({
  pendingVisionBoard,
  setVisionBoard,
  consumeVisionBoard,
});
