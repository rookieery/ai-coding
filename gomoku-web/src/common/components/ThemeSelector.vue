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
    class="px-3 py-2 border rounded-lg outline-none transition-colors font-medium text-sm"
    :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-100 hover:bg-stone-700' : 'bg-white border-stone-300 text-stone-800 hover:bg-stone-50'"
  >
    <option
      v-for="option in themeOptions"
      :key="option.value"
      :value="option.value"
      class="bg-white dark:bg-stone-800"
    >
      {{ option.label }}
    </option>
  </select>
</template>