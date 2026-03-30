import { getOpeningMove } from "./openingBook";
import { gomokuNN } from "./nn/GomokuNN";

export const BOARD_SIZE = 15;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert" | "neural";
export type RuleMode = "standard" | "renju";
export type Move = { r: number; c: number; score?: number };

// Zobrist Hashing for Transposition Table
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
const aiScoreMap: number[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
const humanScoreMap: number[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
let totalAiScore = 0;
let totalHumanScore = 0;

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
  if (currentPlayer === WHITE) hash ^= sideToMoveHash;
  return hash;
};

const updateScoreMap = (board: number[][], r: number, c: number, aiPlayer: number, humanPlayer: number) => {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    for (let i = -4; i <= 4; i++) {
      const nr = r + i * dr;
      const nc = c + i * dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc] === EMPTY) {
          totalAiScore -= aiScoreMap[nr][nc];
          totalHumanScore -= humanScoreMap[nr][nc];
          
          aiScoreMap[nr][nc] = evaluatePoint(board, nr, nc, aiPlayer);
          humanScoreMap[nr][nc] = evaluatePoint(board, nr, nc, humanPlayer);
          
          totalAiScore += aiScoreMap[nr][nc];
          totalHumanScore += humanScoreMap[nr][nc];
        } else {
          // If it's a piece, its score map value should be 0
          totalAiScore -= aiScoreMap[nr][nc];
          totalHumanScore -= humanScoreMap[nr][nc];
          aiScoreMap[nr][nc] = 0;
          humanScoreMap[nr][nc] = 0;
        }
      }
    }
  }
};

const initializeScoreMaps = (board: number[][], aiPlayer: number, humanPlayer: number) => {
  totalAiScore = 0;
  totalHumanScore = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY) {
        aiScoreMap[r][c] = evaluatePoint(board, r, c, aiPlayer);
        humanScoreMap[r][c] = evaluatePoint(board, r, c, humanPlayer);
        totalAiScore += aiScoreMap[r][c];
        totalHumanScore += humanScoreMap[r][c];
      } else {
        aiScoreMap[r][c] = 0;
        humanScoreMap[r][c] = 0;
      }
    }
  }
};

export const isStarPoint = (r: number, c: number) => {
  return (
    (r === 3 && c === 3) ||
    (r === 3 && c === 11) ||
    (r === 11 && c === 3) ||
    (r === 11 && c === 11) ||
    (r === 7 && c === 7)
  );
};

export const checkWin = (
  board: number[][],
  r: number,
  c: number,
  player: number,
  ruleMode: RuleMode = "standard"
): { r: number; c: number }[] | null => {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let line = [{ r, c }];

    let i = r + dr,
      j = c + dc;
    while (
      i >= 0 &&
      i < BOARD_SIZE &&
      j >= 0 &&
      j < BOARD_SIZE &&
      board[i][j] === player
    ) {
      line.push({ r: i, c: j });
      i += dr;
      j += dc;
    }

    i = r - dr;
    j = c - dc;
    while (
      i >= 0 &&
      i < BOARD_SIZE &&
      j >= 0 &&
      j < BOARD_SIZE &&
      board[i][j] === player
    ) {
      line.push({ r: i, c: j });
      i -= dr;
      j -= dc;
    }

    if (ruleMode === "renju" && player === BLACK) {
      if (line.length === 5) return line;
    } else {
      if (line.length >= 5) return line.slice(0, 5);
    }
  }

  return null;
};

export const checkDraw = (board: number[][]) => {
  return board.every((row) => row.every((cell) => cell !== EMPTY));
};

const getLineScore = (s: string): number => {
  let score = 0;
  if (s.includes("XXXXX")) return 1000000; // Five
  if (s.includes(".XXXX.")) return 100000; // Live Four

  let dead4 = 0;
  if (s.includes("OXXXX.") || s.includes(".XXXXO")) dead4++;
  if (s.includes("X.XXX") || s.includes("XXX.X") || s.includes("XX.XX"))
    dead4++;
  score += dead4 * 12000; // Dead Four (Forcing move)

  let live3 = 0;
  if (
    s.includes("..XXX.") ||
    s.includes(".XXX..") ||
    s.includes(".X.XX.") ||
    s.includes(".XX.X.")
  )
    live3++;
  score += live3 * 10000; // Live Three

  let dead3 = 0;
  if (
    s.includes("OXXX..") ||
    s.includes("..XXXO") ||
    s.includes("O.XXX.") ||
    s.includes(".XXX.O") ||
    s.includes("OX.XX.") ||
    s.includes(".XX.XO") ||
    s.includes("OXX.X.") ||
    s.includes(".X.XXO") ||
    s.includes("X..XX") ||
    s.includes("XX..X") ||
    s.includes("X.X.X")
  )
    dead3++;
  score += dead3 * 3000; // Dead Three

  let live2 = 0;
  if (
    s.includes("...XX.") ||
    s.includes("..XX..") ||
    s.includes(".XX...") ||
    s.includes("..X.X.") ||
    s.includes(".X.X..") ||
    s.includes(".X..X.")
  )
    live2++;
  score += live2 * 1500; // Live Two (Making moves)

  let dead2 = 0;
  if (
    s.includes("OXX...") ||
    s.includes("...XXO") ||
    s.includes("OX.X..") ||
    s.includes("..X.XO") ||
    s.includes("O.XX..") ||
    s.includes("..XX.O") ||
    s.includes("O..XX.") ||
    s.includes(".XX..O")
  )
    dead2++;
  score += dead2 * 200; // Dead Two

  return score;
};

export const evaluatePoint = (
  board: number[][],
  r: number,
  c: number,
  player: number,
) => {
  const opp = player === 1 ? 2 : 1;
  let score = 0;
  let fours = 0;
  let live3s = 0;
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let s = "";
    for (let i = -4; i <= 4; i++) {
      const nr = r + i * dr;
      const nc = c + i * dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
        s += "O";
      } else if (i === 0) {
        s += "X";
      } else {
        if (board[nr][nc] === player) s += "X";
        else if (board[nr][nc] === opp) s += "O";
        else s += ".";
      }
    }
    const lineScore = getLineScore(s);
    score += lineScore;

    // Detect potential for killing moves (做杀)
    if (lineScore >= 100000) {
      // Five or Live Four - already very high score
    } else if (lineScore >= 10000) {
      // Check if it's a Dead Four or Live Three
      if (s.includes("OXXXX.") || s.includes(".XXXXO") || s.includes("X.XXX") || s.includes("XXX.X") || s.includes("XX.XX")) {
        fours++;
      } else {
        live3s++;
      }
    }
  }

  // Bonus for multiple threats (Killing moves: Double Four, Four-Three, Double Three)
  // This significantly increases the weight of offensive "killing" moves
  if (fours >= 2 || (fours >= 1 && live3s >= 1) || live3s >= 2) {
    score += 80000; // High bonus for VCT potential
  }
  return score;
};

export const getForbiddenType = (board: number[][], r: number, c: number, player: number): string | null => {
  if (player !== BLACK) return null;

  let totalFours = 0;
  let totalThrees = 0;
  let isFive = false;
  let isOverline = false;

  for (const [dr, dc] of [[1,0], [0,1], [1,1], [1,-1]]) {
    let str = '';
    for (let i = -5; i <= 5; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;
      if (i === 0) {
        str += '1';
      } else if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
        str += '2';
      } else if (board[nr][nc] === BLACK) {
        str += '1';
      } else if (board[nr][nc] === WHITE) {
        str += '2';
      } else {
        str += '0';
      }
    }

    if (/1{6,}/.test(str)) {
      isOverline = true;
    }
    if (/1{5}/.test(str) && !/1{6,}/.test(str)) {
      isFive = true;
    }

    const winningSpots = [];
    for (let i = 0; i < 11; i++) {
      if (str[i] === '0') {
        const temp = str.substring(0, i) + '1' + str.substring(i + 1);
        if (/1{5}/.test(temp) && !/1{6,}/.test(temp)) {
          winningSpots.push(i);
        }
      }
    }

    let lineFours = 0;
    if (winningSpots.length === 1) lineFours = 1;
    else if (winningSpots.length === 2) {
      if (winningSpots[1] - winningSpots[0] === 5) lineFours = 1;
      else lineFours = 2;
    } else if (winningSpots.length > 2) {
      lineFours = 2;
    }

    totalFours += lineFours;

    let lineThrees = 0;
    if (lineFours === 0) {
      if (/(001110|011100|010110|011010)/.test(str)) {
        lineThrees = 1;
      }
    }
    totalThrees += lineThrees;
  }

  if (isFive) return null;
  if (isOverline) return 'overline';
  if (totalFours >= 2) return 'double-four';
  if (totalThrees >= 2) return 'double-three';

  return null;
};

export const generateMoves = (
  board: number[][],
  aiPlayer: number,
  humanPlayer: number,
  currentPlayer: number = aiPlayer,
  ruleMode: RuleMode = "standard"
) => {
  const moves: { r: number; c: number; score: number }[] = [];
  const hasPiece = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(false),
  );

  let pieceCount = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) {
        pieceCount++;
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            const nr = r + i,
              nc = c + j;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
              hasPiece[nr][nc] = true;
            }
          }
        }
      }
    }
  }

  if (pieceCount === 0) {
    return [{ r: 7, c: 7, score: 0 }];
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY && hasPiece[r][c]) {
        if (ruleMode === "renju" && currentPlayer === BLACK) {
          if (getForbiddenType(board, r, c, BLACK) !== null) {
            continue;
          }
        }
        const attackScore = evaluatePoint(board, r, c, aiPlayer);
        const defenseScore = evaluatePoint(board, r, c, humanPlayer);
        // Prioritize attack slightly more to encourage "making moves" and "killing moves"
        moves.push({ r, c, score: attackScore * 1.1 + defenseScore });
      }
    }
  }

  moves.sort((a, b) => b.score - a.score);
  return moves;
};

const evaluateBoardState = (
  isMaximizing: boolean
) => {
  if (isMaximizing) {
    if (totalAiScore >= 1000000) return 100000000;
    if (totalHumanScore >= 1000000) return -100000000;
  } else {
    if (totalHumanScore >= 1000000) return -100000000;
    if (totalAiScore >= 1000000) return 100000000;
  }

  // Offensive bias: value AI's score more than human's score to encourage aggressive play
  return totalAiScore * 1.2 - totalHumanScore;
};

const isForcingMove = (board: number[][], r: number, c: number, player: number, isDefensive: boolean = false): boolean => {
  const opp = player === 1 ? 2 : 1;
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  board[r][c] = player;
  let isForcing = false;

  for (const [dr, dc] of directions) {
    let s = "";
    for (let i = -4; i <= 4; i++) {
      const nr = r + i * dr;
      const nc = c + i * dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
        s += "O";
      } else {
        if (board[nr][nc] === player) s += "X";
        else if (board[nr][nc] === opp) s += "O";
        else s += ".";
      }
    }
    
    if (isDefensive) {
      if (
        s.includes("XXXXX") || 
        s.includes(".XXXX.")
      ) {
        isForcing = true;
        break;
      }
    } else {
      if (
        s.includes("XXXXX") || 
        s.includes(".XXXX.") || 
        s.includes("OXXXX.") || 
        s.includes(".XXXXO") || 
        s.includes("X.XXX") || 
        s.includes("XXX.X") || 
        s.includes("XX.XX") || 
        s.includes("..XXX.") || 
        s.includes(".XXX..") || 
        s.includes(".X.XX.") || 
        s.includes(".XX.X.")
      ) {
        isForcing = true;
        break;
      }
    }
  }

  board[r][c] = EMPTY;
  return isForcing;
};

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
        // Full window search for the first move (PV)
        evalScore = minimax(board, nextDepth, alpha, beta, false, aiPlayer, humanPlayer, nextExt, startTime, timeLimit, currentPath, onThinking, ruleMode);
      } else {
        // Null window search for other moves (PVS)
        evalScore = minimax(board, nextDepth, alpha, alpha + 1, false, aiPlayer, humanPlayer, nextExt, startTime, timeLimit, currentPath, onThinking, ruleMode);
        if (evalScore > alpha && evalScore < beta) {
          // Research if the move might be better
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
        // Killer Heuristic
        if (!isForcing) {
          killerMoves[depth][1] = killerMoves[depth][0];
          killerMoves[depth][0] = move;
          historyTable[move.r][move.c] += depth * depth;
        }
        break;
      }
      moveIndex++;
    }

    // Store in TT
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

    // Store in TT
    const flag = minEval <= alphaOrig ? TTFlag.UPPERBOUND : (minEval >= beta ? TTFlag.LOWERBOUND : TTFlag.EXACT);
    transpositionTable.set(currentHash, { score: minEval, depth, flag, bestMove: bestMoveFound });

    return minEval;
  }
};

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
    
    // Sort by score descending to try best fours first
    fourMoves.sort((a, b) => evaluatePoint(board, b.r, b.c, aiPlayer) - evaluatePoint(board, a.r, a.c, aiPlayer));
    
    for (const move of fourMoves) {
      if (oppWinMove && (move.r !== oppWinMove.r || move.c !== oppWinMove.c)) {
        continue; // This move doesn't block the opponent's win
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
    // 1. Can defender win immediately?
    for (const move of moves) {
      if (evaluatePoint(board, move.r, move.c, humanPlayer) >= 1000000) {
        return null; // Defender wins, VCF fails
      }
    }
    
    // 2. Defender MUST block attacker's win
    const blockMoves = moves.filter(m => evaluatePoint(board, m.r, m.c, aiPlayer) >= 1000000);
    
    if (blockMoves.length === 0) {
      return null; // Attacker didn't create a threat, VCF fails
    }
    
    // If multiple blocks, defender must try all. If attacker wins against ALL, VCF succeeds.
    for (const move of blockMoves) {
      board[move.r][move.c] = humanPlayer;
      const result = findVCF(board, aiPlayer, humanPlayer, aiPlayer, depth + 1, maxDepth, ruleMode);
      board[move.r][move.c] = EMPTY;
      
      if (!result) {
        return null; // Attacker failed against this defense
      }
    }
    
    return { r: -1, c: -1 }; // Attacker succeeded against all defenses
  }
};

const getMinimaxMove = (
  board: number[][],
  aiPlayer: number,
  humanPlayer: number,
  maxDepth: number,
  onThinking?: (path: {r: number, c: number, player: number}[]) => void,
  ruleMode: RuleMode = "standard"
) => {
  // Check winning path cache first
  currentHash = computeInitialHash(board, aiPlayer);
  if (winningPathCache.has(currentHash)) {
    const cachedMove = winningPathCache.get(currentHash)!;
    if (board[cachedMove.r][cachedMove.c] === EMPTY) {
      return cachedMove;
    } else {
      winningPathCache.clear();
    }
  }

  // Check TT for proven win
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

  // VCF Search (算杀模块) - Search up to 13 plies deep for continuous fours
  const vcfMove = findVCF(board, aiPlayer, humanPlayer, aiPlayer, 1, 13, ruleMode);
  if (vcfMove) {
    return vcfMove;
  }

  // Defensive VCF - Check if opponent has a VCF
  const oppVcfMove = findVCF(board, humanPlayer, aiPlayer, humanPlayer, 1, 11, ruleMode);
  if (oppVcfMove) {
    // If opponent has a guaranteed win, blocking their first step is our best hope
    // We don't return immediately because minimax might find a better block or a deeper delay,
    // but we give this move a massive bonus to ensure it's searched first.
    const moveInList = moves.find(m => m.r === oppVcfMove.r && m.c === oppVcfMove.c);
    if (moveInList) {
      moveInList.score += 2000000;
      moves.sort((a, b) => b.score - a.score);
    }
  }

  const searchMoves = moves.slice(0, 30);
  const startTime = Date.now();
  const timeLimit = 180000; // 180 seconds limit for maximum strategic depth

  let bestMove = searchMoves[0];
  const currentPath: {r: number, c: number, player: number}[] = [];
  
  // Initialize Hash for current board
  currentHash = computeInitialHash(board, aiPlayer);
  initializeScoreMaps(board, aiPlayer, humanPlayer);
  
  // Clear TT if it's getting too large, but keep it between turns for "reusing results"
  if (transpositionTable.size > 1000000) transpositionTable.clear();

  // Iterative deepening
  for (let depth = 1; depth <= maxDepth; depth++) {
    let currentBestScore = -Infinity;
    let currentBestMove = null;
    let alpha = -Infinity;
    let beta = Infinity;
    let timeOut = false;

    // Sort moves based on TT, Killer, and History
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
        // For winning moves, strongly prefer moves with higher immediate heuristic score (e.g. VCF over VCT)
        finalScore += move.originalScore * 100;
      } else {
        // For normal and losing moves, use heuristic score as a tie-breaker
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
    
    // If we found a winning move, no need to search deeper
    if (currentBestScore >= 10000000) {
      // Populate winning path cache
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

export const findBestMove = async (
  board: number[][],
  aiPlayer: number,
  difficulty: Difficulty = "intermediate",
  onThinking?: (path: {r: number, c: number, player: number}[]) => void,
  ruleMode: RuleMode = "standard"
) => {
  if (difficulty === "advanced" || difficulty === "expert") {
    const openingMove = getOpeningMove(board);
    if (openingMove) return openingMove;
  }

  const humanPlayer = aiPlayer === BLACK ? WHITE : BLACK;
  const moves = generateMoves(board, aiPlayer, humanPlayer, aiPlayer, ruleMode);

  if (moves.length === 0) return null;

  if (difficulty !== "beginner") {
    for (const move of moves) {
      if (evaluatePoint(board, move.r, move.c, aiPlayer) >= 1000000)
        return move;
    }
    for (const move of moves) {
      if (evaluatePoint(board, move.r, move.c, humanPlayer) >= 1000000)
        return move;
    }
  }

  if (difficulty === "beginner") {
    const topN = Math.min(5, moves.length);
    return moves[Math.floor(Math.random() * topN)];
  } else if (difficulty === "intermediate") {
    return moves[0];
  } else if (difficulty === "advanced") {
    return getMinimaxMove(board, aiPlayer, humanPlayer, 8, onThinking, ruleMode);
  } else if (difficulty === "expert") {
    // Increase depth for early game to ensure sure-win calculation
    const pieceCount = board.flat().filter(c => c !== EMPTY).length;
    const depth = pieceCount < 20 ? 14 : 12;
    return getMinimaxMove(board, aiPlayer, humanPlayer, depth, onThinking, ruleMode);
  } else if (difficulty === "neural") {
    // Use the Neural Network to predict the best move.
    // Since we don't have pre-trained weights, this will act as a random/heuristic hybrid
    // but demonstrates the architecture integration.
    const { policy } = await gomokuNN.predict(board, aiPlayer);
    
    // Sort moves by policy probability
    moves.sort((a, b) => {
      const probA = policy[a.r * BOARD_SIZE + a.c];
      const probB = policy[b.r * BOARD_SIZE + b.c];
      return probB - probA;
    });
    
    // Add some randomness to the top choices to make it interesting without weights
    const topN = Math.min(3, moves.length);
    return moves[Math.floor(Math.random() * topN)];
  }

  return moves[0];
};
