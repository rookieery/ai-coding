import { ref, type Ref } from 'vue';
import { type BoardCoord, type BoardState, PlayerSide, type Difficulty } from '../types';
import { convertBoardStateToCodes } from '../utils';
import { chessLlmApi } from '../api/chessLlmApi';

export interface ChessLLMMoveResult {
  from: BoardCoord;
  to: BoardCoord;
  reason: string;
  situationAnalysis?: string;
  isFallback: boolean;
}

export function useGameAI() {
  const isAiThinking = ref(false);
  const isLlmThinking: Ref<boolean> = ref(false);
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

  const llmMove = (
    board: BoardState,
    aiPlayerSide: PlayerSide,
    onMove: (result: ChessLLMMoveResult) => void,
  ) => {
    isLlmThinking.value = true;

    const boardCodes = convertBoardStateToCodes(board);
    const currentPlayer = aiPlayerSide === PlayerSide.RED ? 'red' : 'black';

    const moveHistory = [] as Array<{
      from: { row: number; col: number };
      to: { row: number; col: number };
      piece: number;
      capturedPiece?: number;
      notation?: string;
    }>;

    chessLlmApi
      .generateMove({
        board: boardCodes,
        currentPlayer,
        moveHistory,
      })
      .then((response) => {
        isLlmThinking.value = false;
        onMove({
          from: { row: response.move.from.row, col: response.move.from.col },
          to: { row: response.move.to.row, col: response.move.to.col },
          reason: response.reason,
          situationAnalysis: response.situationAnalysis,
          isFallback: response.isFallback,
        });
      })
      .catch(() => {
        isLlmThinking.value = false;
      });
  };

  return {
    isAiThinking,
    isLlmThinking,
    thinkingPath,
    hintMove,
    showThinking,

    aiMove,
    showHint: showHintInternal,
    terminateWorker,
    toggleThinking,
    llmMove,
  };
}
