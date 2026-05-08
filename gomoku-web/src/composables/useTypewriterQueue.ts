import { ref, onUnmounted } from 'vue';

interface TypewriterQueueOptions {
  charsPerFrame?: number;
  maxCharsPerFrame?: number;
  speedUpThreshold?: number;
  onUpdate?: () => void;
}

export function useTypewriterQueue(options: TypewriterQueueOptions = {}) {
  const {
    charsPerFrame = 3,
    maxCharsPerFrame = 30,
    speedUpThreshold = 50,
    onUpdate,
  } = options;

  const output = ref('');
  let buffer = '';
  let animationFrameId: number | null = null;

  const push = (text: string) => {
    buffer += text;
    if (!animationFrameId) {
      startAnimation();
    }
  };

  const set = (text: string) => {
    buffer = '';
    output.value = text;
    stopAnimation();
    onUpdate?.();
  };

  const flush = () => {
    if (buffer) {
      output.value += buffer;
      buffer = '';
    }
    stopAnimation();
    onUpdate?.();
  };

  const reset = () => {
    buffer = '';
    output.value = '';
    stopAnimation();
  };

  const startAnimation = () => {
    const tick = () => {
      if (!buffer) {
        animationFrameId = null;
        return;
      }

      const queueLength = buffer.length;
      let charsToTake = charsPerFrame;

      if (queueLength > speedUpThreshold) {
        const ratio = queueLength / speedUpThreshold;
        charsToTake = Math.min(maxCharsPerFrame, Math.ceil(charsPerFrame * ratio));
      }

      const taken = buffer.substring(0, charsToTake);
      buffer = buffer.substring(charsToTake);
      output.value += taken;

      onUpdate?.();

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
  };

  const stopAnimation = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  onUnmounted(() => {
    stopAnimation();
  });

  return {
    output,
    push,
    set,
    flush,
    reset,
  };
}
