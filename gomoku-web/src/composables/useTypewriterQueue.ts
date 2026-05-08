import { ref, onUnmounted } from 'vue';

interface TypewriterQueueOptions {
  charsPerSecond?: number;
  maxCharsPerSecond?: number;
  speedUpThreshold?: number;
  onUpdate?: () => void;
}

export function useTypewriterQueue(options: TypewriterQueueOptions = {}) {
  const {
    charsPerSecond = 80,
    maxCharsPerSecond = 400,
    speedUpThreshold = 200,
    onUpdate,
  } = options;

  const output = ref('');
  let buffer = '';
  let animationFrameId: number | null = null;
  let lastTime = 0;

  const push = (text: string) => {
    buffer += text;
    if (!animationFrameId) {
      lastTime = performance.now();
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
    const tick = (now: number) => {
      if (!buffer) {
        animationFrameId = null;
        return;
      }

      const elapsed = Math.min(now - lastTime, 100);
      lastTime = now;

      const queueLength = buffer.length;
      let currentSpeed = charsPerSecond;

      if (queueLength > speedUpThreshold) {
        const ratio = queueLength / speedUpThreshold;
        currentSpeed = Math.min(maxCharsPerSecond, charsPerSecond * ratio);
      }

      let charsToTake = Math.max(1, Math.round(currentSpeed * elapsed / 1000));
      charsToTake = Math.min(charsToTake, queueLength);

      output.value += buffer.substring(0, charsToTake);
      buffer = buffer.substring(charsToTake);

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
