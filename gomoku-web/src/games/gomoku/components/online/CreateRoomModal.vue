<script setup lang="ts">
import { ref, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { currentTheme, t } from '../../../../i18n';
import type { RuleMode } from '../../../../api/room-api';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'create', payload: { name: string; ruleMode: RuleMode }): void;
}>();

const roomName = ref('');
const ruleMode = ref<RuleMode>('standard');
const nameError = ref('');

function validate(): boolean {
  if (!roomName.value.trim()) {
    nameError.value = t('onlineRoomNameRequired');
    return false;
  }
  nameError.value = '';
  return true;
}

function handleCreate(): void {
  if (validate()) {
    emit('create', { name: roomName.value.trim(), ruleMode: ruleMode.value });
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    roomName.value = '';
    ruleMode.value = 'standard';
    nameError.value = '';
  }
});
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  >
    <div
      class="w-full max-w-sm p-6 rounded-2xl shadow-xl transition-colors"
      :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'"
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-5">
        <h3 class="text-lg font-bold">{{ t('onlineCreateRoom') }}</h3>
        <button
          @click="emit('close')"
          class="p-1 rounded-full transition-colors"
          :class="currentTheme === 'dark' ? 'hover:bg-stone-700' : 'hover:bg-stone-200'"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Room name -->
      <div class="mb-4">
        <label
          class="block text-sm font-medium mb-1.5"
          :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'"
        >
          {{ t('onlineRoomName') }}
        </label>
        <input
          v-model="roomName"
          type="text"
          :placeholder="t('onlineRoomNamePlaceholder')"
          class="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          :class="[
            currentTheme === 'dark'
              ? 'bg-stone-900 border-stone-700 text-stone-100'
              : 'bg-stone-50 border-stone-300 text-stone-900',
            nameError ? 'border-red-500 focus:ring-red-500' : '',
          ]"
          @keyup.enter="handleCreate"
          @input="nameError = ''"
        />
        <p v-if="nameError" class="mt-1.5 text-sm text-red-500">{{ nameError }}</p>
      </div>

      <!-- Rule mode -->
      <div class="mb-6">
        <span
          class="block text-sm font-medium mb-1.5"
          :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'"
        >
          {{ t('onlineRuleStandard') }} / {{ t('onlineRuleRenju') }}
        </span>
        <select
          v-model="ruleMode"
          class="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer"
          :class="
            currentTheme === 'dark'
              ? 'bg-stone-900 border-stone-700 text-stone-100'
              : 'bg-stone-50 border-stone-300 text-stone-900'
          "
        >
          <option value="standard">{{ t('onlineRuleStandard') }}</option>
          <option value="renju">{{ t('onlineRuleRenju') }}</option>
        </select>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          @click="emit('close')"
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          :class="
            currentTheme === 'dark'
              ? 'bg-stone-700 hover:bg-stone-600 text-stone-200'
              : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
          "
        >
          {{ t('cancel') }}
        </button>
        <button
          @click="handleCreate"
          class="px-4 py-2 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          {{ t('onlineCreateRoom') }}
        </button>
      </div>
    </div>
  </div>
</template>
