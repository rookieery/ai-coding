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
  /** 棋子背景色 - 对应 Tailwind 背景类 */
  pieceBackground: string;
  /** 棋子主色（红方背景颜色） - 对应 Tailwind 背景类 */
  piecePrimary: string;
  /** 棋子次色（黑方背景颜色） - 对应 Tailwind 背景类 */
  pieceSecondary: string;
  /** 棋子主文字颜色（红方文字颜色） - 对应 Tailwind 文字类 */
  pieceTextPrimary: string;
  /** 棋子次文字颜色（黑方文字颜色） - 对应 Tailwind 文字类 */
  pieceTextSecondary: string;
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
    pieceBackground: 'bg-white dark:bg-gray-800',
    piecePrimary: 'bg-[#1A1A1A] dark:bg-[#1A1A1A]',
    pieceSecondary: 'bg-white dark:bg-gray-100',
    pieceTextPrimary: '!text-white',
    pieceTextSecondary: '!text-gray-800',
    textPrimary: 'text-gray-800 dark:text-gray-200',
    textSecondary: 'text-gray-500 dark:text-gray-400',
    riverTextColor: 'text-[#5C4033]',
  },
  zen: {
    boardBackground: 'bg-[#E8DCC4] dark:bg-[#C4B59A]',
    lineColor: 'border-[#5C4033]',
    lineBackground: 'bg-[#5C4033]/60',
    pieceBackground: 'bg-white dark:bg-gray-800',
    piecePrimary: 'bg-[#1A1A1A] dark:bg-[#1A1A1A]',
    pieceSecondary: 'bg-[#F5F5F0] dark:bg-[#E8E4D9]',
    pieceTextPrimary: '!text-white',
    pieceTextSecondary: '!text-gray-800',
    textPrimary: 'text-gray-800 dark:text-gray-200',
    textSecondary: 'text-gray-500 dark:text-gray-400',
    riverTextColor: 'text-[#5C4033]',
  },
  cyber: {
    boardBackground: 'bg-[#0F172A] dark:bg-[#020617]',
    lineColor: 'border-[#06B6D4]',
    lineBackground: 'bg-[#06B6D4]/30',
    pieceBackground: 'bg-[#1E293B] dark:bg-[#0F172A]',
    piecePrimary: 'bg-[#F43F5E] dark:bg-[#F43F5E]',
    pieceSecondary: 'bg-[#2DD4BF] dark:bg-[#2DD4BF]',
    pieceTextPrimary: '!text-white drop-shadow-md',
    pieceTextSecondary: '!text-white drop-shadow-md',
    textPrimary: 'text-slate-300 dark:text-slate-200',
    textSecondary: 'text-slate-500 dark:text-slate-400',
    riverTextColor: 'text-[#06B6D4]',
  },
  minimal: {
    boardBackground: 'bg-[#F9FAFB] dark:bg-[#D1D5DB]',
    lineColor: 'border-[#9CA3AF]',
    lineBackground: 'bg-[#9CA3AF]/60',
    pieceBackground: 'bg-white dark:bg-gray-800',
    piecePrimary: 'bg-[#1F2937] dark:bg-[#1F2937]',
    pieceSecondary: 'bg-white dark:bg-gray-50',
    pieceTextPrimary: '!text-white',
    pieceTextSecondary: '!text-gray-800',
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