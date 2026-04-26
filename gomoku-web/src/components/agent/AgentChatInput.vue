<script setup lang="ts">
import { ref } from 'vue';
import { Send, Paperclip, X } from 'lucide-vue-next';
import { currentTheme, t } from '../../i18n';
import { useAutoResize } from '../../composables/useAutoResize';

defineOptions({
  name: 'AgentChatInput'
});

interface Props {
  isThinking: boolean;
  query: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:query': [value: string];
  send: [payload: { text: string; imageBase64: string | null }];
}>();

const { textareaRef, adjustTextareaHeight, resetTextareaHeight } = useAutoResize();

const selectedImageBase64 = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const MAX_IMAGE_WIDTH = 1024;
const MAX_IMAGE_HEIGHT = 1024;
const IMAGE_QUALITY = 0.8;

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > MAX_IMAGE_WIDTH) {
        width = MAX_IMAGE_WIDTH;
        height = width / aspectRatio;
      }
      if (height > MAX_IMAGE_HEIGHT) {
        height = MAX_IMAGE_HEIGHT;
        width = height * aspectRatio;
      }

      width = Math.round(width);
      height = Math.round(height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const base64 = canvas.toDataURL(mimeType, IMAGE_QUALITY);
      resolve(base64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return compressImage(file);
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    try {
      selectedImageBase64.value = await fileToBase64(file);
    } catch {
      selectedImageBase64.value = null;
    }
  }
  target.value = '';
};

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) {
        try {
          selectedImageBase64.value = await fileToBase64(file);
        } catch {
          selectedImageBase64.value = null;
        }
      }
      break;
    }
  }
};

const clearSelectedImage = () => {
  selectedImageBase64.value = null;
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
};

const handleSend = () => {
  const hasText = props.query.trim();
  const hasImage = selectedImageBase64.value !== null;
  if ((!hasText && !hasImage) || props.isThinking) return;

  emit('send', {
    text: props.query.trim(),
    imageBase64: selectedImageBase64.value,
  });
  selectedImageBase64.value = null;
};

defineExpose({
  resetTextareaHeight,
});
</script>

<template>
  <div class="w-full relative mt-auto mb-8 max-w-full">
    <!-- 快捷操作按钮区域（通过 slot 传入） -->
    <div v-if="$slots.actions" class="flex flex-wrap gap-3 mb-4">
      <slot name="actions" />
    </div>
    <div
      class="flex flex-wrap items-end w-full rounded-2xl shadow-sm border transition-colors focus-within:ring-2 focus-within:ring-indigo-500 gap-2 p-2"
      :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-300'"
      @paste="handlePaste"
    >
      <!-- 图片预览区域 -->
      <div
        v-if="selectedImageBase64"
        class="w-full relative mb-2 rounded-lg overflow-hidden"
        :class="currentTheme === 'dark' ? 'bg-stone-700' : 'bg-stone-100'"
      >
        <img
          :src="selectedImageBase64"
          :alt="t('selectedImagePreview')"
          class="max-h-32 max-w-full object-contain mx-auto"
        />
        <button
          type="button"
          @click="clearSelectedImage"
          class="absolute top-2 right-2 p-1 rounded-full transition-colors"
          :class="currentTheme === 'dark' ? 'bg-stone-600 hover:bg-stone-500 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'"
          :aria-label="t('removeImage')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <!-- 附件按钮 -->
      <button
        type="button"
        @click="triggerFileInput"
        class="p-3 rounded-full transition-colors flex-shrink-0 self-end cursor-pointer"
        :class="currentTheme === 'dark' ? 'hover:bg-stone-700 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-700'"
        :aria-label="t('attachImage')"
        :disabled="isThinking"
      >
        <Paperclip class="w-5 h-5" />
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileSelect"
      />
      <textarea
        ref="textareaRef"
        :value="query"
        @input="emit('update:query', ($event.target as HTMLTextAreaElement).value); adjustTextareaHeight()"
        :placeholder="t('agentPlaceholder')"
        class="flex-1 bg-transparent px-2 py-3 outline-none resize-none min-h-[56px] max-h-[calc(1.5rem*7+1.5rem)] overflow-y-auto"
        :class="currentTheme === 'dark' ? 'text-stone-100 placeholder-stone-500' : 'text-stone-900 placeholder-stone-400'"
        @keydown="handleKeydown"
        :disabled="isThinking"
        rows="1"
      />
      <button
        @click="handleSend"
        class="rounded-full transition-colors p-3 flex-shrink-0 self-end cursor-pointer"
        :class="[
          (query.trim() || selectedImageBase64) && !isThinking
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : (currentTheme === 'dark' ? 'bg-stone-700 text-stone-500' : 'bg-stone-100 text-stone-400'),
        ]"
        :disabled="(!query.trim() && !selectedImageBase64) || isThinking"
      >
        <Send class="w-5 h-5" />
      </button>
    </div>
    <div class="text-center mt-3 text-xs" :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'">
      {{ t('agentDisclaimer') }}
    </div>
  </div>
</template>
