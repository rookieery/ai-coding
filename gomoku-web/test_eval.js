const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const getLineScore = (s) => {
  let score = 0;
  if (s.includes("XXXXX")) return 1000000;
  if (s.includes(".XXXX.")) return 300000;

  let dead4 = 0;
  if (s.includes("OXXXX.") || s.includes(".XXXXO")) dead4++;
  if (s.includes("X.XXX") || s.includes("XXX.X") || s.includes("XX.XX")) dead4++;
  score += dead4 * 2500;

  let live3 = 0;
  if (s.includes("..XXX.") || s.includes(".XXX..") || s.includes(".X.XX.") || s.includes(".XX.X.")) live3++;
  score += live3 * 30000;

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
  score += live2 * 3000;

  let dead2 = 0;
  if (s.includes("OXX...") || s.includes("...XXO") || 
      s.includes("OX.X..") || s.includes("..X.XO") || 
      s.includes("O.XX..") || s.includes("..XX.O") || 
      s.includes("O..XX.") || s.includes(".XX..O")) dead2++;
  score += dead2 * 50;

  return score;
};

console.log("Live 4:", getLineScore(".XXXX."));
console.log("Dead 4:", getLineScore("OXXXX."));
console.log("Live 3:", getLineScore("..XXX."));
console.log("Dead 3:", getLineScore("OXXX.."));
console.log("Live 2:", getLineScore("...XX."));
console.log("Dead 2:", getLineScore("OXX..."));
