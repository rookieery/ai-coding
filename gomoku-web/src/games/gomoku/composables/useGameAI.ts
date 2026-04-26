import { ref } from 'vue';
import type { Difficulty, RuleMode } from '../gameLogic';
import { llmApi, type LLMPlayerColor } from '../api/llmApi';

export function useGameAI() {
  const isAiThinking = ref(false);
  const thinkingPath = ref<{r: number, c: number, player: number}[]>([]);
  const hintMove = ref<{r: number, c: number} | null>(null);
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
    board: number[][],
    aiPlayer: number,
    difficulty: Difficulty,
    ruleMode: RuleMode,
    onMove: (r: number, c: number) => void
  ) => {
    terminateWorker();
    isAiThinking.value = true;
    worker = new Worker(new URL('../aiWorker.ts', import.meta.url), { type: 'module' });

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
          onMove(move.r, move.c);
        }
      }
    };

    worker.postMessage({
      board: board.map(row => [...row]),
      aiPlayer,
      difficulty,
      ruleMode
    });
  };

  const llmMove = async (
    board: number[][],
    aiPlayer: number,
    moveHistory: {r: number, c: number, player: number}[],
    onMove: (r: number, c: number) => void,
    onError: (msg: string) => void
  ) => {
    terminateWorker();
    isAiThinking.value = true;

    try {
      const llmPlayer: LLMPlayerColor = aiPlayer === 1 ? 'black' : 'white';

      const response = await llmApi.generateMove({
        board: board.map(row => [...row]),
        currentPlayer: llmPlayer,
        moveHistory: [...moveHistory],
      });

      isAiThinking.value = false;

      onMove(response.y, response.x);
    } catch {
      isAiThinking.value = false;
      onError('llmMoveFailed');
    }
  };

  const showHintInternal = (
    board: number[][],
    currentPlayer: number,
    difficulty: Difficulty,
    ruleMode: RuleMode
  ) => {
    terminateWorker();
    isAiThinking.value = true;
    worker = new Worker(new URL('../aiWorker.ts', import.meta.url), { type: 'module' });

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
      aiPlayer: currentPlayer,
      difficulty,
      ruleMode
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
    llmMove,
    showHint: showHintInternal,
    toggleThinking,
    terminateWorker,
  };
}
