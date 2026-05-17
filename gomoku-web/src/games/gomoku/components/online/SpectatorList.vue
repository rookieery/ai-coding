<script setup lang="ts">
import { Eye } from 'lucide-vue-next';
import { currentTheme, t } from '../../../../i18n';

defineProps<{
  spectatorCount: number;
}>();
</script>

<template>
  <div
    class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
    :class="
      currentTheme === 'dark'
        ? 'bg-stone-800 text-stone-400'
        : 'bg-stone-100 text-stone-500'
    "
  >
    <Eye class="w-4 h-4 shrink-0" />
    <span>{{ t('onlineSpectators', spectatorCount) }}</span>
  </div>
</template>
