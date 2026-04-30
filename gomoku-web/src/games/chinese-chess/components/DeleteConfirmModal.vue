<script setup lang="ts">
import { currentTheme, t } from '../../../i18n';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
  >
    <div
      class="w-full max-w-sm p-6 rounded-2xl shadow-xl transition-colors"
      :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'"
    >
      <h3 class="text-lg font-bold mb-4">{{ t('confirmDelete') }}</h3>
      <div class="flex justify-end gap-3 mt-6">
        <button
          @click="emit('cancel')"
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          :class="currentTheme === 'dark' ? 'bg-stone-700 hover:bg-stone-600 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'"
        >
          {{ t('cancel') }}
        </button>
        <button
          @click="emit('confirm')"
          class="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          {{ t('confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
