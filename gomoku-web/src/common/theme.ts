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
  /** 中国象棋：红方背景颜色 */
  piecePrimary: string;
  /** 中国象棋：黑方背景颜色 */
  pieceSecondary: string;
  /** 中国象棋：红方文字颜色 */
  pieceTextPrimary: string;
  /** 中国象棋：黑方文字颜色 */
  pieceTextSecondary: string;
  /** 五子棋：黑棋背景颜色 */
  gomokuBlack: string;
  /** 五子棋：白棋背景颜色 */
  gomokuWhite: string;
  /** 五子棋：黑棋文字颜色 */
  gomokuBlackText: string;
  /** 五子棋：白棋文字颜色 */
  gomokuWhiteText: string;
  /** 主要文字颜色 - 对应 Tailwind 文字类 */
  textPrimary: string;
  /** 次要文字颜色 - 对应 Tailwind 文字类 */
  textSecondary: string;
  /** 河流文字颜色 - 对应 Tailwind 文字类，与线条颜色保持一致 */
  riverTextColor: string;
}

export const themes: Record<ThemeKey, ThemeColors> = {
  default: {
    boardBackground: 'bg-[#F3E5AB] dark:bg-[#D4B483]',
    lineColor: 'border-[#5C4033]',
    lineBackground: 'bg-[#5C4033]/60',
    piecePrimary: 'bg-red-700 dark:bg-red-500',
    pieceSecondary: 'bg-gray-900 dark:bg-gray-700',
    pieceTextPrimary: '!text-white',
    pieceTextSecondary: '!text-gray-200',
    gomokuBlack: 'bg-[#1A1A1A] dark:bg-[#2D2D2D]',
    gomokuWhite: 'bg-white dark:bg-gray-100',
    gomokuBlackText: '!text-white',
    gomokuWhiteText: '!text-gray-800',
    textPrimary: 'text-gray-800 dark:text-gray-200',
    textSecondary: 'text-gray-500 dark:text-gray-400',
    riverTextColor: 'text-[#5C4033]',
  },
  zen: {
    boardBackground: 'bg-[#E8DCC4] dark:bg-[#C4B59A]',
    lineColor: 'border-[#5C4033]',
    lineBackground: 'bg-[#5C4033]/60',
    piecePrimary: 'bg-amber-700 dark:bg-amber-500',
    pieceSecondary: 'bg-stone-900 dark:bg-stone-700',
    pieceTextPrimary: '!text-white',
    pieceTextSecondary: '!text-stone-200',
    gomokuBlack: 'bg-[#1A1A1A] dark:bg-[#2D2D2D]',
    gomokuWhite: 'bg-[#F5F5F0] dark:bg-[#E8E4D9]',
    gomokuBlackText: '!text-white',
    gomokuWhiteText: '!text-gray-800',
    textPrimary: 'text-gray-800 dark:text-gray-200',
    textSecondary: 'text-gray-500 dark:text-gray-400',
    riverTextColor: 'text-[#5C4033]',
  },
  cyber: {
    boardBackground: 'bg-[#0F172A] dark:bg-[#020617]',
    lineColor: 'border-[#06B6D4]',
    lineBackground: 'bg-[#06B6D4]/30',
    piecePrimary: 'bg-[#F43F5E] dark:bg-[#F43F5E]',
    pieceSecondary: 'bg-[#2DD4BF] dark:bg-[#2DD4BF]',
    pieceTextPrimary: '!text-white drop-shadow-md',
    pieceTextSecondary: '!text-white drop-shadow-md',
    gomokuBlack: 'bg-[#2DD4BF] dark:bg-[#2DD4BF]',
    gomokuWhite: 'bg-[#F43F5E] dark:bg-[#F43F5E]',
    gomokuBlackText: '!text-white',
    gomokuWhiteText: '!text-white',
    textPrimary: 'text-slate-300 dark:text-slate-200',
    textSecondary: 'text-slate-500 dark:text-slate-400',
    riverTextColor: 'text-[#06B6D4]',
  },
  minimal: {
    boardBackground: 'bg-[#F9FAFB] dark:bg-[#D1D5DB]',
    lineColor: 'border-[#9CA3AF]',
    lineBackground: 'bg-[#9CA3AF]/60',
    piecePrimary: 'bg-rose-700 dark:bg-rose-500',
    pieceSecondary: 'bg-slate-900 dark:bg-slate-700',
    pieceTextPrimary: '!text-white',
    pieceTextSecondary: '!text-slate-200',
    gomokuBlack: 'bg-[#1A1A1A] dark:bg-[#2D2D2D]',
    gomokuWhite: 'bg-white dark:bg-gray-50',
    gomokuBlackText: '!text-white',
    gomokuWhiteText: '!text-gray-800',
    textPrimary: 'text-gray-700 dark:text-gray-200',
    textSecondary: 'text-gray-500 dark:text-gray-400',
    riverTextColor: 'text-[#9CA3AF]',
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