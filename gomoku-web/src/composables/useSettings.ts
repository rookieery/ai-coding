import { ref } from 'vue';
import type { ThemeKey } from '../common/theme';

/**
 * 游戏主题设置管理
 */
export function useSettings() {
  // 从 localStorage 加载保存的主题设置
  const loadTheme = (key: string): ThemeKey => {
    const saved = localStorage.getItem(key);
    if (saved === 'default' || saved === 'zen' || saved === 'cyber' || saved === 'minimal') {
      return saved;
    }
    return 'default';
  };

  // 保存主题到 localStorage
  const saveTheme = (key: string, theme: ThemeKey) => {
    localStorage.setItem(key, theme);
  };

  // 五子棋主题
  const gomokuTheme = ref<ThemeKey>(loadTheme('gomoku_theme'));
  // 中国象棋主题
  const chessTheme = ref<ThemeKey>(loadTheme('chess_theme'));

  // 更新五子棋主题
  const setGomokuTheme = (theme: ThemeKey) => {
    gomokuTheme.value = theme;
    saveTheme('gomoku_theme', theme);
  };

  // 更新中国象棋主题
  const setChessTheme = (theme: ThemeKey) => {
    chessTheme.value = theme;
    saveTheme('chess_theme', theme);
  };

  return {
    // 状态
    gomokuTheme,
    chessTheme,
    // 方法
    setGomokuTheme,
    setChessTheme,
  };
}

// 全局单例
let settingsInstance: ReturnType<typeof useSettings> | null = null;

export function useGlobalSettings() {
  if (!settingsInstance) {
    settingsInstance = useSettings();
  }
  return settingsInstance;
}