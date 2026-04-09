import { ref } from 'vue';

/**
 * 剪贴板操作钩子
 * 提供复制文本、成功状态和错误处理
 */
export function useClipboard() {
  const isCopied = ref(false);
  const error = ref<Error | null>(null);

  /**
   * 复制文本到剪贴板
   * @param text 要复制的文本
   * @returns Promise<boolean> 是否成功
   */
  const copy = async (text: string): Promise<boolean> => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not supported');
      }

      await navigator.clipboard.writeText(text);
      isCopied.value = true;
      error.value = null;

      // 2秒后重置复制状态
      setTimeout(() => {
        isCopied.value = false;
      }, 2000);

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      isCopied.value = false;
      return false;
    }
  };

  /**
   * 重置复制状态
   */
  const reset = () => {
    isCopied.value = false;
    error.value = null;
  };

  return {
    isCopied,
    error,
    copy,
    reset,
  };
}