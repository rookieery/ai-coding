/**
 * 中国象棋标准记谱法 (Notation Generator)
 * 将坐标移动转换为“炮二平五”、“马八进七”等标准中文术语。
 * 处理红黑方差异。
 */

import {
  MoveHistory,
  PlayerSide,
  PieceType,
  BoardCoord,
} from './types';

/**
 * 红方列坐标映射：红方使用中文数字，从右到左
 * 内部列坐标 col (0-8) -> 红方视角列号 (1-9)，其中 col=0 对应“九”，col=8 对应“一”
 */
const RED_COLUMN_NAMES = ['九', '八', '七', '六', '五', '四', '三', '二', '一'];

/**
 * 黑方列坐标映射：黑方使用阿拉伯数字，从左到右
 * 内部列坐标 col (0-8) -> 黑方视角列号 (1-9)，其中 col=0 对应“1”，col=8 对应“9”
 */
const BLACK_COLUMN_NAMES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * 棋子类型到 i18n 翻译键的映射
 */
const PIECE_I18N_KEYS: Record<PieceType, Record<PlayerSide, string>> = {
  [PieceType.KING]: {
    [PlayerSide.RED]: 'pieceRedKing',
    [PlayerSide.BLACK]: 'pieceBlackKing',
  },
  [PieceType.ADVISOR]: {
    [PlayerSide.RED]: 'pieceRedAdvisor',
    [PlayerSide.BLACK]: 'pieceBlackAdvisor',
  },
  [PieceType.ELEPHANT]: {
    [PlayerSide.RED]: 'pieceRedElephant',
    [PlayerSide.BLACK]: 'pieceBlackElephant',
  },
  [PieceType.KNIGHT]: {
    [PlayerSide.RED]: 'pieceRedKnight',
    [PlayerSide.BLACK]: 'pieceBlackKnight',
  },
  [PieceType.ROOK]: {
    [PlayerSide.RED]: 'pieceRedRook',
    [PlayerSide.BLACK]: 'pieceBlackRook',
  },
  [PieceType.CANNON]: {
    [PlayerSide.RED]: 'pieceRedCannon',
    [PlayerSide.BLACK]: 'pieceBlackCannon',
  },
  [PieceType.PAWN]: {
    [PlayerSide.RED]: 'pieceRedPawn',
    [PlayerSide.BLACK]: 'pieceBlackPawn',
  },
};

/**
 * 根据玩家方和列坐标获取列名称
 */
function getColumnName(col: number, side: PlayerSide): string {
  return side === PlayerSide.RED ? RED_COLUMN_NAMES[col] : BLACK_COLUMN_NAMES[col];
}

/**
 * 根据玩家方和列名称获取列坐标（反向查找）
 */
function getColumnFromName(colName: string, side: PlayerSide): number {
  if (side === PlayerSide.RED) {
    return RED_COLUMN_NAMES.indexOf(colName);
  } else {
    return BLACK_COLUMN_NAMES.indexOf(colName);
  }
}

/**
 * 判断移动方向
 * @param from 起始坐标
 * @param to 目标坐标
 * @param side 移动方（棋子所属方）
 * @returns '进'（forward）、'退'（backward）或 '平'（horizontal）
 */
function getMoveDirection(from: BoardCoord, to: BoardCoord, side: PlayerSide): '进' | '退' | '平' {
  const rowDiff = to.row - from.row;

  if (rowDiff === 0) {
    // 横向移动
    return '平';
  } else {
    // 纵向移动（包括斜向）
    // 红方向前是 row 减小（向棋盘顶部），黑方向前是 row 增加（向棋盘底部）
    const isForward = (side === PlayerSide.RED && rowDiff < 0) || (side === PlayerSide.BLACK && rowDiff > 0);
    return isForward ? '进' : '退';
  }
}

/**
 * 获取移动距离描述
 * 对于纵向移动，如果起始列和目标列相同，返回步数（行变化的绝对值）
 * 如果列不同，返回目标列名称
 * 对于横向移动，返回目标列名称
 */
function getMoveDistanceDescription(
  from: BoardCoord,
  to: BoardCoord,
  side: PlayerSide,
  direction: '进' | '退' | '平'
): string {
  if (direction === '平') {
    // 横向移动：目标列名称
    return getColumnName(to.col, side);
  } else {
    // 纵向移动
    if (from.col === to.col) {
      // 同列纵向移动：返回步数（行变化的绝对值）
      const steps = Math.abs(to.row - from.row);
      // 步数使用数字表示（1-9），对于红方可能需要中文数字？实际上步数通常用阿拉伯数字
      return steps.toString();
    } else {
      // 不同列纵向移动（如马、象的斜向移动）：返回目标列名称
      return getColumnName(to.col, side);
    }
  }
}

/**
 * 将移动记录转换为标准记谱字符串（包含翻译键）
 * @param move 移动记录
 * @param boardState 棋盘状态（用于同列棋子区分，可选）
 * @returns 标准记谱字符串，如“pieceRedCannon八平五”
 */
export function moveToNotation(move: MoveHistory, boardState?: any): string {
  const { from, to, piece, side } = move;

  // 获取棋子翻译键
  const pieceKey = PIECE_I18N_KEYS[piece][side];

  // 获取起始列名称
  const startColName = getColumnName(from.col, side);

  // 获取移动方向
  const direction = getMoveDirection(from, to, side);

  // 获取移动距离描述
  const distanceDesc = getMoveDistanceDescription(from, to, side, direction);

  // 标准格式：棋子翻译键 + 起始列 + 方向 + 距离描述
  return `${pieceKey}${startColName}${direction}${distanceDesc}`;
}

/**
 * 将移动记录转换为显示用的记谱字符串（已翻译棋子）
 * @param move 移动记录
 * @param t i18n 翻译函数
 * @param boardState 棋盘状态（用于同列棋子区分，可选）
 * @returns 已翻译的记谱字符串，如“炮八平五”
 */
export function moveToDisplayNotation(
  move: MoveHistory,
  t: (key: string) => string,
  boardState?: any
): string {
  const { from, to, piece, side } = move;

  // 获取棋子显示字符
  const pieceChar = t(PIECE_I18N_KEYS[piece][side]);

  // 获取起始列名称
  const startColName = getColumnName(from.col, side);

  // 获取移动方向
  const direction = getMoveDirection(from, to, side);

  // 获取移动距离描述
  const distanceDesc = getMoveDistanceDescription(from, to, side, direction);

  // 标准格式：棋子字符 + 起始列 + 方向 + 距离描述
  return `${pieceChar}${startColName}${direction}${distanceDesc}`;
}

/**
 * 批量转换移动历史为记谱列表
 */
export function movesToNotations(moveHistory: MoveHistory[], boardStates?: any[]): string[] {
  return moveHistory.map((move, index) => {
    const boardState = boardStates?.[index];
    return moveToNotation(move, boardState);
  });
}

/**
 * 获取棋子显示字符（用于在记谱中直接显示棋子，而不是翻译键）
 * 注意：这需要依赖 i18n 的 t() 函数，所以只能在 Vue 组件中使用
 * 这里提供一个工具函数，接收 t 函数作为参数
 */
export function getPieceDisplayChar(pieceType: PieceType, side: PlayerSide, t: (key: string) => string): string {
  const key = PIECE_I18N_KEYS[pieceType][side];
  return t(key);
}