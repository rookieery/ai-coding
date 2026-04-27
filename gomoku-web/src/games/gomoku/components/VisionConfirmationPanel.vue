<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { t, currentTheme } from '../../../i18n';
import { BLACK, WHITE, EMPTY } from '../gameLogic';
import type { SelectionArea } from '../composables/useGameState';

const props = defineProps<{
  candidates: number[][][];
  selectedCandidateIndex: number;
  editMode: boolean;
  editTool: 'black' | 'white' | 'eraser';
  selectedArea?: SelectionArea | null;
  batchMoveOffset?: number;
}>();

const emit = defineEmits<{
  (e: 'selectCandidate', index: number): void;
  (e: 'toggleEditMode'): void;
  (e: 'setEditTool', tool: 'black' | 'white' | 'eraser'): void;
  (e: 'confirm'): void;
  (e: 'close'): void;
  (e: 'batchMove', direction: 'up' | 'down' | 'left' | 'right'): void;
  (e: 'setBatchMoveOffset', offset: number): void;
  (e: 'clearSelection'): void;
}>();

// Draggable panel state
const panelRef = ref<HTMLElement | null>(null);
const isDraggingPanel = ref(false);
const panelPosition = ref({ x: 0, y: 0 });
const dragStart = ref({ x: 0, y: 0 });
const hasMoved = ref(false);

const localBatchMoveOffset = ref(props.batchMoveOffset || 1);

const handleSelectCandidate = (index: number) => {
  emit('selectCandidate', index);
};

const handleToggleEditMode = () => {
  emit('toggleEditMode');
};

const handleSetEditTool = (tool: 'black' | 'white' | 'eraser') => {
  emit('setEditTool', tool);
};

const handleConfirm = () => {
  emit('confirm');
};

const handleClose = () => {
  emit('close');
};

const handleBatchMove = (direction: 'up' | 'down' | 'left' | 'right') => {
  emit('batchMove', direction);
};

const handleOffsetChange = (offset: number) => {
  localBatchMoveOffset.value = offset;
  emit('setBatchMoveOffset', offset);
};

const handleClearSelection = () => {
  emit('clearSelection');
};

// Panel drag handlers
const handlePanelMouseDown = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('button')) return;
  isDraggingPanel.value = true;
  hasMoved.value = false;
  dragStart.value = {
    x: e.clientX - panelPosition.value.x,
    y: e.clientY - panelPosition.value.y
  };
  e.preventDefault();
};

const handlePanelMouseMove = (e: MouseEvent) => {
  if (!isDraggingPanel.value) return;
  const newX = e.clientX - dragStart.value.x;
  const newY = e.clientY - dragStart.value.y;
  if (Math.abs(newX - panelPosition.value.x) > 5 || Math.abs(newY - panelPosition.value.y) > 5) {
    hasMoved.value = true;
  }
  panelPosition.value = { x: newX, y: newY };
};

const handlePanelMouseUp = () => {
  isDraggingPanel.value = false;
};

const panelStyle = computed(() => {
  if (panelPosition.value.x === 0 && panelPosition.value.y === 0) {
    return {};
  }
  return {
    transform: `translate(calc(-50% + ${panelPosition.value.x}px), ${panelPosition.value.y}px)`
  };
});

const hasSelectedArea = computed(() => props.selectedArea !== null);

onMounted(() => {
  window.addEventListener('mousemove', handlePanelMouseMove);
  window.addEventListener('mouseup', handlePanelMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handlePanelMouseMove);
  window.removeEventListener('mouseup', handlePanelMouseUp);
});
</script>

<template>
  <div
    ref="panelRef"
    @mousedown="handlePanelMouseDown"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg rounded-xl shadow-2xl border-2 transition-colors duration-300 cursor-move select-none"
    :class="[
      currentTheme === 'dark' ? 'bg-stone-800 border-stone-600' : 'bg-white border-stone-300',
      isDraggingPanel ? 'shadow-3xl scale-[1.02]' : ''
    ]"
    :style="panelStyle"
  >
    <div class="p-4 cursor-default">
      <!-- Drag indicator -->
      <div class="flex items-center justify-center mb-2 opacity-50">
        <div class="flex gap-1">
          <div class="w-2 h-2 rounded-full" :class="currentTheme === 'dark' ? 'bg-stone-500' : 'bg-stone-400'"></div>
          <div class="w-2 h-2 rounded-full" :class="currentTheme === 'dark' ? 'bg-stone-500' : 'bg-stone-400'"></div>
          <div class="w-2 h-2 rounded-full" :class="currentTheme === 'dark' ? 'bg-stone-500' : 'bg-stone-400'"></div>
        </div>
      </div>
      <div class="flex items-center justify-between mb-3">
        <h3
          class="text-lg font-bold"
          :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'"
        >
          {{ t('visionConfirmTitle') }}
        </h3>
        <button
          @click="handleClose"
          class="p-1 rounded-lg transition-colors"
          :class="currentTheme === 'dark' ? 'hover:bg-stone-700 text-stone-400' : 'hover:bg-stone-100 text-stone-500'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="mb-4">
        <p
          class="text-sm mb-2"
          :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-600'"
        >
          {{ t('visionSelectCandidate') }}
        </p>
        <div class="flex gap-2">
          <button
            v-for="(_, index) in candidates"
            :key="index"
            @click="handleSelectCandidate(index)"
            class="flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 border-2"
            :class="[
              selectedCandidateIndex === index
                ? (currentTheme === 'dark' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-indigo-500 border-indigo-400 text-white')
                : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-200 hover:bg-stone-600' : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200')
            ]"
          >
            {{ t('visionCandidateN', index + 1) }}
          </button>
        </div>
      </div>

      <div class="mb-4">
        <div class="flex items-center justify-between">
          <span
            class="text-sm font-medium"
            :class="currentTheme === 'dark' ? 'text-stone-200' : 'text-stone-700'"
          >
            {{ t('visionManualAdjust') }}
          </span>
          <button
            @click="handleToggleEditMode"
            class="relative w-12 h-6 rounded-full transition-colors duration-200"
            :class="editMode
              ? (currentTheme === 'dark' ? 'bg-indigo-600' : 'bg-indigo-500')
              : (currentTheme === 'dark' ? 'bg-stone-600' : 'bg-stone-300')"
          >
            <span
              class="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
              :class="editMode ? 'left-7' : 'left-1'"
            />
          </button>
        </div>

        <div
          v-if="editMode"
          class="mt-3 space-y-3"
        >
          <!-- Edit tools -->
          <div class="flex gap-2">
            <button
              @click="handleSetEditTool('black')"
              class="flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-200 border-2 flex items-center justify-center gap-2"
              :class="[
                editTool === 'black'
                  ? (currentTheme === 'dark' ? 'bg-stone-900 border-stone-700 text-white' : 'bg-stone-800 border-stone-600 text-white')
                  : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-200 hover:bg-stone-600' : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200')
              ]"
            >
              <span class="w-4 h-4 rounded-full bg-stone-950 border border-stone-400" />
              {{ t('visionToolBlack') }}
            </button>
            <button
              @click="handleSetEditTool('white')"
              class="flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-200 border-2 flex items-center justify-center gap-2"
              :class="[
                editTool === 'white'
                  ? (currentTheme === 'dark' ? 'bg-stone-900 border-stone-700 text-white' : 'bg-stone-800 border-stone-600 text-white')
                  : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-200 hover:bg-stone-600' : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200')
              ]"
            >
              <span class="w-4 h-4 rounded-full bg-white border border-stone-400" />
              {{ t('visionToolWhite') }}
            </button>
            <button
              @click="handleSetEditTool('eraser')"
              class="flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-200 border-2 flex items-center justify-center gap-2"
              :class="[
                editTool === 'eraser'
                  ? (currentTheme === 'dark' ? 'bg-red-900 border-red-700 text-white' : 'bg-red-100 border-red-400 text-red-700')
                  : (currentTheme === 'dark' ? 'bg-stone-700 border-stone-600 text-stone-200 hover:bg-stone-600' : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200')
              ]"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {{ t('visionToolEraser') }}
            </button>
          </div>

          <!-- Batch move controls -->
          <div
            class="p-3 rounded-lg border-2"
            :class="currentTheme === 'dark' ? 'bg-stone-900/50 border-stone-700' : 'bg-stone-50 border-stone-200'"
          >
            <div class="flex items-center justify-between mb-2">
              <span
                class="text-sm font-medium"
                :class="currentTheme === 'dark' ? 'text-stone-200' : 'text-stone-700'"
              >
                {{ t('visionBatchMove') }}
              </span>
              <button
                v-if="hasSelectedArea"
                @click="handleClearSelection"
                class="text-xs px-2 py-1 rounded transition-colors"
                :class="currentTheme === 'dark' ? 'text-stone-400 hover:text-stone-300' : 'text-stone-500 hover:text-stone-700'"
              >
                {{ t('visionClearSelection') }}
              </button>
            </div>

            <p
              class="text-xs mb-3"
              :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
            >
              {{ t('visionBatchMoveHint') }}
            </p>

            <!-- Offset selector -->
            <div class="flex items-center gap-2 mb-3">
              <span
                class="text-xs"
                :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
              >
                {{ t('visionMoveOffset') }}
              </span>
              <div class="flex gap-1">
                <button
                  v-for="offset in [1, 2, 3]"
                  :key="offset"
                  @click="handleOffsetChange(offset)"
                  class="w-7 h-7 rounded text-sm font-medium transition-all"
                  :class="[
                    localBatchMoveOffset === offset
                      ? (currentTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white')
                      : (currentTheme === 'dark' ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-stone-200 text-stone-600 hover:bg-stone-300')
                  ]"
                >
                  {{ offset }}
                </button>
              </div>
            </div>

            <!-- Direction buttons -->
            <div class="flex flex-col items-center gap-1">
              <button
                @click="handleBatchMove('up')"
                :disabled="!hasSelectedArea"
                class="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                :class="[
                  hasSelectedArea
                    ? (currentTheme === 'dark' ? 'bg-stone-700 hover:bg-indigo-600 text-stone-200' : 'bg-stone-200 hover:bg-indigo-500 text-stone-700 hover:text-white')
                    : (currentTheme === 'dark' ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-stone-100 text-stone-400 cursor-not-allowed')
                ]"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <div class="flex gap-1">
                <button
                  @click="handleBatchMove('left')"
                  :disabled="!hasSelectedArea"
                  class="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                  :class="[
                    hasSelectedArea
                      ? (currentTheme === 'dark' ? 'bg-stone-700 hover:bg-indigo-600 text-stone-200' : 'bg-stone-200 hover:bg-indigo-500 text-stone-700 hover:text-white')
                      : (currentTheme === 'dark' ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-stone-100 text-stone-400 cursor-not-allowed')
                  ]"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  @click="handleBatchMove('down')"
                  :disabled="!hasSelectedArea"
                  class="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                  :class="[
                    hasSelectedArea
                      ? (currentTheme === 'dark' ? 'bg-stone-700 hover:bg-indigo-600 text-stone-200' : 'bg-stone-200 hover:bg-indigo-500 text-stone-700 hover:text-white')
                      : (currentTheme === 'dark' ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-stone-100 text-stone-400 cursor-not-allowed')
                  ]"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  @click="handleBatchMove('right')"
                  :disabled="!hasSelectedArea"
                  class="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                  :class="[
                    hasSelectedArea
                      ? (currentTheme === 'dark' ? 'bg-stone-700 hover:bg-indigo-600 text-stone-200' : 'bg-stone-200 hover:bg-indigo-500 text-stone-700 hover:text-white')
                      : (currentTheme === 'dark' ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-stone-100 text-stone-400 cursor-not-allowed')
                  ]"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Selection info -->
            <div
              v-if="hasSelectedArea"
              class="mt-3 text-xs text-center"
              :class="currentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'"
            >
              {{ t('visionSelectionActive') }}
            </div>
          </div>
        </div>
      </div>

      <button
        @click="handleConfirm"
        class="w-full py-3 rounded-lg font-bold transition-all duration-200"
        :class="currentTheme === 'dark'
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
          : 'bg-emerald-500 hover:bg-emerald-400 text-white'"
      >
        {{ t('visionConfirmStart') }}
      </button>
    </div>
  </div>
</template>
