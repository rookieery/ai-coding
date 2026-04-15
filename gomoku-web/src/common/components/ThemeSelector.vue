<script setup lang="ts">
import { computed } from 'vue';
import { t, currentTheme } from '../../i18n';
import type { ThemeKey } from '../theme';

const props = defineProps<{
  modelValue: ThemeKey;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ThemeKey];
}>();

const themeOptions: { value: ThemeKey; label: string }[] = [
  { value: 'default', label: t('themeDefault') },
  { value: 'zen', label: t('themeZen') },
  { value: 'cyber', label: t('themeCyber') },
  { value: 'minimal', label: t('themeMinimal') },
];

const selected = computed({
  get: () => props.modelValue,
  set: (value: ThemeKey) => emit('update:modelValue', value),
});
</script>

<template>
  <select
    v-model="selected"
    class="px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg outline-none transition-colors shadow-sm text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'"
  >
    <option
      v-for="option in themeOptions"
      :key="option.value"
      :value="option.value"
    >
      {{ option.label }}
    </option>
  </select>
</template>