<script setup lang="ts">
import { currentTheme } from '../../../i18n';

defineProps<{
  show: boolean;
  message: string;
}>();
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform -translate-y-4 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-4 opacity-0"
  >
    <div
      v-if="show"
      class="fixed top-4 z-50 px-6 py-2 rounded-full shadow-lg bg-emerald-500 text-white font-medium"
    >
      {{ message }}
    </div>
  </Transition>
</template>
