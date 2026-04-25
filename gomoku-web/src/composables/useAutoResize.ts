import { ref, nextTick } from 'vue';

export function useAutoResize() {
  const textareaRef = ref<HTMLTextAreaElement | null>(null);

  const adjustTextareaHeight = () => {
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.style.height = 'auto';
        const lineHeight = 24;
        const minHeight = 56;
        const maxHeight = lineHeight * 7 + 24;

        const scrollHeight = textareaRef.value.scrollHeight;
        let newHeight = Math.max(minHeight, scrollHeight);
        newHeight = Math.min(newHeight, maxHeight);

        textareaRef.value.style.height = `${newHeight}px`;
      }
    });
  };

  const resetTextareaHeight = () => {
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.style.height = '56px';
      }
    });
  };

  return {
    textareaRef,
    adjustTextareaHeight,
    resetTextareaHeight,
  };
}
