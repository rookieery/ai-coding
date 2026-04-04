<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { currentTheme, toggleTheme, toggleLocale, t } from './i18n';
import { Moon, Sun, Globe } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const switchLang = () => {
  toggleLocale();
};
</script>

<template>
  <div :class="currentTheme === 'dark' ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-800'" class="min-h-screen flex flex-col font-sans transition-colors duration-300">
    <!-- Top Navigation Bar -->
    <header class="w-full px-6 py-4 flex items-center justify-between border-b transition-colors"
            :class="currentTheme === 'dark' ? 'bg-stone-800/50 border-stone-700' : 'bg-white/50 border-stone-200'">
      <div class="flex items-center gap-6">
        <h1 class="text-xl font-bold tracking-tight" :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'">
          五林
        </h1>
        <nav class="flex items-center gap-2 bg-stone-200/50 dark:bg-stone-800/50 p-1 rounded-lg">
          <button 
            @click="router.push('/')"
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
            :class="route.path === '/' 
              ? (currentTheme === 'dark' ? 'bg-stone-700 text-white shadow-sm' : 'bg-white text-stone-900 shadow-sm') 
              : (currentTheme === 'dark' ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-700')"
          >
            {{ t('navAgent') }}
          </button>
          <button 
            @click="router.push('/game')"
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
            :class="route.path === '/game' 
              ? (currentTheme === 'dark' ? 'bg-stone-700 text-white shadow-sm' : 'bg-white text-stone-900 shadow-sm') 
              : (currentTheme === 'dark' ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-700')"
          >
            {{ t('navGame') }}
          </button>
        </nav>
      </div>
      
      <div class="flex items-center gap-2">
        <button @click="switchLang" class="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors" :title="t('language')">
          <Globe class="w-5 h-5" />
        </button>
        <button @click="toggleTheme" class="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors" :title="t('theme')">
          <Sun v-if="currentTheme === 'dark'" class="w-5 h-5" />
          <Moon v-else class="w-5 h-5" />
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col w-full">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

