// Game constants, types, and utility predicates for Gomoku

export const BOARD_SIZE = 15;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert" | "neural";
export type RuleMode = "standard" | "renju";
export type Move = { r: number; c: number; score?: number };

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

// ── Forbidden Move Detection (Renju rules) ──────────────────────────
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
