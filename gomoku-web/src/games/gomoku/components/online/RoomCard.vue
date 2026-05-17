<script setup lang="ts">
import { computed } from 'vue';
import { Users, Eye } from 'lucide-vue-next';
import { currentTheme, t } from '../../../../i18n';
import type { RoomInfo } from '../../../../api/room-api';

const props = defineProps<{
  room: RoomInfo;
}>();

const emit = defineEmits<{
  (e: 'join', roomId: string): void;
  (e: 'watch', roomId: string): void;
}>();

const isWaiting = computed(() => props.room.status === 'waiting');
const isPlaying = computed(() => props.room.status === 'playing');

const statusLabel = computed(() =>
  isWaiting.value ? t('onlineStatusWaiting') : t('onlineStatusPlaying'),
);

const guestDisplay = computed(() =>
  props.room.guestName ?? t('onlineWaitingPlayer'),
);

const ruleLabel = computed(() =>
  props.room.ruleMode === 'standard'
    ? t('onlineRuleStandard')
    : t('onlineRuleRenju'),
);
</script>

<template>
  <div
    class="rounded-xl border p-4 transition-all duration-200 hover:shadow-md"
    :class="
      currentTheme === 'dark'
        ? 'bg-stone-800 border-stone-700 hover:border-stone-600'
        : 'bg-white border-stone-200 hover:border-stone-300'
    "
  >
    <!-- Header: Room name + status badge -->
    <div class="flex items-center justify-between mb-3">
      <h4
        class="font-semibold text-sm truncate mr-2"
        :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'"
      >
        {{ room.name }}
      </h4>
      <span
        class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        :class="
          isWaiting
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
        "
      >
        <span
          class="w-1.5 h-1.5 rounded-full"
          :class="isWaiting ? 'bg-amber-500' : 'bg-emerald-500'"
        />
        {{ statusLabel }}
      </span>
    </div>

    <!-- Players row -->
    <div class="flex items-center gap-2 text-xs mb-3">
      <div class="flex items-center gap-1.5">
        <Users class="w-3.5 h-3.5 shrink-0" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'" />
        <span :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'" class="font-medium">{{ room.hostName }}</span>
        <span :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'">vs</span>
        <span
          :class="
            room.guestName
              ? currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'
              : currentTheme === 'dark' ? 'text-stone-500 italic' : 'text-stone-400 italic'
          "
          class="font-medium"
        >{{ guestDisplay }}</span>
      </div>
    </div>

    <!-- Footer: Rule mode + Spectators + Action -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3 text-xs" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
        <span class="px-1.5 py-0.5 rounded border text-xs" :class="currentTheme === 'dark' ? 'border-stone-600' : 'border-stone-300'">
          {{ ruleLabel }}
        </span>
        <span class="flex items-center gap-1">
          <Eye class="w-3.5 h-3.5" />
          {{ t('onlineSpectators', room.spectatorCount) }}
        </span>
      </div>

      <button
        v-if="isWaiting"
        @click="emit('join', room.id)"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {{ t('onlineJoinRoom') }}
      </button>
      <button
        v-else-if="isPlaying"
        @click="emit('watch', room.id)"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
        :class="
          currentTheme === 'dark'
            ? 'border-stone-600 text-stone-300 hover:bg-stone-700'
            : 'border-stone-300 text-stone-700 hover:bg-stone-50'
        "
      >
        {{ t('onlineWatchGame') }}
      </button>
    </div>
  </div>
</template>
