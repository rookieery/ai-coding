/**
 * Chinese Chess (Xiangqi) Board Prompt Utilities
 * Converts 10x9 numeric board to ASCII visualization and assembles LLM prompts
 *
 * Piece encoding (0-14):
 *   0 = Empty
 *   1 = Red King (帅)    8  = Black King (将)
 *   2 = Red Advisor (仕) 9  = Black Advisor (士)
 *   3 = Red Elephant (相) 10 = Black Elephant (象)
 *   4 = Red Horse (马)    11 = Black Horse (马)
 *   5 = Red Chariot (车)  12 = Black Chariot (车)
 *   6 = Red Cannon (炮)   13 = Black Cannon (炮)
 *   7 = Red Pawn (兵)     14 = Black Pawn (卒)
 */

import type { ChessCandidateMove, ChessPlayerColor } from '../types/chess-llm.types';

/** Piece code to display character mapping */
const PIECE_CHARS: Record<number, string> = {
  0: '·',
  1: '帅', 2: '仕', 3: '相', 4: '马', 5: '车', 6: '炮', 7: '兵',
  8: '将', 9: '士', 10: '象', 11: '馬', 12: '車', 13: '砲', 14: '卒',
};

/** Column labels a-i */
const COL_LABELS = 'abcdefghi';

/** Material values for scoring */
const MATERIAL_VALUES: Record<number, number> = {
  1: 10000,  // King - invaluable, used for priority only
  2: 200,    // Advisor
  3: 200,    // Elephant
  4: 400,    // Horse
  5: 900,    // Chariot
  6: 450,    // Cannon
  7: 100,    // Pawn (base value, +100 after crossing river)
  8: 10000,  // King
  9: 200,    // Advisor
  10: 200,   // Elephant
  11: 400,   // Horse
  12: 900,   // Chariot
  13: 450,   // Cannon
  14: 100,   // Pawn (base value, +100 after crossing river)
};

/** Piece names for display */
const PIECE_NAMES: Record<number, string> = {
  1: '帅', 2: '仕', 3: '相', 4: '马', 5: '车', 6: '炮', 7: '兵',
  8: '将', 9: '士', 10: '象', 11: '马', 12: '车', 13: '炮', 14: '卒',
};

function isRedPiece(code: number): boolean {
  return code >= 1 && code <= 7;
}

function isBlackPiece(code: number): boolean {
  return code >= 8 && code <= 14;
}

/**
 * Convert 10x9 numeric board to human-readable ASCII visualization
 * Red pieces use standard Chinese characters, Black pieces use variant characters
 */
export function boardToAscii(board: number[][]): string {
  const colHeader = '   ' + COL_LABELS.split('').join(' ');
  const separator = '   ' + '─'.repeat(17);

  const river = '   ' + ' '.repeat(3) + '楚 河          汉 界' + ' '.repeat(3);

  const rows: string[] = [];
  for (let r = 0; r < 10; r++) {
    const rowNum = r.toString();
    const cells = board[r].map(code => {
      const ch = PIECE_CHARS[code] || '·';
      return ch;
    }).join(' ');
    rows.push(`${rowNum}│ ${cells}`);

    if (r === 4) {
      rows.push(river);
    }
  }

  return [colHeader, separator, ...rows, separator].join('\n');
}

/**
 * Generate material analysis text comparing red and black forces
 */
export function getMaterialAnalysis(board: number[][]): string {
  let redScore = 0;
  let blackScore = 0;
  const redPieces: Record<string, number> = {};
  const blackPieces: Record<string, number> = {};

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const code = board[r][c];
      if (code === 0) continue;

      const name = PIECE_NAMES[code];
      let value = MATERIAL_VALUES[code];

      // Pawn bonus for crossing river
      if (code === 7 && r >= 5) {
        value += 100;
      } else if (code === 14 && r <= 4) {
        value += 100;
      }

      if (isRedPiece(code)) {
        redScore += value;
        redPieces[name] = (redPieces[name] || 0) + 1;
      } else if (isBlackPiece(code)) {
        blackScore += value;
        blackPieces[name] = (blackPieces[name] || 0) + 1;
      }
    }
  }

  // Exclude king value from display score
  const redDisplay = redScore - (redPieces['帅'] || 0) * 10000;
  const blackDisplay = blackScore - (blackPieces['将'] || 0) * 10000;

  const redList = Object.entries(redPieces)
    .map(([name, count]) => `${name}×${count}`)
    .join(' ');
  const blackList = Object.entries(blackPieces)
    .map(([name, count]) => `${name}×${count}`)
    .join(' ');

  const diff = redDisplay - blackDisplay;
  let advantage = '势均力敌';
  if (diff > 300) advantage = '红方子力优势明显';
  else if (diff > 100) advantage = '红方子力略优';
  else if (diff < -300) advantage = '黑方子力优势明显';
  else if (diff < -100) advantage = '黑方子力略优';

  return [
    `红方子力(${redDisplay}分): ${redList}`,
    `黑方子力(${blackDisplay}分): ${blackList}`,
    `子力对比: ${advantage}`,
  ].join('\n');
}

/**
 * Build the complete system prompt for LLM chess move generation
 */
export function buildChessSystemPrompt(
  board: number[][],
  currentPlayer: ChessPlayerColor,
  candidates: ChessCandidateMove[]
): string {
  const boardAscii = boardToAscii(board);
  const materialAnalysis = getMaterialAnalysis(board);
  const playerSide = currentPlayer === 'red' ? '红方' : '黑方';

  const candidateList = candidates
    .slice(0, 15)
    .map((c, idx) => {
      const fromCol = COL_LABELS[c.from.col];
      const toCol = COL_LABELS[c.to.col];
      return `${idx + 1}. (${c.from.row},${fromCol})→(${c.to.row},${toCol}) 评分:${c.score} - ${c.reason}`;
    })
    .join('\n');

  return `你是一位中国象棋特级大师，拥有深厚的开局、中局、残局理论功底，精通各种攻杀技巧和防守阵型。

## 当前棋盘局势

${boardAscii}

## 子力对比分析

${materialAnalysis}

## 当前行棋方: ${playerSide}

## 候选走法列表 (Top ${Math.min(candidates.length, 15)})

${candidateList}

## 策略指导

1. **优先级排序**: 将军/应将 > 攻防要点 > 子力交换 > 阵型调整
2. **攻防原则**:
   - 发现绝杀机会时果断出击，不要犹豫
   - 己方被将军时必须应将，优先吃掉将军棋子
   - 注意保护将/帅安全，避免暴露在对方攻击线下
   - 关注子力交换得失，优则交换，劣则规避
3. **战术手法**: 善用抽将、闪击、牵制、兑子、腾挪、拦截、堵路等战术
4. **术语要求**: 使用中国象棋标准术语描述走法和局势

## 输出格式要求

你必须严格按照以下JSON格式输出，不要输出任何其他内容:
{
  "move": { "from": { "row": 行号, "col": 列号 }, "to": { "row": 行号, "col": 列号 } },
  "reason": "用一句话说明选择该走法的核心原因",
  "situationAnalysis": "用2-3句话分析当前局势和后续策略"
}

请仔细分析局势，从候选走法中选择最优的一步，输出JSON。`;
}
