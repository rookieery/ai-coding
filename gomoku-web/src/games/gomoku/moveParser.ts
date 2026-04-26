const BOARD_SIZE = 15;

export interface ParsedMove {
  r: number;
  c: number;
  coord: string;
}

/**
 * Parses move text like 'H8', 'h8', '落子 h8', '下 H8' into board coordinates.
 * - Letter A-O maps to column index (A=0, O=14)
 * - Number 1-15 maps to row index with formula: r = 15 - number
 *
 * @param text - The input text to parse
 * @returns ParsedMove object with r, c, coord or null if no valid coordinate found
 */
export function parseMoveText(text: string): ParsedMove | null {
  const trimmed = text.trim();

  // Regex matches:
  // - Optional Chinese prefix like "落子" or "下"
  // - Letter A-O (case insensitive)
  // - Number 1-15 (with word boundary to prevent matching 16, 17, etc.)
  const regex = /(?:落子|下)?\s*([A-Oa-o])\s*(1[0-5]|[1-9])\b/;
  const match = trimmed.match(regex);

  if (!match) {
    return null;
  }

  const letter = match[1].toUpperCase();
  const number = parseInt(match[2], 10);

  // Map letter to column index (A=0, O=14)
  const c = letter.charCodeAt(0) - 'A'.charCodeAt(0);

  // Map number to row index: r = 15 - number
  const r = BOARD_SIZE - number;

  // Validate bounds
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
    return null;
  }

  const coord = `${letter}${number}`;

  return { r, c, coord };
}
