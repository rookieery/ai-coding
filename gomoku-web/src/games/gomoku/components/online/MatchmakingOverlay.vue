<script setup lang="ts">
/**
 * MatchmakingOverlay — Full-screen overlay shown while searching for an opponent.
 * Displays elapsed time, queue position, and auto-redirects when a match is found.
 */
import { ref, computed, watch, onUnmounted } from 'vue';
import { Swords, X, User } from 'lucide-vue-next';
import { currentTheme, t } from '../../../../i18n';
import type { OpponentInfo } from '../../../../composables/useMatchmaking';

const props = defineProps<{
  visible: boolean;
  queuePosition: number;
  matchedOpponent: OpponentInfo | null;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'navigate'): void;
}>();

const elapsed = ref(0);
let timerHandle: ReturnType<typeof setInterval> | null = null;
let redirectHandle: ReturnType<typeof setTimeout> | null = null;

const formattedTime = computed(() => {
  const mins = Math.floor(elapsed.value / 60);
  const secs = elapsed.value % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return t('onlineMatchmakingWaitTime', secs);
});

const isMatchFound = computed(() => props.matchedOpponent !== null);

// Start / stop timer when visibility changes
watch(
  () => props.visible,
  (val) => {
    if (val) {
      elapsed.value = 0;
      timerHandle = setInterval(() => {
        elapsed.value++;
      }, 1000);
    } else {
      cleanup();
    }
  },
);

// When a match is found, start redirect countdown
watch(isMatchFound, (found) => {
  if (found) {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
    redirectHandle = setTimeout(() => {
      emit('navigate');
    }, 3000);
  }
});

function cleanup(): void {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
  if (redirectHandle) {
    clearTimeout(redirectHandle);
    redirectHandle = null;
  }
}

function handleCancel(): void {
  cleanup();
  emit('cancel');
}

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <Transition name="overlay">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      :class="currentTheme === 'dark' ? 'bg-black/70' : 'bg-black/50'"
    >
      <div
        class="w-full max-w-sm p-8 rounded-2xl shadow-2xl text-center transition-colors"
        :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'"
      >
        <!-- Searching state -->
        <template v-if="!isMatchFound">
          <!-- Animated icon -->
          <div class="mb-6 flex justify-center">
            <div class="relative">
              <Swords class="w-12 h-12 text-emerald-500 animate-pulse" />
            </div>
          </div>

          <h2 class="text-xl font-bold mb-2">
            {{ t('onlineMatchmakingTitle') }}
          </h2>

          <p
            class="text-sm mb-4"
            :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
          >
            {{ t('onlineMatchmakingSearching') }}
          </p>

          <!-- Spinning dots animation -->
          <div class="flex justify-center gap-1.5 mb-5">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style="animation-delay: 0ms" />
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style="animation-delay: 150ms" />
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style="animation-delay: 300ms" />
          </div>

          <!-- Wait time and queue position -->
          <div
            class="flex items-center justify-center gap-4 text-sm mb-6"
            :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
          >
            <span>{{ formattedTime }}</span>
            <span
              v-if="queuePosition > 0"
              class="px-2 py-0.5 rounded-full text-xs font-medium"
              :class="currentTheme === 'dark'
                ? 'bg-stone-700 text-stone-300'
                : 'bg-stone-200 text-stone-600'"
            >
              {{ t('onlineMatchmakingQueuePosition', queuePosition) }}
            </span>
          </div>

          <!-- Cancel button -->
          <button
            @click="handleCancel"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors"
            :class="currentTheme === 'dark'
              ? 'bg-stone-700 hover:bg-stone-600 text-stone-200'
              : 'bg-stone-200 hover:bg-stone-300 text-stone-700'"
          >
            <X class="w-4 h-4" />
            {{ t('onlineMatchmakingCancel') }}
          </button>
        </template>

        <!-- Match found state -->
        <template v-else>
          <!-- Success icon -->
          <div class="mb-5 flex justify-center">
            <div
              class="w-16 h-16 rounded-full flex items-center justify-center"
              :class="currentTheme === 'dark' ? 'bg-emerald-900/50' : 'bg-emerald-100'"
            >
              <Swords class="w-8 h-8 text-emerald-500" />
            </div>
          </div>

          <h2 class="text-xl font-bold mb-4 text-emerald-500">
            {{ t('onlineMatchFound') }}
          </h2>

          <!-- Player VS display -->
          <div
            class="flex items-center justify-center gap-4 mb-5 py-4 rounded-xl"
            :class="currentTheme === 'dark' ? 'bg-stone-900/50' : 'bg-stone-50'"
          >
            <!-- Current user side -->
            <div class="flex flex-col items-center gap-1">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                :class="currentTheme === 'dark'
                  ? 'bg-emerald-900/50 text-emerald-400'
                  : 'bg-emerald-100 text-emerald-700'"
              >
                <User class="w-5 h-5" />
              </div>
              <span class="text-xs font-medium">You</span>
            </div>

            <!-- VS -->
            <span
              class="text-lg font-bold"
              :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'"
            >
              {{ t('onlineMatchFoundVs') }}
            </span>

            <!-- Opponent side -->
            <div class="flex flex-col items-center gap-1">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                :class="currentTheme === 'dark'
                  ? 'bg-stone-700 text-stone-300'
                  : 'bg-stone-200 text-stone-600'"
              >
                <User class="w-5 h-5" />
              </div>
              <span class="text-xs font-medium truncate max-w-[100px]">
                {{ matchedOpponent!.username }}
              </span>
              <span
                class="text-xs"
                :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'"
              >
                {{ t('onlineRatingLabel') }}: {{ matchedOpponent!.rating }}
              </span>
            </div>
          </div>

          <!-- Redirect countdown -->
          <p
            class="text-sm"
            :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
          >
            {{ t('onlineMatchFoundRedirecting', 3) }}
          </p>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
