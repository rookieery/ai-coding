<script setup lang="ts">
import { ref, computed } from 'vue';
import { t, currentTheme } from '../../../i18n';
import { BLACK, WHITE, EMPTY } from '../gameLogic';

const props = defineProps<{
  candidates: number[][][];
  selectedCandidateIndex: number;
  editMode: boolean;
  editTool: 'black' | 'white' | 'eraser';
}>();

const emit = defineEmits<{
  (e: 'selectCandidate', index: number): void;
  (e: 'toggleEditMode'): void;
  (e: 'setEditTool', tool: 'black' | 'white' | 'eraser'): void;
  (e: 'confirm'): void;
  (e: 'close'): void;
}>();

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
</script>

<template>
  <div
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg rounded-xl shadow-2xl border-2 transition-colors duration-300"
    :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-600' : 'bg-white border-stone-300'"
  >
    <div class="p-4">
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
          class="mt-3 flex gap-2"
        >
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
