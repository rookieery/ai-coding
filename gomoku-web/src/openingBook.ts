export type Pattern = {
  pieces: { r: number; c: number; p: number }[];
  nextMove: { r: number; c: number };
};

const B = 1; // BLACK
const W = 2; // WHITE

export const openingBook: Pattern[] = [
  // Move 2: White responds to Black's 7,7 (Direct)
  {
    pieces: [{ r: 7, c: 7, p: B }],
    nextMove: { r: 6, c: 7 },
  },
  // Move 3: Black plays HuaYue (Direct) - Sure win
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
    ],
    nextMove: { r: 6, c: 8 },
  },
  // Move 3: Black plays PuYue (Indirect) - Sure win
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
    ],
    nextMove: { r: 6, c: 8 },
  },
  // Move 4: White defends HuaYue (Direct defense)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
    ],
    nextMove: { r: 5, c: 7 },
  },
  // Move 4: White defends HuaYue (Alternative defense)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
    ],
    nextMove: { r: 7, c: 8 },
  },
  // Move 5: Black attacks HuaYue (after W 5,7)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 7, p: W },
    ],
    nextMove: { r: 8, c: 8 },
  },
  // Move 5: Black attacks HuaYue (after W 7,8)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 7, c: 8, p: W },
    ],
    nextMove: { r: 8, c: 6 },
  },
  // Move 5: Black attacks HuaYue (after W 5,9)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 9, p: W },
    ],
    nextMove: { r: 8, c: 6 },
  },
  // Move 4: White defends PuYue (Direct defense)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
    ],
    nextMove: { r: 6, c: 7 },
  },
  // Move 4: White defends PuYue (Alternative defense)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
    ],
    nextMove: { r: 5, c: 9 },
  },
  // Move 5: Black attacks PuYue (after W 6,7)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 6, c: 7, p: W },
    ],
    nextMove: { r: 7, c: 8 },
  },
  // Move 5: Black attacks PuYue (after W 5,9)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 9, p: W },
    ],
    nextMove: { r: 7, c: 9 },
  },
  // Move 5: Black attacks PuYue variation (h8, i7, i9, g7 -> g9)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 8, p: W },
      { r: 8, c: 8, p: B },
      { r: 6, c: 6, p: W },
    ],
    nextMove: { r: 8, c: 6 }, // g9
  },
  // Move 5: Black attacks PuYue variation (h8, i7, i9, j8 -> g7)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 8, p: W },
      { r: 8, c: 8, p: B },
      { r: 7, c: 9, p: W },
    ],
    nextMove: { r: 6, c: 6 }, // g7
  },
  // Move 5: Black attacks PuYue variation (h8, i7, i9, h9 -> g7)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 8, p: W },
      { r: 8, c: 8, p: B },
      { r: 8, c: 7, p: W },
    ],
    nextMove: { r: 6, c: 6 }, // g7
  },
  // Move 4: White defends YunYue (Direct)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 6, p: B },
    ],
    nextMove: { r: 5, c: 6 },
  },
  // Move 4: White defends YuYue (Indirect)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 5, c: 7, p: B },
    ],
    nextMove: { r: 6, c: 7 },
  },
  // Move 4: White defends SongYue (Direct)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 5, c: 7, p: B },
    ],
    nextMove: { r: 5, c: 6 },
  },
  // Move 4: White defends MingYue (Indirect)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 5, c: 5, p: B },
    ],
    nextMove: { r: 6, c: 5 },
  },
  // Move 5: Black attacks HuaYue (after W 5,7)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 7, p: W },
    ],
    nextMove: { r: 8, c: 8 },
  },
  // Move 6: White defends HuaYue (after B 8,8)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 7, p: W },
      { r: 8, c: 8, p: B },
    ],
    nextMove: { r: 9, c: 9 },
  },
  // Move 7: Black continues HuaYue attack
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 7, p: W },
      { r: 8, c: 8, p: B },
      { r: 9, c: 9, p: W },
    ],
    nextMove: { r: 7, c: 8 },
  },
  // Move 8: White defends HuaYue (after B 7,8)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 7, p: W },
      { r: 8, c: 8, p: B },
      { r: 9, c: 9, p: W },
      { r: 7, c: 8, p: B },
    ],
    nextMove: { r: 8, c: 9 },
  },
  // Move 9: Black wins HuaYue
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 7, p: W },
      { r: 8, c: 8, p: B },
      { r: 9, c: 9, p: W },
      { r: 7, c: 8, p: B },
      { r: 8, c: 9, p: W },
    ],
    nextMove: { r: 5, c: 8 },
  },
  // Move 5: Black attacks PuYue (after W 6,7)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 6, c: 7, p: W },
    ],
    nextMove: { r: 7, c: 8 },
  },
  // Move 6: White defends PuYue (after B 7,8)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 6, c: 7, p: W },
      { r: 7, c: 8, p: B },
    ],
    nextMove: { r: 8, c: 9 },
  },
  // Move 7: Black continues PuYue attack
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 6, c: 7, p: W },
      { r: 7, c: 8, p: B },
      { r: 8, c: 9, p: W },
    ],
    nextMove: { r: 5, c: 7 },
  },
  // Move 8: White defends PuYue (after B 5,7)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 6, c: 7, p: W },
      { r: 7, c: 8, p: B },
      { r: 8, c: 9, p: W },
      { r: 5, c: 7, p: B },
    ],
    nextMove: { r: 4, c: 6 },
  },
  // Move 9: Black wins PuYue
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 6, c: 7, p: W },
      { r: 7, c: 8, p: B },
      { r: 8, c: 9, p: W },
      { r: 5, c: 7, p: B },
      { r: 4, c: 6, p: W },
    ],
    nextMove: { r: 5, c: 8 },
  },
  // Move 10: White defends HuaYue (after B 5,8)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 7, p: W },
      { r: 8, c: 8, p: B },
      { r: 9, c: 9, p: W },
      { r: 7, c: 8, p: B },
      { r: 8, c: 9, p: W },
      { r: 5, c: 8, p: B },
    ],
    nextMove: { r: 4, c: 8 },
  },
  // Move 11: Black continues HuaYue win
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 7, p: W },
      { r: 8, c: 8, p: B },
      { r: 9, c: 9, p: W },
      { r: 7, c: 8, p: B },
      { r: 8, c: 9, p: W },
      { r: 5, c: 8, p: B },
      { r: 4, c: 8, p: W },
    ],
    nextMove: { r: 9, c: 7 },
  },
  // Move 10: White defends PuYue (after B 5,8)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 6, c: 7, p: W },
      { r: 7, c: 8, p: B },
      { r: 8, c: 9, p: W },
      { r: 5, c: 7, p: B },
      { r: 4, c: 6, p: W },
      { r: 5, c: 8, p: B },
    ],
    nextMove: { r: 4, c: 9 },
  },
  // Move 11: Black continues PuYue win
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 6, c: 7, p: W },
      { r: 7, c: 8, p: B },
      { r: 8, c: 9, p: W },
      { r: 5, c: 7, p: B },
      { r: 4, c: 6, p: W },
      { r: 5, c: 8, p: B },
      { r: 4, c: 9, p: W },
    ],
    nextMove: { r: 4, c: 7 },
  },
  // Move 6: White defends HuaYue variation (after B 8,6 with W 5,9)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 9, p: W },
      { r: 8, c: 6, p: B },
    ],
    nextMove: { r: 9, c: 5 },
  },
  // Move 6: White defends HuaYue variation (after B 8,6 with W 7,8)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 7, p: W },
      { r: 6, c: 8, p: B },
      { r: 7, c: 8, p: W },
      { r: 8, c: 6, p: B },
    ],
    nextMove: { r: 9, c: 5 },
  },
  // Move 6: White defends PuYue variation (after B 4,5)
  {
    pieces: [
      { r: 7, c: 7, p: B },
      { r: 6, c: 6, p: W },
      { r: 6, c: 8, p: B },
      { r: 5, c: 9, p: W },
      { r: 7, c: 9, p: B },
    ],
    nextMove: { r: 8, c: 10 },
  }
];

const transform = (r: number, c: number, type: number) => {
  const dr = r - 7;
  const dc = c - 7;
  let ndr = dr, ndc = dc;
  switch (type) {
    case 0: ndr = dr; ndc = dc; break;
    case 1: ndr = -dc; ndc = dr; break;
    case 2: ndr = -dr; ndc = -dc; break;
    case 3: ndr = dc; ndc = -dr; break;
    case 4: ndr = dr; ndc = -dc; break;
    case 5: ndr = -dr; ndc = dc; break;
    case 6: ndr = dc; ndc = dr; break;
    case 7: ndr = -dc; ndc = -dr; break;
  }
  return { r: ndr + 7, c: ndc + 7 };
};

export const getOpeningMove = (board: number[][]): { r: number; c: number } | null => {
  const currentPieces: { r: number; c: number; p: number }[] = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      if (board[r][c] !== 0) {
        currentPieces.push({ r, c, p: board[r][c] });
      }
    }
  }

  if (currentPieces.length === 0) {
    return { r: 7, c: 7 };
  }

  // Only use opening book for the first few moves
  if (currentPieces.length > 10) {
    return null;
  }

  for (const pattern of openingBook) {
    if (currentPieces.length !== pattern.pieces.length) continue;

    for (let t = 0; t < 8; t++) {
      let match = true;
      for (const pp of pattern.pieces) {
        const tp = transform(pp.r, pp.c, t);
        const found = currentPieces.find(
          (cp) => cp.r === tp.r && cp.c === tp.c && cp.p === pp.p
        );
        if (!found) {
          match = false;
          break;
        }
      }
      if (match) {
        const nextMove = transform(pattern.nextMove.r, pattern.nextMove.c, t);
        if (
          nextMove.r >= 0 && nextMove.r < 15 &&
          nextMove.c >= 0 && nextMove.c < 15 &&
          board[nextMove.r][nextMove.c] === 0
        ) {
          return nextMove;
        }
      }
    }
  }

  return null;
};
