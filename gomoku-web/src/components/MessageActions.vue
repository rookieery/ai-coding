<script setup lang="ts">
import { computed } from 'vue';
import { Copy, RefreshCw, Volume2, VolumeX, Check } from 'lucide-vue-next';
import { currentTheme, t } from '../i18n';
import { useClipboard } from '../composables/useClipboard';
import { useSpeech } from '../composables/useSpeech';

defineOptions({
  name: 'MessageActions'
});

interface Props {
  content: string;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  getTextToCopy?: () => string | Promise<string>;
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
});

const emit = defineEmits<{
  regenerate: [];
}>();

const { copy, isCopied } = useClipboard();
const { speak, stop, isSupported, isSpeaking } = useSpeech();

// 复制文本
const handleCopy = async () => {
  let textToCopy = props.content;

  // 优先使用自定义的文本提取函数
  if (props.getTextToCopy) {
    try {
      let extractedText: string;
      const result = props.getTextToCopy();

      if (typeof result === 'string') {
        extractedText = result;
      } else if (result instanceof Promise) {
        extractedText = await result;
      } else {
        extractedText = String(result);
      }

      if (extractedText.trim()) {
        textToCopy = extractedText;
      }
    } catch (error) {
      console.warn('Failed to extract text for copying:', error);
      // 使用原始内容作为回退
    }
  }

  if (textToCopy.trim()) {
    await copy(textToCopy);
  }
};

// 重新生成
const handleRegenerate = () => {
  if (props.onRegenerate) {
    props.onRegenerate();
  } else {
    emit('regenerate');
  }
};

// 切换朗读
const toggleSpeech = () => {
  if (isSpeaking.value) {
    stop();
  } else if (props.content.trim()) {
    speak(props.content, { lang: 'zh-CN' });
  }
};

// 按钮样式类
const buttonClasses = computed(() => {
  const base = 'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const disabledBase = 'opacity-40 cursor-not-allowed';

  if (props.isStreaming) {
    return `${base} ${disabledBase} ${currentTheme.value === 'dark' ? 'bg-stone-700 text-stone-500' : 'bg-stone-100 text-stone-400'}`;
  }

  const light = 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200 focus:ring-indigo-500 focus:ring-offset-stone-50';
  const dark = 'bg-stone-700 text-stone-300 hover:bg-stone-600 border border-stone-600 focus:ring-indigo-400 focus:ring-offset-stone-800';
  return `${base} ${currentTheme.value === 'dark' ? dark : light}`;
});

// 容器样式类
const containerClasses = computed(() => {
  const base = 'flex items-center gap-2 transition-opacity duration-300';
  return `${base} ${props.isStreaming ? 'opacity-40 pointer-events-none' : 'opacity-100'}`;
});

// 工具提示样式类
const tooltipClasses = computed(() => {
  const base = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap pointer-events-none transition-opacity duration-200 opacity-0 group-hover:opacity-100 z-10';
  const light = 'bg-stone-800 text-white';
  const dark = 'bg-stone-100 text-stone-900';
  return `${base} ${currentTheme.value === 'dark' ? dark : light}`;
});
</script>

<template>
  <div :class="containerClasses">
    <!-- 复制按钮 -->
    <div class="relative group">
      <button
        :class="buttonClasses"
        @click="handleCopy"
        :disabled="isStreaming || !content.trim()"
        :title="t('copyText')"
        :aria-label="t('copyText')"
      >
        <Check v-if="isCopied" class="w-4 h-4" />
        <Copy v-else class="w-4 h-4" />
      </button>
      <div :class="tooltipClasses">
        {{ isCopied ? t('copied') : t('copyText') }}
      </div>
    </div>

    <!-- 重新生成按钮 -->
    <div class="relative group" v-if="onRegenerate">
      <button
        :class="buttonClasses"
        @click="handleRegenerate"
        :disabled="isStreaming"
        :title="t('regenerate')"
        :aria-label="t('regenerate')"
      >
        <RefreshCw class="w-4 h-4" />
      </button>
      <div :class="tooltipClasses">
        {{ t('regenerate') }}
      </div>
    </div>

    <!-- 朗读按钮（仅当浏览器支持时显示） -->
    <div class="relative group" v-if="isSupported">
      <button
        :class="buttonClasses"
        @click="toggleSpeech"
        :disabled="isStreaming || !content.trim()"
        :title="isSpeaking ? t('stopSpeaking') : t('speak')"
        :aria-label="isSpeaking ? t('stopSpeaking') : t('speak')"
      >
        <VolumeX v-if="isSpeaking" class="w-4 h-4" />
        <Volume2 v-else class="w-4 h-4" />
      </button>
      <div :class="tooltipClasses">
        {{ isSpeaking ? t('stopSpeaking') : t('speak') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条样式 */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}
</style>