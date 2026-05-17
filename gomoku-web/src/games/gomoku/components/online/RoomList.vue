<script setup lang="ts">
import { currentTheme, t } from '../../../../i18n';
import type { RoomInfo } from '../../../../api/room-api';
import RoomCard from './RoomCard.vue';

defineProps<{
  rooms: RoomInfo[];
}>();

const emit = defineEmits<{
  (e: 'join', roomId: string): void;
  (e: 'watch', roomId: string): void;
}>();
</script>

<template>
  <div>
    <!-- Room grid -->
    <div
      v-if="rooms.length > 0"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <RoomCard
        v-for="room in rooms"
        :key="room.id"
        :room="room"
        @join="emit('join', $event)"
        @watch="emit('watch', $event)"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <div
        class="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        :class="currentTheme === 'dark' ? 'bg-stone-800' : 'bg-stone-100'"
      >
        <svg
          class="w-8 h-8"
          :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <p
        class="text-sm"
        :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
      >
        {{ t('onlineNoRooms') }}
      </p>
    </div>
  </div>
</template>
