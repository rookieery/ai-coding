<script setup lang="ts">
/**
 * RatingDisplay — Shows a user's ELO rating and optional change badge.
 * Green for positive change, red for negative, hidden when 0 or undefined.
 */
import { computed } from 'vue';
import { Trophy } from 'lucide-vue-next';
import { currentTheme } from '../../../../i18n';

const props = defineProps<{
  rating: number;
  change?: number;
}>();

const displayRating = computed(() => Math.round(props.rating));

const displayChange = computed(() => {
  if (props.change === undefined || props.change === 0) return null;
  return Math.round(props.change);
});

const isPositive = computed(() => (displayChange.value ?? 0) > 0);
</script>

<template>
  <div class="inline-flex items-center gap-1.5">
    <Trophy
      class="w-3.5 h-3.5"
      :class="currentTheme === 'dark' ? 'text-amber-400' : 'text-amber-600'"
    />
    <span
      class="text-sm font-semibold tabular-nums"
      :class="currentTheme === 'dark' ? 'text-stone-200' : 'text-stone-700'"
    >
      {{ displayRating }}
    </span>
    <span
      v-if="displayChange !== null"
      class="text-xs font-medium px-1.5 py-0.5 rounded-full"
      :class="isPositive
        ? 'bg-emerald-500/20 text-emerald-500'
        : 'bg-red-500/20 text-red-500'"
    >
      {{ isPositive ? '+' : '' }}{{ displayChange }}
    </span>
  </div>
</template>
