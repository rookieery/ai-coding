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

const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));

// Recreate board at move 81 (Black's turn)
// White has b7, c7, e7
board[6][1] = WHITE; // b7
board[6][2] = WHITE; // c7
board[6][4] = WHITE; // e7

// Add some other pieces to make it realistic
board[5][5] = BLACK; // f6
board[8][3] = BLACK; // d9

const moves = generateMoves(board, BLACK, WHITE);
console.log("Top 15 moves:");
for (let i = 0; i < 15 && i < moves.length; i++) {
  console.log(`r: ${moves[i].r}, c: ${moves[i].c}, score: ${moves[i].score}`);
}
