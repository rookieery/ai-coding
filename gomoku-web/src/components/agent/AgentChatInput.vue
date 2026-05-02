<script setup lang="ts">
import { ref } from 'vue';
import { Send, Paperclip, X, Square } from 'lucide-vue-next';
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
  stop: [];
}>();

const { textareaRef, adjustTextareaHeight, resetTextareaHeight } = useAutoResize();

const selectedImageBase64 = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
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

const showInputPreview = ref(false);

const clearSelectedImage = () => {
  selectedImageBase64.value = null;
};

const openInputPreview = () => {
  if (selectedImageBase64.value) {
    showInputPreview.value = true;
  }
};

const closeInputPreview = () => {
  showInputPreview.value = false;
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
      class="flex flex-col w-full rounded-2xl shadow-sm border transition-colors focus-within:ring-2 focus-within:ring-indigo-500"
      :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-300'"
      @paste="handlePaste"
    >
      <!-- 图片缩略图 -->
      <div v-if="selectedImageBase64" class="flex gap-2 px-3 pt-3">
        <div class="relative group flex-shrink-0">
          <div
            class="w-[72px] h-[72px] rounded-xl overflow-hidden"
            :class="currentTheme === 'dark' ? 'bg-stone-700' : 'bg-stone-100'"
          >
            <img
              :src="selectedImageBase64"
              :alt="t('selectedImagePreview')"
              class="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              @click="openInputPreview"
            />
          </div>
          <button
            type="button"
            @click.stop="clearSelectedImage"
            class="absolute -top-1.5 -right-1.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"
            :class="currentTheme === 'dark' ? 'bg-stone-600 text-stone-300 hover:bg-stone-500' : 'bg-white text-stone-600 hover:bg-stone-50 ring-1 ring-stone-200'"
            :aria-label="t('removeImage')"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>
      <!-- 输入行 -->
      <div class="flex items-end gap-2 p-2">
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
          v-if="isThinking"
          @click="emit('stop')"
          class="rounded-full transition-colors p-3 flex-shrink-0 self-end cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700"
          :aria-label="t('stopGenerating')"
        >
          <Square class="w-5 h-5" />
        </button>
        <button
          v-else
          @click="handleSend"
          class="rounded-full transition-colors p-3 flex-shrink-0 self-end cursor-pointer"
          :class="[
            (query.trim() || selectedImageBase64)
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : (currentTheme === 'dark' ? 'bg-stone-700 text-stone-500' : 'bg-stone-100 text-stone-400'),
          ]"
          :disabled="!query.trim() && !selectedImageBase64"
        >
          <Send class="w-5 h-5" />
        </button>
      </div>
    </div>
    <div class="text-center mt-3 text-xs" :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'">
      {{ t('agentDisclaimer') }}
    </div>

    <!-- 图片预览弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showInputPreview && selectedImageBase64"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          @click="closeInputPreview"
        >
          <img
            :src="selectedImageBase64"
            :alt="t('selectedImagePreview')"
            class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            @click.stop
          />
          <button
            class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            :aria-label="t('close')"
            @click="closeInputPreview"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
