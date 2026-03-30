const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const getLineScore = (s) => {
  let score = 0;
  if (s.includes("XXXXX")) return 1000000;
  if (s.includes(".XXXX.")) return 100000;

  let dead4 = 0;
  if (s.includes("OXXXX.") || s.includes(".XXXXO")) dead4++;
  if (s.includes("X.XXX") || s.includes("XXX.X") || s.includes("XX.XX")) dead4++;
  score += dead4 * 1000;

  let live3 = 0;
  if (s.includes("..XXX.") || s.includes(".XXX..") || s.includes(".X.XX.") || s.includes(".XX.X.")) live3++;
  score += live3 * 10000;

  let dead3 = 0;
  if (s.includes("OXXX..") || s.includes("..XXXO") || 
      s.includes("O.XXX.") || s.includes(".XXX.O") || 
      s.includes("OX.XX.") || s.includes(".XX.XO") || 
      s.includes("OXX.X.") || s.includes(".X.XXO") || 
      s.includes("X..XX") || s.includes("XX..X") || s.includes("X.X.X")) dead3++;
  score += dead3 * 100;

  let live2 = 0;
  if (s.includes("...XX.") || s.includes("..XX..") || s.includes(".XX...") || 
      s.includes("..X.X.") || s.includes(".X.X..") || s.includes(".X..X.")) live2++;
  score += live2 * 100;

  let dead2 = 0;
  if (s.includes("OXX...") || s.includes("...XXO") || 
      s.includes("OX.X..") || s.includes("..X.XO") || 
      s.includes("O.XX..") || s.includes("..XX.O") || 
      s.includes("O..XX.") || s.includes(".XX..O")) dead2++;
  score += dead2 * 10;

  return score;
};

const evaluatePoint = (board, r, c, player) => {
  const opp = player === 1 ? 2 : 1;
  let score = 0;
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

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
    score += getLineScore(s);
  }
  return score;
};

const generateMoves = (board, aiPlayer, humanPlayer) => {
  const moves = [];
  const hasPiece = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));

  let pieceCount = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) {
        pieceCount++;
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            const nr = r + i, nc = c + j;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
              hasPiece[nr][nc] = true;
            }
          }
        }
      }
    }
  }

  if (pieceCount === 0) return [{ r: 7, c: 7, score: 0 }];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY && hasPiece[r][c]) {
        const attackScore = evaluatePoint(board, r, c, aiPlayer);
        const defenseScore = evaluatePoint(board, r, c, humanPlayer);
        moves.push({ r, c, score: attackScore + defenseScore * 1.2 });
      }
    }
  }

  moves.sort((a, b) => b.score - a.score);
  return moves;
};

const evaluateBoardState = (board, aiPlayer, humanPlayer) => {
  let aiScore = 0;
  let humanScore = 0;
  const lines = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    let s = "";
    for (let c = 0; c < BOARD_SIZE; c++) {
      s += board[r][c] === aiPlayer ? "X" : board[r][c] === humanPlayer ? "O" : ".";
    }
    lines.push(s);
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let s = "";
    for (let r = 0; r < BOARD_SIZE; r++) {
      s += board[r][c] === aiPlayer ? "X" : board[r][c] === humanPlayer ? "O" : ".";
    }
    lines.push(s);
  }

  for (let d = -BOARD_SIZE + 1; d < BOARD_SIZE; d++) {
    let s = "";
    for (let r = 0; r < BOARD_SIZE; r++) {
      const c = r - d;
      if (c >= 0 && c < BOARD_SIZE) {
        s += board[r][c] === aiPlayer ? "X" : board[r][c] === humanPlayer ? "O" : ".";
      }
    }
    if (s.length >= 5) lines.push(s);
  }

  for (let d = 0; d < 2 * BOARD_SIZE - 1; d++) {
    let s = "";
    for (let r = 0; r < BOARD_SIZE; r++) {
      const c = d - r;
      if (c >= 0 && c < BOARD_SIZE) {
        s += board[r][c] === aiPlayer ? "X" : board[r][c] === humanPlayer ? "O" : ".";
      }
    }
    if (s.length >= 5) lines.push(s);
  }

  for (const line of lines) {
    aiScore += getLineScore(line);
    const humanLine = line.replace(/X/g, 'T').replace(/O/g, 'X').replace(/T/g, 'O');
    humanScore += getLineScore(humanLine);
  }

  return aiScore - humanScore * 1.2;
};

let nodes = 0;
const minimax = (board, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer) => {
  nodes++;
  if (depth === 0) return evaluateBoardState(board, aiPlayer, humanPlayer);

  const moves = generateMoves(board, aiPlayer, humanPlayer).slice(0, 10);
  if (moves.length === 0) return evaluateBoardState(board, aiPlayer, humanPlayer);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      board[move.r][move.c] = aiPlayer;
      if (evaluatePoint(board, move.r, move.c, aiPlayer) >= 1000000) {
        board[move.r][move.c] = EMPTY;
        return 10000000 + depth;
      }
      const evalScore = minimax(board, depth - 1, alpha, beta, false, aiPlayer, humanPlayer);
      board[move.r][move.c] = EMPTY;
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      board[move.r][move.c] = humanPlayer;
      if (evaluatePoint(board, move.r, move.c, humanPlayer) >= 1000000) {
        board[move.r][move.c] = EMPTY;
        return -10000000 - depth;
      }
      const evalScore = minimax(board, depth - 1, alpha, beta, true, aiPlayer, humanPlayer);
      board[move.r][move.c] = EMPTY;
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
board[7][7] = BLACK;
board[7][8] = WHITE;
board[8][7] = BLACK;
board[8][8] = WHITE;
board[9][7] = BLACK;

console.time("minimax depth 4");
nodes = 0;
minimax(board, 4, -Infinity, Infinity, false, WHITE, BLACK);
console.timeEnd("minimax depth 4");
console.log("nodes:", nodes);

console.time("minimax depth 5");
nodes = 0;
minimax(board, 5, -Infinity, Infinity, false, WHITE, BLACK);
console.timeEnd("minimax depth 5");
console.log("nodes:", nodes);

console.time("minimax depth 6");
nodes = 0;
minimax(board, 6, -Infinity, Infinity, false, WHITE, BLACK);
console.timeEnd("minimax depth 6");
console.log("nodes:", nodes);
