import { ref } from 'vue';
import { type BoardCoord, type BoardState, PlayerSide, type Difficulty } from '../types';

export function useGameAI() {
  const isAiThinking = ref(false);
  const thinkingPath = ref<{coord: BoardCoord, side: PlayerSide}[]>([]);
  const hintMove = ref<{from: BoardCoord, to: BoardCoord} | null>(null);
  const showThinking = ref(false);

  let worker: Worker | null = null;

  const terminateWorker = () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    thinkingPath.value = [];
    isAiThinking.value = false;
  };

  const aiMove = (
    board: BoardState,
    aiPlayerSide: PlayerSide,
    difficulty: Difficulty,
    onMove: (from: BoardCoord, to: BoardCoord) => void
  ) => {
    terminateWorker();
    isAiThinking.value = true;
    worker = new Worker(new URL('../ai/aiWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      if (e.data.type === 'thinking') {
        if (showThinking.value) {
          thinkingPath.value = e.data.path;
        }
      } else if (e.data.type === 'result') {
        isAiThinking.value = false;
        thinkingPath.value = [];
        const move = e.data.move;
        if (move) {
          onMove(move.from, move.to);
        }
      }
    };

    worker.postMessage({
      board: board.map(row => [...row]),
      aiPlayer: aiPlayerSide,
      difficulty
    });
  };

  const showHintInternal = (
    board: BoardState,
    currentPlayerSide: PlayerSide,
    difficulty: Difficulty
  ) => {
    terminateWorker();
    isAiThinking.value = true;
    worker = new Worker(new URL('../ai/aiWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      if (e.data.type === 'thinking') {
        if (showThinking.value) {
          thinkingPath.value = e.data.path;
        }
      } else if (e.data.type === 'result') {
        isAiThinking.value = false;
        thinkingPath.value = [];
        if (e.data.move) {
          hintMove.value = e.data.move;
        }
      }
    };

    worker.postMessage({
      board: board.map(row => [...row]),
      aiPlayer: currentPlayerSide,
      difficulty
    });
  };

  const toggleThinking = () => {
    showThinking.value = !showThinking.value;
    if (!showThinking.value) {
      thinkingPath.value = [];
    }
  };

  return {
    isAiThinking,
    thinkingPath,
    hintMove,
    showThinking,

    aiMove,
    showHint: showHintInternal,
    terminateWorker,
    toggleThinking,
  };
}
