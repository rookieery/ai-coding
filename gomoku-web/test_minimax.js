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
  score += dead4 * 10000;

  let live3 = 0;
  if (s.includes("..XXX.") || s.includes(".XXX..") || s.includes(".X.XX.") || s.includes(".XX.X.")) live3++;
  score += live3 * 5000;

  let dead3 = 0;
  if (s.includes("OXXX..") || s.includes("..XXXO") || 
      s.includes("O.XXX.") || s.includes(".XXX.O") || 
      s.includes("OX.XX.") || s.includes(".XX.XO") || 
      s.includes("OXX.X.") || s.includes(".X.XXO") || 
      s.includes("X..XX") || s.includes("XX..X") || s.includes("X.X.X")) dead3++;
  score += dead3 * 500;

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

const evaluateBoardState = (board, aiPlayer, humanPlayer) => {
  let aiScore = 0;
  let humanScore = 0;
  
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const evaluated = new Set();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) {
        for (const [dr, dc] of directions) {
          let s = "";
          let startR = r - 4 * dr;
          let startC = c - 4 * dc;
          const lineKey = `${startR},${startC},${dr},${dc}`;
          if (evaluated.has(lineKey)) continue;
          evaluated.add(lineKey);

          for (let i = -4; i <= 4; i++) {
            const nr = r + i * dr;
            const nc = c + i * dc;
            if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
              s += "O";
            } else {
              if (board[nr][nc] === aiPlayer) s += "X";
              else if (board[nr][nc] === humanPlayer) s += "O";
              else s += ".";
            }
          }
          aiScore += getLineScore(s);
          const humanLine = s.replace(/X/g, 'T').replace(/O/g, 'X').replace(/T/g, 'O');
          humanScore += getLineScore(humanLine);
        }
      }
    }
  }
  return aiScore - humanScore * 1.5;
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

let nodes = 0;

const minimax = (board, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer) => {
  nodes++;
  if (depth === 0) {
    return evaluateBoardState(board, aiPlayer, humanPlayer);
  }

  const moves = generateMoves(board, aiPlayer, humanPlayer).slice(0, 15);

  if (moves.length === 0) return 0;

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

const getMinimaxMove = (board, aiPlayer, humanPlayer, depth) => {
  const moves = generateMoves(board, aiPlayer, humanPlayer).slice(0, 15);
  let bestMove = null;
  let maxEval = -Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  console.log("Root moves:");
  for (const move of moves) {
    board[move.r][move.c] = aiPlayer;
    const score = minimax(board, depth - 1, alpha, beta, false, aiPlayer, humanPlayer);
    board[move.r][move.c] = EMPTY;

    console.log(`Move r:${move.r} c:${move.c} score:${score}`);

    if (score > maxEval) {
      maxEval = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  return bestMove || moves[0];
};

const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));

// Recreate board at move 81 (Black's turn)
// White has b7, c7, e7
board[6][1] = WHITE; // b7
board[6][2] = WHITE; // c7
board[6][4] = WHITE; // e7

// Add some other pieces to make it realistic
board[5][5] = BLACK; // f6
board[8][3] = BLACK; // d9
board[5][1] = BLACK; // b6

const bestMove = getMinimaxMove(board, BLACK, WHITE, 4);
console.log(`Best move: r:${bestMove.r} c:${bestMove.c}`);
console.log(`Nodes evaluated: ${nodes}`);
