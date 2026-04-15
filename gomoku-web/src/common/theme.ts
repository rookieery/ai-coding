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
}

export const themes: Record<ThemeKey, ThemeColors> = {
  default: {
    boardBackground: 'bg-[#F3E5AB] dark:bg-[#F3E5AB]',
    lineColor: 'border-[#8B4513] dark:border-[#8B4513]',
    lineBackground: 'bg-[#8B4513]/60 dark:bg-[#8B4513]/60',
    pieceBackground: 'bg-white dark:bg-white',
    piecePrimary: 'bg-red-500/20 dark:bg-red-500/20',
    pieceSecondary: 'bg-gray-800/20 dark:bg-gray-800/20',
    pieceTextPrimary: 'text-red-600 dark:text-red-600',
    pieceTextSecondary: 'text-gray-900 dark:text-gray-900',
    textPrimary: 'text-gray-800 dark:text-gray-800',
    textSecondary: 'text-gray-500 dark:text-gray-500',
  },
  zen: {
    boardBackground: 'bg-[#E8DCC4] dark:bg-[#E8DCC4]',
    lineColor: 'border-[#5C4033] dark:border-[#5C4033]',
    lineBackground: 'bg-[#5C4033]/60 dark:bg-[#5C4033]/60',
    pieceBackground: 'bg-[#F5F5DC] dark:bg-[#F5F5DC]',
    piecePrimary: 'bg-[#8B0000]/20 dark:bg-[#8B0000]/20',
    pieceSecondary: 'bg-[#1A1A1A]/20 dark:bg-[#1A1A1A]/20',
    pieceTextPrimary: 'text-[#8B0000] dark:text-[#8B0000]',
    pieceTextSecondary: 'text-[#1A1A1A] dark:text-[#1A1A1A]',
    textPrimary: 'text-gray-800 dark:text-gray-800',
    textSecondary: 'text-gray-500 dark:text-gray-500',
  },
  cyber: {
    boardBackground: 'bg-[#0F172A] dark:bg-[#0F172A]',
    lineColor: 'border-[#38BDF8]/50 dark:border-[#38BDF8]/50',
    lineBackground: 'bg-[#38BDF8]/30 dark:bg-[#38BDF8]/30',
    pieceBackground: 'bg-[#1E293B] dark:bg-[#1E293B]',
    piecePrimary: 'bg-[#F43F5E]/20 dark:bg-[#F43F5E]/20',
    pieceSecondary: 'bg-[#2DD4BF]/20 dark:bg-[#2DD4BF]/20',
    pieceTextPrimary: 'text-[#F43F5E] drop-shadow-md dark:text-[#F43F5E] dark:drop-shadow-md',
    pieceTextSecondary: 'text-[#2DD4BF] drop-shadow-md dark:text-[#2DD4BF] dark:drop-shadow-md',
    textPrimary: 'text-slate-300 dark:text-slate-300',
    textSecondary: 'text-slate-500 dark:text-slate-500',
  },
  minimal: {
    boardBackground: 'bg-[#F9FAFB] dark:bg-[#F9FAFB]',
    lineColor: 'border-[#D1D5DB] dark:border-[#D1D5DB]',
    lineBackground: 'bg-[#D1D5DB]/60 dark:bg-[#D1D5DB]/60',
    pieceBackground: 'bg-white dark:bg-white',
    piecePrimary: 'bg-[#EF4444]/20 dark:bg-[#EF4444]/20',
    pieceSecondary: 'bg-[#374151]/20 dark:bg-[#374151]/20',
    pieceTextPrimary: 'text-[#EF4444] dark:text-[#EF4444]',
    pieceTextSecondary: 'text-[#374151] dark:text-[#374151]',
    textPrimary: 'text-gray-700 dark:text-gray-700',
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