<script setup lang="ts">
import { currentTheme, t } from '../../i18n';

defineOptions({
  name: 'AgentWelcomeScreen'
});
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 w-full mt-12">
    <div class="w-24 h-24 mb-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
      <span class="text-4xl text-white font-bold">五</span>
    </div>
    <h2 class="text-4xl font-bold mb-4 tracking-tight" :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'">{{ t('agentTitle') }}</h2>
    <p class="text-lg text-center max-w-2xl" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
      {{ t('agentGreeting') }}
    </p>
  </div>
</template>
