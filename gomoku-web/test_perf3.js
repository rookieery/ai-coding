const fs = require('fs');
const code = fs.readFileSync('test_minimax.js', 'utf8');
const newCode = code.replace(
  'const moves = generateMoves(board, aiPlayer, humanPlayer).slice(0, 15);',
  `let branchFactor = 15;
  if (depth === 5) branchFactor = 12;
  if (depth === 4) branchFactor = 10;
  if (depth === 3) branchFactor = 8;
  if (depth <= 2) branchFactor = 6;
  const moves = generateMoves(board, aiPlayer, humanPlayer).slice(0, branchFactor);`
).replace('getMinimaxMove(board, BLACK, WHITE, 4);', 'getMinimaxMove(board, BLACK, WHITE, 6);');
fs.writeFileSync('test_minimax_depth6.js', newCode);
