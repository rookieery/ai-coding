/**
 * 主题配置定义
 * 四种主题：default（经典默认）、zen（墨韵檀香）、cyber（赛博弈域）、minimal（极简奢华）
 * 每种主题提供语义化的颜色类名，供棋盘和棋子使用
 */

export type ThemeKey = 'default' | 'zen' | 'cyber' | 'minimal';

export interface ThemeColors {
  /** 棋盘背景色 - 对应 Tailwind 背景类 */
  boardBackground: string;
  /** 棋盘线条色 - 对应 Tailwind 边框类 */
  lineColor: string;
  /** 棋盘线条背景色（用于交叉线） - 对应 Tailwind 背景类 */
  lineBackground: string;
  /** 棋子主色（如五子棋黑子、象棋红子） - 对应 Tailwind 文字/背景类 */
  piecePrimary: string;
  /** 棋子次色（如五子棋白子、象棋黑子） - 对应 Tailwind 文字/背景类 */
  pieceSecondary: string;
  /** 主要文字颜色 - 对应 Tailwind 文字类 */
  textPrimary: string;
  /** 次要文字颜色 - 对应 Tailwind 文字类 */
  textSecondary: string;
}

export const themes: Record<ThemeKey, ThemeColors> = {
  default: {
    boardBackground: 'bg-stone-100 dark:bg-stone-900',
    lineColor: 'border-stone-300 dark:border-stone-700',
    lineBackground: 'bg-stone-300/60 dark:bg-stone-700/60',
    piecePrimary: 'bg-stone-900 dark:bg-stone-100',
    pieceSecondary: 'bg-stone-500 dark:bg-stone-400',
    textPrimary: 'text-stone-800 dark:text-stone-200',
    textSecondary: 'text-stone-500 dark:text-stone-500',
  },
  zen: {
    boardBackground: 'bg-amber-50 dark:bg-amber-950',
    lineColor: 'border-amber-300 dark:border-amber-800',
    lineBackground: 'bg-amber-300/60 dark:bg-amber-800/60',
    piecePrimary: 'bg-amber-900 dark:bg-amber-200',
    pieceSecondary: 'bg-amber-700 dark:bg-amber-400',
    textPrimary: 'text-amber-800 dark:text-amber-300',
    textSecondary: 'text-amber-600 dark:text-amber-500',
  },
  cyber: {
    boardBackground: 'bg-slate-900 dark:bg-slate-950',
    lineColor: 'border-slate-600 dark:border-slate-500',
    lineBackground: 'bg-slate-600/60 dark:bg-slate-500/60',
    piecePrimary: 'bg-cyan-400 dark:bg-cyan-300',
    pieceSecondary: 'bg-purple-400 dark:bg-purple-300',
    textPrimary: 'text-slate-300 dark:text-slate-200',
    textSecondary: 'text-slate-500 dark:text-slate-400',
  },
  minimal: {
    boardBackground: 'bg-gray-200 dark:bg-gray-800',
    lineColor: 'border-gray-400 dark:border-gray-600',
    lineBackground: 'bg-gray-400/60 dark:bg-gray-600/60',
    piecePrimary: 'bg-gray-800 dark:bg-gray-300',
    pieceSecondary: 'bg-gray-600 dark:bg-gray-400',
    textPrimary: 'text-gray-700 dark:text-gray-300',
    textSecondary: 'text-gray-500 dark:text-gray-500',
  },
};

/**
 * 获取指定主题的颜色配置
 */
export function getThemeColors(theme: ThemeKey): ThemeColors {
  const colors = themes[theme];
  if (!colors) {
    console.warn(`Invalid theme key: ${theme}, falling back to default`);
    return themes.default;
  }
  return colors;
}

/**
 * 获取当前主题的 CSS 类字符串，用于动态绑定 class
 * @param theme 主题键
 * @param colorKey 颜色键
 * @returns 对应的 Tailwind 类名
 */
export function getThemeClass(theme: ThemeKey, colorKey: keyof ThemeColors): string {
  return themes[theme][colorKey];
}