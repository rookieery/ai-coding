/**
 * Board Prompt Utilities for LLM AI Service
 * Converts Gomoku board state to ASCII matrix and assembles LLM prompts
 */

import {
  BoardState,
  PlayerColor,
  MoveHistoryEntry,
  LLMMoveRequest,
} from '../types/llm.types';

/**
 * Column labels for coordinate notation (A-O for 15x15 board)
 */
const COLUMN_LABELS = 'ABCDEFGHIJKLMNO';

/**
 * Convert numeric board (0/1/2) to ASCII board (./X/O)
 * @param numericBoard - 15x15 array where 0=empty, 1=black, 2=white
 * @returns BoardState - 15x15 array of 'X', 'O', or '.'
 */
export function numericToAsciiBoard(numericBoard: number[][]): BoardState {
  return numericBoard.map(row =>
    row.map(cell => {
      if (cell === 1) return 'X';
      if (cell === 2) return 'O';
      return '.';
    })
  );
}

/**
 * Convert ASCII board back to numeric format
 * @param asciiBoard - 15x15 array of 'X', 'O', or '.'
 * @returns number[][] - 15x15 array where 0=empty, 1=black, 2=white
 */
export function asciiToNumericBoard(asciiBoard: BoardState): number[][] {
  return asciiBoard.map(row =>
    row.map(cell => {
      if (cell === 'X') return 1;
      if (cell === 'O') return 2;
      return 0;
    })
  );
}

/**
 * Convert board state to ASCII string representation
 * Includes row numbers and column headers for better spatial perception
 * @param board - 15x15 ASCII board state
 * @returns Formatted ASCII string
 */
export function boardToAsciiString(board: BoardState): string {
  const header = '   ' + COLUMN_LABELS.split('').join(' ');
  const separator = '   ' + '-'.repeat(29);

  const rows = board.map((row, index) => {
    const rowNumber = (15 - index).toString().padStart(2, ' ');
    const cells = row.join(' ');
    return `${rowNumber}| ${cells}`;
  });

  return [header, separator, ...rows].join('\n');
}

/**
 * Convert numeric coordinates to algebraic notation (e.g., "H8")
 * @param x - Column index (0-14)
 * @param y - Row index (0-14)
 * @returns Coordinate string like "H8"
 */
export function coordinatesToNotation(x: number, y: number): string {
  const col = COLUMN_LABELS[x];
  const row = 15 - y;
  return `${col}${row}`;
}

/**
 * Convert algebraic notation to numeric coordinates
 * @param notation - Coordinate string like "H8"
 * @returns { x, y } or null if invalid
 */
export function notationToCoordinates(notation: string): { x: number; y: number } | null {
  if (!notation || notation.length < 2 || notation.length > 3) {
    return null;
  }

  const colChar = notation[0].toUpperCase();
  const rowStr = notation.slice(1);

  const x = COLUMN_LABELS.indexOf(colChar);
  const y = 15 - parseInt(rowStr, 10);

  if (x < 0 || x > 14 || isNaN(y) || y < 0 || y > 14) {
    return null;
  }

  return { x, y };
}

/**
 * Format move history for LLM context
 * @param history - Array of move history entries
 * @returns Formatted string of moves
 */
export function formatMoveHistory(history: MoveHistoryEntry[]): string {
  if (history.length === 0) {
    return 'No moves yet.';
  }

  return history
    .map((move, index) => {
      const color = move.color === 'black' ? 'Black(X)' : 'White(O)';
      return `${index + 1}. ${color} ${move.position}`;
    })
    .join('\n');
}

/**
 * Build the system prompt for LLM AI
 * @param request - LLM move request containing board state and context
 * @param candidates - Optional array of top candidate moves from heuristic analysis
 * @returns Complete system prompt string
 */
export function buildSystemPrompt(
  request: LLMMoveRequest,
  candidates?: Array<{ x: number; y: number; score: number; reason: string }>
): string {
  const { board, currentPlayer, history } = request;

  const boardAscii = boardToAsciiString(board);
  const moveHistoryStr = formatMoveHistory(history);
  const playerColor = currentPlayer === 'black' ? 'Black(X)' : 'White(O)';
  const opponentColor = currentPlayer === 'black' ? 'White(O)' : 'Black(X)';

  // Build candidate moves section if provided
  let candidatesSection = '';
  if (candidates && candidates.length > 0) {
    const candidateList = candidates
      .slice(0, 10)
      .map((c, idx) => {
        const notation = coordinatesToNotation(c.x, c.y);
        return `${idx + 1}. ${notation} (评分: ${c.score}) - ${c.reason}`;
      })
      .join('\n');
    candidatesSection = `
## 候选落子分析 (Candidate Moves)
经过启发式分析，以下是当前局面评分最高的前10个候选位置。你**必须从中选择一个**作为你的落子：

${candidateList}

**重要规则**：你的 "move" 字段必须是上述候选坐标之一。`;
  }

  return `You are an expert Gomoku (Five in a Row) player. Analyze the current board position and determine the best move.

## 棋型术语定义 (Pattern Terminology)
理解以下专业术语，按威胁等级从高到低排列：

| 棋型 | 英文名 | 描述 | 威胁等级 |
|------|--------|------|----------|
| 连五 | Five | 五子连珠，直接获胜 | ★★★★★ |
| 活四 | Live Four | 四子连线，两端开放，必胜棋型 | ★★★★☆ |
| 冲四 | Rush Four | 四子连线，一端被堵，需立即防守或进攻 | ★★★★ |
| 活三 | Live Three | 三子连线，两端开放，下一步可成活四 | ★★★ |
| 眠三 | Sleep Three | 三子连线，一端被堵，潜在威胁 | ★★ |
| 活二 | Live Two | 两子连线，两端开放，发展潜力 | ★ |

## 策略优先级 (Strategy Priority)
按照以下优先级进行决策：

1. **必胜检测**：己方能连五 → 立即落子获胜
2. **必防检测**：对手有冲四或活四 → 必须堵截
3. **进攻机会**：己方能构成活四或双三杀招 → 优先进攻
4. **防守需求**：对手有活三威胁 → 必须堵截
5. **布局发展**：无紧迫威胁时，选择扩展棋势的位置

**核心原则**：进攻优于防守，但必须优先处理对手的必杀威胁。

## Board State
The board is 15x15. X represents Black pieces, O represents White pieces, and . represents empty cells.
Columns are labeled A-O (left to right), rows are numbered 1-15 (bottom to top).

${boardAscii}

## Current Turn
You are playing as ${playerColor}. It is your turn to move.

## Move History
${moveHistoryStr}
${candidatesSection}

## Response Format (MANDATORY)
You MUST respond with valid JSON in this EXACT format:
{
  "situation_analysis": {
    "my_threats": ["描述己方当前威胁，如：我有活三在H8方向"],
    "opponent_threats": ["描述对手威胁，如：对手有冲四需要堵截"],
    "strategy": "简述你的策略选择：进攻/防守/布局"
  },
  "move": "H8",
  "candidate_index": 1,
  "reason": "简要说明选择该候选点的理由"
}

**字段说明**：
- \`situation_analysis\`：必填。先分析局势，再决定落子。
- \`move\`：必须是候选列表中的坐标，格式如 "H8"。
- \`candidate_index\`：你选择的候选点在列表中的序号(1-10)。
- \`reason\`：解释为何选择该候选点。

## Decision Process
Think step by step:
1. **局势扫描**：检查棋盘上所有连五、活四、冲四、活三棋型。
2. **威胁评估**：识别己方进攻机会和对手威胁。
3. **候选筛选**：从提供的候选列表中选择最优落子。
4. **输出响应**：按JSON格式输出分析结果和落子决定。

Remember: You are ${playerColor}. Your opponent (${opponentColor}) just moved. Analyze carefully and make your move now.`;
}

/**
 * Build a user prompt for the LLM
 * @param request - LLM move request
 * @returns User prompt string
 */
export function buildUserPrompt(request: LLMMoveRequest): string {
  const playerColor = request.currentPlayer === 'black' ? 'Black(X)' : 'White(O)';
  return `It is ${playerColor}'s turn. What is your move? Respond with JSON only.`;
}

/**
 * Create LLM request from frontend game state
 * @param board - Numeric board (0/1/2)
 * @param currentPlayer - Current player color
 * @param moveHistory - Array of frontend moves
 * @returns LLMMoveRequest object
 */
export function createLLMRequest(
  board: number[][],
  currentPlayer: PlayerColor,
  moveHistory: Array<{ r: number; c: number; player: number }>
): LLMMoveRequest {
  const asciiBoard = numericToAsciiBoard(board);

  const history: MoveHistoryEntry[] = moveHistory.map((move, index) => ({
    position: coordinatesToNotation(move.c, move.r),
    color: move.player === 1 ? 'black' : 'white',
    step: index + 1,
  }));

  return {
    board: asciiBoard,
    currentPlayer,
    history,
  };
}

/**
 * Get all empty positions on the board
 * @param board - ASCII board state
 * @returns Array of { x, y } coordinates for empty cells
 */
export function getEmptyPositions(board: BoardState): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === '.') {
        positions.push({ x, y });
      }
    }
  }

  return positions;
}

/**
 * Get a random empty position (fallback for invalid LLM responses)
 * @param board - ASCII board state
 * @returns Random empty position or null if board is full
 */
export function getRandomEmptyPosition(board: BoardState): { x: number; y: number } | null {
  const emptyPositions = getEmptyPositions(board);

  if (emptyPositions.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * emptyPositions.length);
  return emptyPositions[randomIndex];
}
