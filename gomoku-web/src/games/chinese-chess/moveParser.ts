/**
 * Chinese Chess Move Text Parser
 * Parses user chat input into board coordinates for the Agent split-screen play mode.
 *
 * Supported formats:
 * 1. Standard notation: "炮二平五", "马八进七", "车1进1"
 * 2. Coordinate format: "0,0-1,0", "(0,0)(1,0)", "0,0到1,0"
 */

import { PieceType, PlayerSide } from './types';

export interface ParsedChessMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  notation?: string;
  confidence: number;
}

const CHINESE_NUMERAL_MAP: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9,
};

const PIECE_CHAR_MAP: Record<string, { type: PieceType; side: PlayerSide | null }> = {
  '帅': { type: PieceType.KING, side: PlayerSide.RED },
  '将': { type: PieceType.KING, side: PlayerSide.BLACK },
  '仕': { type: PieceType.ADVISOR, side: PlayerSide.RED },
  '士': { type: PieceType.ADVISOR, side: PlayerSide.BLACK },
  '相': { type: PieceType.ELEPHANT, side: PlayerSide.RED },
  '象': { type: PieceType.ELEPHANT, side: PlayerSide.BLACK },
  '马': { type: PieceType.KNIGHT, side: null },
  '馬': { type: PieceType.KNIGHT, side: null },
  '车': { type: PieceType.ROOK, side: null },
  '車': { type: PieceType.ROOK, side: null },
  '炮': { type: PieceType.CANNON, side: null },
  '砲': { type: PieceType.CANNON, side: null },
  '兵': { type: PieceType.PAWN, side: PlayerSide.RED },
  '卒': { type: PieceType.PAWN, side: PlayerSide.BLACK },
};

const CODE_PIECE_MAP: Record<number, { type: PieceType; side: PlayerSide }> = {
  1:  { type: PieceType.KING, side: PlayerSide.RED },
  2:  { type: PieceType.ADVISOR, side: PlayerSide.RED },
  3:  { type: PieceType.ELEPHANT, side: PlayerSide.RED },
  4:  { type: PieceType.KNIGHT, side: PlayerSide.RED },
  5:  { type: PieceType.ROOK, side: PlayerSide.RED },
  6:  { type: PieceType.CANNON, side: PlayerSide.RED },
  7:  { type: PieceType.PAWN, side: PlayerSide.RED },
  8:  { type: PieceType.KING, side: PlayerSide.BLACK },
  9:  { type: PieceType.ADVISOR, side: PlayerSide.BLACK },
  10: { type: PieceType.ELEPHANT, side: PlayerSide.BLACK },
  11: { type: PieceType.KNIGHT, side: PlayerSide.BLACK },
  12: { type: PieceType.ROOK, side: PlayerSide.BLACK },
  13: { type: PieceType.CANNON, side: PlayerSide.BLACK },
  14: { type: PieceType.PAWN, side: PlayerSide.BLACK },
};

const STRAIGHT_LINE_PIECES = new Set<PieceType>([
  PieceType.ROOK, PieceType.CANNON, PieceType.PAWN, PieceType.KING,
]);

function parseNumeral(char: string): number {
  if (char in CHINESE_NUMERAL_MAP) {
    return CHINESE_NUMERAL_MAP[char];
  }
  return parseInt(char, 10);
}

function isChineseNumeral(char: string): boolean {
  return char in CHINESE_NUMERAL_MAP;
}

/**
 * Convert a column number (1-9) in a player's notation to internal col index.
 * Red counts right-to-left: 一=col8, 九=col0  →  col = 9 - num
 * Black counts left-to-right: 1=col0, 9=col8 →  col = num - 1
 */
function colNumberToIndex(num: number, side: PlayerSide): number {
  return side === PlayerSide.RED ? 9 - num : num - 1;
}

function findPieceOnColumn(
  board: number[][],
  pieceType: PieceType,
  side: PlayerSide,
  col: number,
): { row: number; col: number } | null {
  for (let row = 0; row < board.length; row++) {
    const code = board[row]?.[col];
    if (!code) continue;
    const info = CODE_PIECE_MAP[code];
    if (info && info.type === pieceType && info.side === side) {
      return { row, col };
    }
  }
  return null;
}

function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row <= 9 && col >= 0 && col <= 8;
}

function parseStandardNotation(text: string, board: number[][]): ParsedChessMove | null {
  const match = text.match(
    /([车車馬马砲炮兵卒仕士相象帅将])([一二三四五六七八九123456789])([进退平])([一二三四五六七八九123456789])/,
  );
  if (!match) return null;

  const [, pieceChar, colStr, direction, targetStr] = match;
  const pieceInfo = PIECE_CHAR_MAP[pieceChar];
  if (!pieceInfo) return null;

  // Determine side: piece-specific character takes priority, then numeral type
  let side = pieceInfo.side;
  if (!side) {
    side = isChineseNumeral(colStr) ? PlayerSide.RED : PlayerSide.BLACK;
  }

  const colNum = parseNumeral(colStr);
  const sourceCol = colNumberToIndex(colNum, side);

  const sourcePos = findPieceOnColumn(board, pieceInfo.type, side, sourceCol);
  if (!sourcePos) return null;

  const targetNum = parseNumeral(targetStr);
  let targetRow: number;
  let targetCol: number;

  if (direction === '平') {
    targetRow = sourcePos.row;
    targetCol = colNumberToIndex(targetNum, side);
  } else if (STRAIGHT_LINE_PIECES.has(pieceInfo.type)) {
    targetCol = sourcePos.col;
    const steps = targetNum;
    const isForward = direction === '进';
    if (side === PlayerSide.RED) {
      targetRow = isForward ? sourcePos.row - steps : sourcePos.row + steps;
    } else {
      targetRow = isForward ? sourcePos.row + steps : sourcePos.row - steps;
    }
  } else {
    // Diagonal piece: last digit is the target column name
    targetCol = colNumberToIndex(targetNum, side);
    const absColDiff = Math.abs(targetCol - sourcePos.col);
    const isForward = direction === '进';

    let rowOffset: number;
    switch (pieceInfo.type) {
      case PieceType.KNIGHT:
        rowOffset = absColDiff === 1 ? 2 : 1;
        break;
      case PieceType.ELEPHANT:
        rowOffset = 2;
        break;
      case PieceType.ADVISOR:
        rowOffset = 1;
        break;
      default:
        return null;
    }

    if (side === PlayerSide.RED) {
      targetRow = isForward ? sourcePos.row - rowOffset : sourcePos.row + rowOffset;
    } else {
      targetRow = isForward ? sourcePos.row + rowOffset : sourcePos.row - rowOffset;
    }
  }

  if (!isInBounds(targetRow, targetCol)) return null;

  // Verify source has a piece
  const sourceCode = board[sourcePos.row]?.[sourcePos.col];
  if (!sourceCode) return null;

  return {
    from: { row: sourcePos.row, col: sourcePos.col },
    to: { row: targetRow, col: targetCol },
    notation: match[0],
    confidence: 1.0,
  };
}

function parseCoordinateFormat(text: string, board: number[][]): ParsedChessMove | null {
  const match = text.match(
    /\(?\s*(\d)\s*,\s*(\d)\s*\)?\s*[-到至>]\s*\(?\s*(\d)\s*,\s*(\d)\s*\)?/,
  );
  if (!match) return null;

  const fromRow = parseInt(match[1], 10);
  const fromCol = parseInt(match[2], 10);
  const toRow = parseInt(match[3], 10);
  const toCol = parseInt(match[4], 10);

  if (!isInBounds(fromRow, fromCol) || !isInBounds(toRow, toCol)) return null;

  const sourceCode = board[fromRow]?.[fromCol];
  if (!sourceCode) return null;

  return {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    notation: `${fromRow},${fromCol}-${toRow},${toCol}`,
    confidence: 0.9,
  };
}

/**
 * Parse a chess move from user text input.
 *
 * @param text   Raw user input (may contain the move anywhere in the string)
 * @param board  Current board as numeric code matrix (board[row][col], codes 0-14)
 * @returns Parsed move, or null when the text is not a recognised move instruction
 */
export function parseChessMoveText(
  text: string,
  board: number[][],
): ParsedChessMove | null {
  if (!text || !board) return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  const standard = parseStandardNotation(trimmed, board);
  if (standard) return standard;

  const coord = parseCoordinateFormat(trimmed, board);
  if (coord) return coord;

  return null;
}
