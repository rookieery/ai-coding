<script setup lang="ts">
import { RotateCcw, Undo2, Lightbulb, User, Bot, BookOpen, Brain, Eye, EyeOff, Save, List } from 'lucide-vue-next';
import type { Difficulty, RuleMode } from '../gameLogic';
import { t, currentTheme } from '../../i18n';

const props = defineProps<{
  mode: 'pvp' | 'pve';
  currentPlayer: number;
  winner: number;
  moveHistoryLength: number;
  aiDifficulty: Difficulty;
  aiRole: 'first' | 'second';
  ruleMode: RuleMode;
  isAnalysisMode: boolean;
  showThinking: boolean;
  showSteps: boolean;
  isAiThinking: boolean;
}>();

const emit = defineEmits(['setMode', 'showHint', 'undo', 'resetGame', 'setAiDifficulty', 'setAiRole', 'toggleAnalysisMode', 'toggleThinking', 'setRuleMode', 'toggleSteps', 'saveGame', 'showRecords']);
</script>

<template>
  <div class="flex flex-col items-center gap-4 mb-8 w-full max-w-2xl px-4">
    <div class="flex flex-col items-center w-full gap-3">
      <div class="flex rounded-lg shadow-sm p-1 border z-10 transition-colors"
           :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'">
        

        <button
          @click="emit('setMode', 'pvp')"
          class="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors text-sm font-medium"
          :class="mode === 'pvp' ? (currentTheme === 'dark' ? 'bg-stone-700 text-white shadow' : 'bg-stone-800 text-white shadow') : (currentTheme === 'dark' ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100')"
        >
          <User class="w-4 h-4" />
          {{ t('pvp') }}
        </button>
        <button
          @click="emit('setMode', 'pve')"
          class="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors text-sm font-medium"
          :class="mode === 'pve' ? (currentTheme === 'dark' ? 'bg-stone-700 text-white shadow' : 'bg-stone-800 text-white shadow') : (currentTheme === 'dark' ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100')"
        >
          <Bot class="w-4 h-4" />
          {{ t('pve') }}
        </button>


      </div>
      
      <div 
        class="flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out flex-wrap justify-center"
        :class="mode === 'pve' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'"
      >
        <select
          :value="aiRole"
          @change="emit('setAiRole', ($event.target as HTMLSelectElement).value)"
          :disabled="isAnalysisMode"
          class="border text-sm rounded-lg focus:ring-stone-500 focus:border-stone-500 block p-1.5 sm:p-2 outline-none shadow-sm cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'"
        >
          <option value="second">{{ t('roleSecond') }}</option>
          <option value="first">{{ t('roleFirst') }}</option>
        </select>

        <button
          @click="emit('toggleThinking')"
          class="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg transition-colors shadow-sm text-sm font-medium"
          :class="showThinking ? (currentTheme === 'dark' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400 hover:bg-emerald-900/70' : 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200') : (currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50')"
        >
          <Brain class="w-4 h-4" />
          {{ showThinking ? t('hideThinking') : t('showThinking') }}
        </button>
        <button
          @click="emit('toggleAnalysisMode')"
          class="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg transition-colors shadow-sm text-sm font-medium"
          :class="isAnalysisMode ? (currentTheme === 'dark' ? 'bg-indigo-900/50 border-indigo-700 text-indigo-400 hover:bg-indigo-900/70' : 'bg-indigo-100 border-indigo-300 text-indigo-700 hover:bg-indigo-200') : (currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50')"
        >
          <BookOpen class="w-4 h-4" />
          {{ isAnalysisMode ? t('exitAnalysis') : t('analysisMode') }}
        </button>
      </div>
    </div>

    <div class="flex gap-2 sm:gap-3 flex-wrap justify-center">
      <select
        :value="ruleMode"
        @change="emit('setRuleMode', ($event.target as HTMLSelectElement).value)"
        :disabled="isAnalysisMode"
        class="px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm font-medium outline-none cursor-pointer"
        :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'"
      >
        <option value="standard">{{ t('ruleStandard') }}</option>
        <option value="renju">{{ t('ruleRenju') }}</option>
      </select>

      <select
        :value="aiDifficulty"
        @change="emit('setAiDifficulty', ($event.target as HTMLSelectElement).value)"
        :disabled="isAnalysisMode"
        class="px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm font-medium outline-none cursor-pointer"
        :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'"
      >
        <option value="beginner">{{ t('difficultyBeginner') }}</option>
        <option value="intermediate">{{ t('difficultyIntermediate') }}</option>
        <option value="advanced">{{ t('difficultyAdvanced') }}</option>
        <option value="expert">{{ t('difficultyExpert') }}</option>
        <option value="neural">{{ t('difficultyNeural') }}</option>
      </select>

      <div class="group relative">
        <button
          @click="emit('showHint')"
          :disabled="winner !== 0 || isAiThinking"
          class="flex items-center justify-center w-10 h-10 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'"
        >
          <Lightbulb class="w-5 h-5" />
        </button>
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
          {{ t('hint') }}
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      </div>

      <div class="group relative">
        <button
          @click="emit('undo')"
          :disabled="moveHistoryLength === 0"
          class="flex items-center justify-center w-10 h-10 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'"
        >
          <Undo2 class="w-5 h-5" />
        </button>
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
          {{ t('undo') }}
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      </div>

      <div class="group relative">
        <button
          @click="emit('resetGame')"
          class="flex items-center justify-center w-10 h-10 rounded-lg transition-colors shadow-sm"
          :class="currentTheme === 'dark' ? 'bg-stone-700 text-white hover:bg-stone-600' : 'bg-stone-800 text-white hover:bg-stone-700'"
        >
          <RotateCcw class="w-5 h-5" />
        </button>
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
          {{ t('restart') }}
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      </div>

      <div class="group relative">
        <button
          @click="emit('toggleSteps')"
          class="flex items-center justify-center w-10 h-10 border rounded-lg transition-colors shadow-sm"
          :class="showSteps ? (currentTheme === 'dark' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400 hover:bg-emerald-900/70' : 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200') : (currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50')"
        >
          <Eye v-if="showSteps" class="w-5 h-5" />
          <EyeOff v-else class="w-5 h-5" />
        </button>
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
          {{ showSteps ? t('hideSteps') : t('showSteps') }}
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      </div>

      <div class="group relative">
        <button
          @click="emit('saveGame')"
          class="flex items-center justify-center w-10 h-10 border rounded-lg transition-colors shadow-sm"
          :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'"
        >
          <Save class="w-5 h-5" />
        </button>
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
          {{ t('saveGame') }}
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      </div>

      <div class="group relative">
        <button
          @click="emit('showRecords')"
          class="flex items-center justify-center w-10 h-10 border rounded-lg transition-colors shadow-sm"
          :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'"
        >
          <List class="w-5 h-5" />
        </button>
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
          {{ t('gameRecords') }}
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      </div>
    </div>
  </div>
</template>
