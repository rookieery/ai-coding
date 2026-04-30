<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { currentTheme, t } from '../../../i18n';

defineProps<{
  isOpen: boolean;
  saveName: string;
  saveNameError: string;
}>();

const emit = defineEmits<{
  (e: 'update:saveName', value: string): void;
  (e: 'save'): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  >
    <div
      class="w-full max-w-sm p-6 rounded-2xl shadow-xl transition-colors"
      :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'"
    >
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">{{ t('saveGame') }}</h3>
        <button
          @click="emit('close')"
          class="p-1 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="mb-6">
        <label
          class="block text-sm font-medium mb-2"
          :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'"
        >
          {{ t('saveNamePrompt') }}
        </label>
        <input
          :value="saveName"
          type="text"
          :placeholder="t('saveNamePlaceholder')"
          class="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          :class="[
            currentTheme === 'dark' ? 'bg-stone-900 border-stone-700 text-stone-100' : 'bg-stone-50 border-stone-300 text-stone-900',
            saveNameError ? 'border-red-500 focus:ring-red-500' : ''
          ]"
          @keyup.enter="emit('save')"
          @input="emit('update:saveName', ($event.target as HTMLInputElement).value)"
        />
        <p v-if="saveNameError" class="mt-2 text-sm text-red-500">{{ saveNameError }}</p>
      </div>
      <div class="flex justify-end gap-3">
        <button
          @click="emit('close')"
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          :class="currentTheme === 'dark' ? 'bg-stone-700 hover:bg-stone-600 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'"
        >
          {{ t('cancel') }}
        </button>
        <button
          @click="emit('save')"
          class="px-4 py-2 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          {{ t('save') }}
        </button>
      </div>
    </div>
  </div>
</template>
