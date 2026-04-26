<script setup lang="ts">
import { Download, Trash2, X, RefreshCw } from 'lucide-vue-next';
import { currentTheme, t } from '../../../i18n';
import type { GameListItem } from '../../../api/game-api';

const props = defineProps<{
  isOpen: boolean;
  records: GameListItem[];
  currentRecordId: string | null;
  editingGameId: string | null;
  editingName: string;
  canEditGame: (game: GameListItem) => boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'import', game: GameListItem): void;
  (e: 'update', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'startEdit', game: GameListItem): void;
  (e: 'update:editingName', value: string): void;
  (e: 'saveEdit'): void;
  (e: 'cancelEdit'): void;
}>();

const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  >
    <div
      class="w-full max-w-lg p-6 rounded-2xl shadow-xl transition-colors flex flex-col max-h-[80vh]"
      :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'"
    >
      <div class="flex justify-between items-center mb-4 shrink-0">
        <h3 class="text-xl font-bold">{{ t('gameRecords') }}</h3>
        <button
          @click="emit('close')"
          class="p-1 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
        <div v-if="records.length === 0" class="text-center py-8 opacity-50">
          {{ t('noRecords') }}
        </div>
        <div v-else class="flex flex-col gap-3">
          <div
            v-for="game in records"
            :key="game.id"
            class="flex items-center justify-between p-3 rounded-xl border transition-colors"
            :class="currentTheme === 'dark' ? 'bg-stone-900/50 border-stone-700' : 'bg-stone-50 border-stone-200'"
          >
            <div class="flex flex-col overflow-hidden pr-4 flex-1">
              <div v-if="editingGameId === game.id" class="flex items-center gap-2">
                <input
                  :value="editingName"
                  type="text"
                  class="w-full px-2 py-1 text-sm border rounded outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-600 text-stone-100' : 'bg-white border-stone-300 text-stone-900'"
                  @keyup.enter="emit('saveEdit')"
                  @keyup.esc="emit('cancelEdit')"
                  @blur="emit('saveEdit')"
                  @input="emit('update:editingName', ($event.target as HTMLInputElement).value)"
                  v-focus
                />
              </div>
              <div v-else class="flex items-center gap-2">
                <span
                  @click="canEditGame(game) ? emit('startEdit', game) : null"
                  class="font-semibold truncate transition-colors"
                  :class="canEditGame(game) ? 'cursor-pointer hover:text-indigo-500' : 'cursor-default text-stone-500 dark:text-stone-400'"
                  :title="canEditGame(game) ? t('edit') : ''"
                >
                  {{ game.name }}
                </span>
                <span
                  class="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded"
                  :class="game.isPublic ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400'"
                >
                  {{ game.isPublic ? t('publicGame') : t('privateGame') }}
                </span>
              </div>
              <span class="text-xs opacity-60">
                {{ new Date(game.timestamp).toLocaleString() }} - {{ t('totalMoves', game.moveCount) }} - {{ t('recordAuthor', game.author) }}
              </span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="currentRecordId === game.id && canEditGame(game)"
                @click="emit('update', game.id)"
                class="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/80 transition-colors"
                :title="t('update')"
              >
                <RefreshCw class="w-4 h-4" />
              </button>
              <button
                @click="emit('import', game)"
                class="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/80 transition-colors"
                :title="t('analysisMode')"
              >
                <Download class="w-4 h-4" />
              </button>
              <button
                v-if="canEditGame(game)"
                @click="emit('delete', game.id)"
                class="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/80 transition-colors"
                :title="t('confirmDelete')"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
