import { ref, onUnmounted } from 'vue';

/**
 * 语音合成钩子 (Web Speech API)
 * 提供文本朗读、暂停、恢复和停止功能
 */
export function useSpeech() {
  const isSupported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window);
  const isSpeaking = ref(false);
  const isPaused = ref(false);
  const error = ref<Error | null>(null);

  // 当前 utterance 实例
  let currentUtterance: SpeechSynthesisUtterance | null = null;

  /**
   * 清理当前 utterance
   */
  const cleanup = () => {
    if (currentUtterance) {
      currentUtterance.onstart = null;
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
      currentUtterance = null;
    }
  };

  /**
   * 停止当前语音并清理
   */
  const stop = () => {
    if (isSpeaking.value) {
      window.speechSynthesis.cancel();
    }
    cleanup();
    isSpeaking.value = false;
    isPaused.value = false;
    error.value = null;
  };

  /**
   * 朗读文本
   * @param text 要朗读的文本
   * @param options 可选配置 (语速、音调、音量)
   */
  const speak = (
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      lang?: string;
      voice?: SpeechSynthesisVoice;
    } = {}
  ) => {
    if (!isSupported.value) {
      error.value = new Error('Speech synthesis not supported in this browser');
      return;
    }

    // 停止当前朗读
    stop();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      currentUtterance = utterance;

      // 设置选项
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;
      utterance.lang = options.lang ?? 'zh-CN';
      if (options.voice) {
        utterance.voice = options.voice;
      }

      // 事件处理
      utterance.onstart = () => {
        isSpeaking.value = true;
        isPaused.value = false;
        error.value = null;
      };

      utterance.onend = () => {
        isSpeaking.value = false;
        isPaused.value = false;
        cleanup();
      };

      utterance.onerror = (event) => {
        error.value = new Error(`Speech synthesis error: ${event.error}`);
        isSpeaking.value = false;
        isPaused.value = false;
        cleanup();
      };

      // 开始朗读
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    }
  };

  /**
   * 暂停当前朗读
   */
  const pause = () => {
    if (isSpeaking.value && !isPaused.value) {
      window.speechSynthesis.pause();
      isPaused.value = true;
    }
  };

  /**
   * 恢复暂停的朗读
   */
  const resume = () => {
    if (isSpeaking.value && isPaused.value) {
      window.speechSynthesis.resume();
      isPaused.value = false;
    }
  };

  /**
   * 切换播放/暂停状态
   */
  const toggle = () => {
    if (!isSpeaking.value) return;
    if (isPaused.value) {
      resume();
    } else {
      pause();
    }
  };

  /**
   * 获取可用语音列表
   */
  const getVoices = (): SpeechSynthesisVoice[] => {
    return isSupported.value ? window.speechSynthesis.getVoices() : [];
  };

  // 组件卸载时停止语音
  onUnmounted(() => {
    stop();
  });

  return {
    isSupported,
    isSpeaking,
    isPaused,
    error,
    speak,
    stop,
    pause,
    resume,
    toggle,
    getVoices,
  };
}