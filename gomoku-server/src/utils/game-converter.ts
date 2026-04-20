import { Move } from '../types';

/**
 * 前端移动数据格式
 */
export interface FrontendMove {
  r: number;      // 行 (row)
  c: number;      // 列 (column)
  player: number; // 1=黑, 2=白
}

/**
 * 前端棋谱数据格式
 */
export interface FrontendGame {
  id: string;
  name: string;
  board: number[][];
  moveHistory: FrontendMove[];
  timestamp: number;
  mode: 'pvp' | 'pve';
  aiDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'neural';
  aiRole: 'first' | 'second';
  ruleMode: 'standard' | 'renju';
  isPublic?: boolean;
  gameType?: 'gomoku' | 'chinese_chess';
}

/**
 * 将前端移动格式转换为后端移动格式
 */
export function frontendMoveToBackendMove(
  move: FrontendMove,
  step: number
): Move {
  return {
    x: move.c,  // 前端c=列 -> 后端x
    y: move.r,  // 前端r=行 -> 后端y
    color: move.player === 1 ? 'black' : 'white',
    step,
    timestamp: Date.now(),
  };
}

/**
 * 将后端移动格式转换为前端移动格式
 */
export function backendMoveToFrontendMove(move: Move): FrontendMove {
  return {
    r: move.y,  // 后端y -> 前端r
    c: move.x,  // 后端x -> 前端c
    player: move.color === 'black' ? 1 : 2,
  };
}

/**
 * 根据移动历史重建棋盘状态
 */
export function rebuildBoardFromMoves(
  moves: FrontendMove[],
  boardSize: number = 15
): number[][] {
  const board = Array.from({ length: boardSize }, () =>
    Array(boardSize).fill(0)
  );

  moves.forEach(move => {
    if (move.r >= 0 && move.r < boardSize &&
        move.c >= 0 && move.c < boardSize) {
      board[move.r][move.c] = move.player;
    }
  });

  return board;
}

/**
 * 将前端棋谱转换为后端棋谱数据
 */
export function frontendGameToBackendData(
  frontendGame: FrontendGame,
  _includeBoard: boolean = false
): {
  title: string;
  description?: string;
  boardSize: number;
  moves: Move[];
  result?: 'black_win' | 'white_win' | 'draw';
  playerBlack?: string;
  playerWhite?: string;
  isPublic: boolean;
  gameType: 'gomoku' | 'chinese_chess';
  tags: string[];
  metadata?: Record<string, unknown>;
} {
  const moves = frontendGame.moveHistory.map((move, index) =>
    frontendMoveToBackendMove(move, index + 1)
  );

  // 确定结果（如果有赢家）
  let result: 'black_win' | 'white_win' | 'draw' | undefined;
  const lastMove = frontendGame.moveHistory[frontendGame.moveHistory.length - 1];
  if (lastMove) {
    // 简化：假设最后一步的玩家赢了（实际需要检查五连珠）
    result = lastMove.player === 1 ? 'black_win' : 'white_win';
  }

  // 生成标签
  const tags: string[] = [];
  if (frontendGame.mode === 'pve') {
    tags.push('human-vs-ai');
    tags.push(`ai-difficulty:${frontendGame.aiDifficulty}`);
    tags.push(`ai-role:${frontendGame.aiRole}`);
  } else {
    tags.push('human-vs-human');
  }
  tags.push(`rule-mode:${frontendGame.ruleMode}`);

  return {
    title: frontendGame.name,
    description: `Game created at ${new Date(frontendGame.timestamp).toISOString()}`,
    boardSize: 15,
    moves,
    result,
    playerBlack: frontendGame.mode === 'pve' && frontendGame.aiRole === 'first' ? 'AI' : 'Player1',
    playerWhite: frontendGame.mode === 'pve' && frontendGame.aiRole === 'second' ? 'AI' : 'Player2',
    isPublic: frontendGame.isPublic ?? false,
    gameType: frontendGame.gameType || 'gomoku',
    tags,
    metadata: {
      frontendFormat: true,
      mode: frontendGame.mode,
      aiDifficulty: frontendGame.aiDifficulty,
      aiRole: frontendGame.aiRole,
      ruleMode: frontendGame.ruleMode,
      originalTimestamp: frontendGame.timestamp,
      isPublic: frontendGame.isPublic ?? false,
    },
  };
}

/**
 * 将后端棋谱转换为前端棋谱格式
 */
export function backendGameToFrontendGame(
  backendGame: Record<string, unknown>,
  id: string
): FrontendGame {
  const rawMoves = Array.isArray(backendGame.moves)
    ? backendGame.moves
    : [];
  const moves = rawMoves.map((move: unknown) => backendMoveToFrontendMove(move as Move));

  const metadata = (backendGame.metadata as Record<string, unknown>) || {};

  return {
    id,
    name: backendGame.title as string,
    board: rebuildBoardFromMoves(moves, backendGame.boardSize as number),
    moveHistory: moves,
    timestamp: (metadata.originalTimestamp as number) || (backendGame.createdAt as Date)?.getTime() || Date.now(),
    mode: (metadata.mode as FrontendGame['mode']) || 'pvp',
    aiDifficulty: (metadata.aiDifficulty as FrontendGame['aiDifficulty']) || 'intermediate',
    aiRole: (metadata.aiRole as FrontendGame['aiRole']) || 'second',
    ruleMode: (metadata.ruleMode as FrontendGame['ruleMode']) || 'standard',
    isPublic: (metadata.isPublic as boolean) ?? (backendGame.isPublic as boolean) ?? false,
    gameType: (backendGame.gameType as FrontendGame['gameType']) || 'gomoku',
  };
}

/**
 * 将前端游戏状态转换为移动历史
 */
export function getMovesFromBoard(board: number[][]): FrontendMove[] {
  const moves: FrontendMove[] = [];
  const boardSize = board.length;

  // 简化实现：遍历棋盘找出所有棋子
  // 注意：这不会保持正确的移动顺序，实际应用中需要额外的顺序信息
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] !== 0) {
        moves.push({ r, c, player: board[r][c] });
      }
    }
  }

  // 按某种逻辑排序（例如，假设从中心向外）
  moves.sort((a, b) => {
    const distA = Math.abs(a.r - 7) + Math.abs(a.c - 7);
    const distB = Math.abs(b.r - 7) + Math.abs(b.c - 7);
    return distA - distB;
  });

  return moves;
}