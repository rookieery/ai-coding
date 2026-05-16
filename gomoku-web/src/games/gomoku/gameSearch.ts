// Search algorithms for Gomoku AI
// Includes Zobrist hashing, transposition table, PVS minimax,
// VCF (Victory by Continuous Fours) search, and iterative deepening.

import { BOARD_SIZE, EMPTY, checkWin } from "./gameConstants";
import type { RuleMode, Move } from "./gameConstants";
import {
  evaluatePoint,
  evaluateBoardState,
  isForcingMove,
  initializeScoreMaps,
  updateScoreMapExport as updateScoreMap,
} from "./gameEvaluation";
import { generateMoves } from "./gameMoves";

// ── Zobrist Hashing ─────────────────────────────────────────────────
const zobristTable: bigint[][][] = [];
let sideToMoveHash: bigint = 0n;
let currentHash: bigint = 0n;

const initZobrist = () => {
  const random64 = () => (BigInt(Math.floor(Math.random() * 0xFFFFFFFF)) << 32n) | BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
  for (let r = 0; r < BOARD_SIZE; r++) {
    zobristTable[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      zobristTable[r][c] = [0n, random64(), random64()];
    }
  }
  sideToMoveHash = random64();
};

initZobrist();

// ── Transposition Table ─────────────────────────────────────────────
enum TTFlag {
  EXACT = 0,
  LOWERBOUND = 1,
  UPPERBOUND = 2,
}

interface TTEntry {
  score: number;
  depth: number;
  flag: TTFlag;
  bestMove: Move | null;
}

const transpositionTable = new Map<bigint, TTEntry>();
const winningPathCache = new Map<bigint, Move>();
const killerMoves: (Move | null)[][] = Array.from({ length: 32 }, () => [null, null]);
const historyTable: number[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));

const updateHash = (r: number, c: number, player: number) => {
  currentHash ^= zobristTable[r][c][player];
  currentHash ^= sideToMoveHash;
};

const computeInitialHash = (board: number[][], currentPlayer: number) => {
  let hash = 0n;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) {
        hash ^= zobristTable[r][c][board[r][c]];
      }
    }
  }
  if (currentPlayer === 2) hash ^= sideToMoveHash; // WHITE = 2
  return hash;
};

// ── PVS Minimax with Transposition Table ────────────────────────────
export const minimax = (
  board: number[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: number,
  humanPlayer: number,
  extensions: number = 0,
  startTime: number = 0,
  timeLimit: number = 5000,
  currentPath: {r: number, c: number, player: number}[] = [],
  onThinking?: (path: {r: number, c: number, player: number}[]) => void,
  ruleMode: RuleMode = "standard"
): number => {
  const alphaOrig = alpha;

  // Transposition Table Lookup
  const ttEntry = transpositionTable.get(currentHash);
  if (ttEntry && (ttEntry.depth >= depth || Math.abs(ttEntry.score) >= 10000000)) {
    if (ttEntry.flag === TTFlag.EXACT) return ttEntry.score;
    else if (ttEntry.flag === TTFlag.LOWERBOUND) {
      if (ttEntry.score >= 10000000) return ttEntry.score;
      alpha = Math.max(alpha, ttEntry.score);
    }
    else if (ttEntry.flag === TTFlag.UPPERBOUND) {
      if (ttEntry.score <= -10000000) return ttEntry.score;
      beta = Math.min(beta, ttEntry.score);
    }

    if (alpha >= beta) return ttEntry.score;
  }

  if (startTime > 0 && Date.now() - startTime > timeLimit) {
    return evaluateBoardState(isMaximizing);
  }

  if (currentPath.length >= 20) {
    return evaluateBoardState(isMaximizing);
  }

  if (depth === 0 && extensions >= 14) {
    return evaluateBoardState(isMaximizing);
  }

  let branchFactor = 15;
  if (depth >= 8) branchFactor = 20;
  if (depth === 5) branchFactor = 12;
  if (depth === 4) branchFactor = 10;
  if (depth === 3) branchFactor = 8;
  if (depth <= 2) branchFactor = 6;

  const currentPlayer = isMaximizing ? aiPlayer : humanPlayer;
  let moves = generateMoves(board, aiPlayer, humanPlayer, currentPlayer, ruleMode);

  if (currentPath.length > 0) {
    const lastMove = currentPath[currentPath.length - 1];
    if (checkWin(board, lastMove.r, lastMove.c, lastMove.player, ruleMode)) {
      return lastMove.player === aiPlayer ? 100000000 + depth + (14 - extensions) : -100000000 - depth - (14 - extensions);
    }
  }

  if (depth === 0) {
    const opponent = isMaximizing ? humanPlayer : aiPlayer;

    moves = moves.filter(m => {
      if (m.score < 2500) return false;
      return isForcingMove(board, m.r, m.c, currentPlayer, false) ||
             isForcingMove(board, m.r, m.c, opponent, true);
    });
    branchFactor = 5;
    if (moves.length === 0) {
      return evaluateBoardState(isMaximizing);
    }
  }

  // Move Ordering
  const ttBestMove = ttEntry?.bestMove;
  const killers = killerMoves[depth];

  moves.forEach(m => {
    let bonus = 0;
    if (ttBestMove && m.r === ttBestMove.r && m.c === ttBestMove.c) bonus += 1000000;
    else if (killers[0] && m.r === killers[0].r && m.c === killers[0].c) bonus += 900000;
    else if (killers[1] && m.r === killers[1].r && m.c === killers[1].c) bonus += 800000;
    else bonus += historyTable[m.r][m.c];
    m.score += bonus;
  });

  moves.sort((a, b) => b.score - a.score);

  moves = moves.slice(0, branchFactor);
  if (moves.length === 0)
    return evaluateBoardState(isMaximizing);

  let bestMoveFound: Move | null = null;

  if (isMaximizing) {
    let maxEval = -Infinity;
    let moveIndex = 0;
    for (const move of moves) {
      board[move.r][move.c] = aiPlayer;
      updateHash(move.r, move.c, aiPlayer);
      updateScoreMap(board, move.r, move.c, aiPlayer, humanPlayer);
      currentPath.push({r: move.r, c: move.c, player: aiPlayer});
      if (onThinking) onThinking(currentPath);

      if (evaluatePoint(board, move.r, move.c, aiPlayer) >= 1000000) {
        board[move.r][move.c] = EMPTY;
        updateHash(move.r, move.c, aiPlayer);
        updateScoreMap(board, move.r, move.c, aiPlayer, humanPlayer);
        currentPath.pop();
        return 100000000 + depth + (14 - extensions);
      }

      let nextDepth = depth > 0 ? depth - 1 : 0;
      let nextExt = depth === 0 ? extensions + 1 : extensions;

      const isForcing = move.score >= 5000 || isForcingMove(board, move.r, move.c, aiPlayer, false) || isForcingMove(board, move.r, move.c, humanPlayer, true);

      if (isForcing && depth > 0) {
        if (extensions < 14) {
          nextDepth = depth;
          nextExt = extensions + 1;
        }
      }

      let evalScore: number;
      if (moveIndex === 0) {
        evalScore = minimax(board, nextDepth, alpha, beta, false, aiPlayer, humanPlayer, nextExt, startTime, timeLimit, currentPath, onThinking, ruleMode);
      } else {
        evalScore = minimax(board, nextDepth, alpha, alpha + 1, false, aiPlayer, humanPlayer, nextExt, startTime, timeLimit, currentPath, onThinking, ruleMode);
        if (evalScore > alpha && evalScore < beta) {
          evalScore = minimax(board, nextDepth, alpha, beta, false, aiPlayer, humanPlayer, nextExt, startTime, timeLimit, currentPath, onThinking, ruleMode);
        }
      }

      board[move.r][move.c] = EMPTY;
      updateHash(move.r, move.c, aiPlayer);
      updateScoreMap(board, move.r, move.c, aiPlayer, humanPlayer);
      currentPath.pop();

      if (evalScore > maxEval) {
        maxEval = evalScore;
        bestMoveFound = move;
      }
      alpha = Math.max(alpha, evalScore);

      if (maxEval >= 10000000) {
        break;
      }

      if (beta <= alpha) {
        if (!isForcing) {
          killerMoves[depth][1] = killerMoves[depth][0];
          killerMoves[depth][0] = move;
          historyTable[move.r][move.c] += depth * depth;
        }
        break;
      }
      moveIndex++;
    }

    const flag = maxEval <= alphaOrig ? TTFlag.UPPERBOUND : (maxEval >= beta ? TTFlag.LOWERBOUND : TTFlag.EXACT);
    transpositionTable.set(currentHash, { score: maxEval, depth, flag, bestMove: bestMoveFound });

    return maxEval;
  } else {
    let minEval = Infinity;
    let moveIndex = 0;
    for (const move of moves) {
      board[move.r][move.c] = humanPlayer;
      updateHash(move.r, move.c, humanPlayer);
      updateScoreMap(board, move.r, move.c, aiPlayer, humanPlayer);
      currentPath.push({r: move.r, c: move.c, player: humanPlayer});
      if (onThinking) onThinking(currentPath);

      if (evaluatePoint(board, move.r, move.c, humanPlayer) >= 1000000) {
        board[move.r][move.c] = EMPTY;
        updateHash(move.r, move.c, humanPlayer);
        updateScoreMap(board, move.r, move.c, aiPlayer, humanPlayer);
        currentPath.pop();
        return -100000000 - depth - (14 - extensions);
      }

      let nextDepth = depth > 0 ? depth - 1 : 0;
      let nextExt = depth === 0 ? extensions + 1 : extensions;

      const isForcing = move.score >= 5000 || isForcingMove(board, move.r, move.c, humanPlayer, false) || isForcingMove(board, move.r, move.c, aiPlayer, true);

      if (isForcing && depth > 0) {
        if (extensions < 14) {
          nextDepth = depth;
          nextExt = extensions + 1;
        }
      }

      let evalScore: number;
      if (moveIndex === 0) {
        evalScore = minimax(board, nextDepth, alpha, beta, true, aiPlayer, humanPlayer, nextExt, startTime, timeLimit, currentPath, onThinking, ruleMode);
      } else {
        evalScore = minimax(board, nextDepth, beta - 1, beta, true, aiPlayer, humanPlayer, nextExt, startTime, timeLimit, currentPath, onThinking, ruleMode);
        if (evalScore < beta && evalScore > alpha) {
          evalScore = minimax(board, nextDepth, alpha, beta, true, aiPlayer, humanPlayer, nextExt, startTime, timeLimit, currentPath, onThinking, ruleMode);
        }
      }

      board[move.r][move.c] = EMPTY;
      updateHash(move.r, move.c, humanPlayer);
      updateScoreMap(board, move.r, move.c, aiPlayer, humanPlayer);
      currentPath.pop();

      if (evalScore < minEval) {
        minEval = evalScore;
        bestMoveFound = move;
      }
      beta = Math.min(beta, evalScore);

      if (minEval <= -10000000) {
        break;
      }

      if (beta <= alpha) {
        if (!isForcing) {
          killerMoves[depth][1] = killerMoves[depth][0];
          killerMoves[depth][0] = move;
          historyTable[move.r][move.c] += depth * depth;
        }
        break;
      }
      moveIndex++;
    }

    const flag = minEval <= alphaOrig ? TTFlag.UPPERBOUND : (minEval >= beta ? TTFlag.LOWERBOUND : TTFlag.EXACT);
    transpositionTable.set(currentHash, { score: minEval, depth, flag, bestMove: bestMoveFound });

    return minEval;
  }
};

// ── VCF (Victory by Continuous Fours) Search ────────────────────────
const findVCF = (
  board: number[][],
  aiPlayer: number,
  humanPlayer: number,
  currentPlayer: number,
  depth: number,
  maxDepth: number,
  ruleMode: RuleMode
): Move | null => {
  if (depth > maxDepth) return null;

  const moves = generateMoves(board, aiPlayer, humanPlayer, currentPlayer, ruleMode);

  if (currentPlayer === aiPlayer) {
    // 1. Can we win immediately?
    for (const move of moves) {
      if (evaluatePoint(board, move.r, move.c, aiPlayer) >= 1000000) {
        return move;
      }
    }

    // 2. Must we block opponent's immediate win?
    let oppWinMove = null;
    for (const move of moves) {
      if (evaluatePoint(board, move.r, move.c, humanPlayer) >= 1000000) {
        oppWinMove = move;
        break;
      }
    }

    // 3. Find all moves that create a four (score >= 12000)
    const fourMoves = moves.filter(m => evaluatePoint(board, m.r, m.c, aiPlayer) >= 12000);

    fourMoves.sort((a, b) => evaluatePoint(board, b.r, b.c, aiPlayer) - evaluatePoint(board, a.r, a.c, aiPlayer));

    for (const move of fourMoves) {
      if (oppWinMove && (move.r !== oppWinMove.r || move.c !== oppWinMove.c)) {
        continue;
      }

      board[move.r][move.c] = aiPlayer;
      const result = findVCF(board, aiPlayer, humanPlayer, humanPlayer, depth + 1, maxDepth, ruleMode);
      board[move.r][move.c] = EMPTY;

      if (result) {
        return move;
      }
    }
    return null;
  } else {
    // Defender's turn
    for (const move of moves) {
      if (evaluatePoint(board, move.r, move.c, humanPlayer) >= 1000000) {
        return null;
      }
    }

    const blockMoves = moves.filter(m => evaluatePoint(board, m.r, m.c, aiPlayer) >= 1000000);

    if (blockMoves.length === 0) {
      return null;
    }

    for (const move of blockMoves) {
      board[move.r][move.c] = humanPlayer;
      const result = findVCF(board, aiPlayer, humanPlayer, aiPlayer, depth + 1, maxDepth, ruleMode);
      board[move.r][move.c] = EMPTY;

      if (!result) {
        return null;
      }
    }

    return { r: -1, c: -1 };
  }
};

// ── Iterative Deepening Entry Point ─────────────────────────────────
export const getMinimaxMove = (
  board: number[][],
  aiPlayer: number,
  humanPlayer: number,
  maxDepth: number,
  onThinking?: (path: {r: number, c: number, player: number}[]) => void,
  ruleMode: RuleMode = "standard"
) => {
  currentHash = computeInitialHash(board, aiPlayer);
  if (winningPathCache.has(currentHash)) {
    const cachedMove = winningPathCache.get(currentHash)!;
    if (board[cachedMove.r][cachedMove.c] === EMPTY) {
      return cachedMove;
    } else {
      winningPathCache.clear();
    }
  }

  const rootTtEntry = transpositionTable.get(currentHash);
  if (rootTtEntry && rootTtEntry.bestMove && rootTtEntry.score >= 10000000) {
    if (rootTtEntry.flag === TTFlag.EXACT || rootTtEntry.flag === TTFlag.LOWERBOUND) {
      if (board[rootTtEntry.bestMove.r][rootTtEntry.bestMove.c] === EMPTY) {
        return rootTtEntry.bestMove;
      }
    }
  }

  const moves = generateMoves(board, aiPlayer, humanPlayer, aiPlayer, ruleMode);
  if (moves.length === 0) return { r: 7, c: 7 };

  for (const move of moves) {
    if (evaluatePoint(board, move.r, move.c, aiPlayer) >= 1000000) return move;
  }
  for (const move of moves) {
    if (evaluatePoint(board, move.r, move.c, humanPlayer) >= 1000000)
      return move;
  }

  // VCF Search
  const vcfMove = findVCF(board, aiPlayer, humanPlayer, aiPlayer, 1, 13, ruleMode);
  if (vcfMove) {
    return vcfMove;
  }

  // Defensive VCF
  const oppVcfMove = findVCF(board, humanPlayer, aiPlayer, humanPlayer, 1, 11, ruleMode);
  if (oppVcfMove) {
    const moveInList = moves.find(m => m.r === oppVcfMove.r && m.c === oppVcfMove.c);
    if (moveInList) {
      moveInList.score += 2000000;
      moves.sort((a, b) => b.score - a.score);
    }
  }

  const searchMoves = moves.slice(0, 30);
  const startTime = Date.now();
  const timeLimit = 180000;

  let bestMove = searchMoves[0];
  const currentPath: {r: number, c: number, player: number}[] = [];

  currentHash = computeInitialHash(board, aiPlayer);
  initializeScoreMaps(board, aiPlayer, humanPlayer);

  if (transpositionTable.size > 1000000) transpositionTable.clear();

  // Iterative deepening
  for (let depth = 1; depth <= maxDepth; depth++) {
    let currentBestScore = -Infinity;
    let currentBestMove = null;
    let alpha = -Infinity;
    let beta = Infinity;
    let timeOut = false;

    const sortedMoves = searchMoves.map(m => ({ ...m, originalScore: m.score }));
    const ttEntry = transpositionTable.get(currentHash);
    const ttBestMove = ttEntry?.bestMove;
    const killers = killerMoves[depth];

    sortedMoves.forEach(m => {
      let bonus = 0;
      if (ttBestMove && m.r === ttBestMove.r && m.c === ttBestMove.c) bonus += 1000000;
      else if (killers[0] && m.r === killers[0].r && m.c === killers[0].c) bonus += 900000;
      else if (killers[1] && m.r === killers[1].r && m.c === killers[1].c) bonus += 800000;
      else bonus += historyTable[m.r][m.c];
      m.score += bonus;
    });
    sortedMoves.sort((a, b) => b.score - a.score);

    for (const move of sortedMoves) {
      if (Date.now() - startTime > timeLimit) {
        timeOut = true;
        break;
      }

      currentPath.push({r: move.r, c: move.c, player: aiPlayer});
      if (onThinking) {
        onThinking(currentPath);
      }

      board[move.r][move.c] = aiPlayer;
      updateHash(move.r, move.c, aiPlayer);
      updateScoreMap(board, move.r, move.c, aiPlayer, humanPlayer);
      const score = minimax(
        board,
        depth - 1,
        alpha,
        beta,
        false,
        aiPlayer,
        humanPlayer,
        0,
        startTime,
        timeLimit,
        currentPath,
        onThinking,
        ruleMode
      );
      board[move.r][move.c] = EMPTY;
      updateHash(move.r, move.c, aiPlayer);
      updateScoreMap(board, move.r, move.c, aiPlayer, humanPlayer);
      currentPath.pop();

      let finalScore = score;
      if (score >= 10000000) {
        finalScore += move.originalScore * 100;
      } else {
        finalScore += move.originalScore / 100000;
      }

      if (finalScore > currentBestScore) {
        currentBestScore = finalScore;
        currentBestMove = move;
      }
      alpha = Math.max(alpha, score);

      if (currentBestScore >= 10000000) {
        break;
      }
    }

    if (currentBestMove && !timeOut) {
      bestMove = currentBestMove;
    }

    if (timeOut) {
      break;
    }

    if (currentBestScore >= 10000000) {
      let tempHash = computeInitialHash(board, aiPlayer);
      winningPathCache.clear();

      if (currentBestMove) {
        winningPathCache.set(tempHash, currentBestMove);

        let tempPlayer = aiPlayer;
        const tempBoard = board.map(row => [...row]);
        let m = currentBestMove;

        for (let i = 0; i < 30; i++) {
          tempBoard[m.r][m.c] = tempPlayer;
          if (checkWin(tempBoard, m.r, m.c, tempPlayer, ruleMode)) break;

          tempHash ^= zobristTable[m.r][m.c][tempPlayer];
          tempHash ^= sideToMoveHash;
          tempPlayer = tempPlayer === aiPlayer ? humanPlayer : aiPlayer;

          const entry = transpositionTable.get(tempHash);
          if (!entry || !entry.bestMove) break;
          if (entry.score < 10000000) break;

          if (tempPlayer === aiPlayer) {
            winningPathCache.set(tempHash, entry.bestMove);
          }

          m = entry.bestMove;
          if (tempBoard[m.r][m.c] !== EMPTY) break;
        }
      }
      break;
    }
  }

  return bestMove;
};
