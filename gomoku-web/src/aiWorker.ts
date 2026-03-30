import { findBestMove } from './gameLogic';

let lastPostTime = 0;

self.onmessage = async (e: MessageEvent) => {
  const { board, aiPlayer, difficulty, ruleMode } = e.data;

  const move = await findBestMove(
    board,
    aiPlayer,
    difficulty,
    (path) => {
      const now = Date.now();
      if (now - lastPostTime > 50) {
        self.postMessage({ type: 'thinking', path: [...path] });
        lastPostTime = now;
      }
    },
    ruleMode
  );

  self.postMessage({ type: 'result', move });
};
