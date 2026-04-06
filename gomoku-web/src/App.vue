<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { currentTheme, toggleTheme, toggleLocale, t } from './i18n';
import { Moon, Sun, Globe, User, LogOut, Settings, ChevronDown } from 'lucide-vue-next';
import { useGlobalAuth } from './composables/useAuth';
import SettingsModal from './components/SettingsModal.vue';

const route = useRoute();
const router = useRouter();
const auth = useGlobalAuth();

// 计算属性
const userRole = computed(() => auth.user?.value?.role);
const userRating = computed(() => auth.user?.value?.rating || 1200);
const isAuthenticated = computed(() => auth.isAuthenticated.value);

// 用户下拉菜单状态
const isUserDropdownOpen = ref(false);

// 个人设置弹窗状态
const isSettingsModalOpen = ref(false);

const switchLang = () => {
  toggleLocale();
};

// 登出
const handleLogout = async () => {
  try {
    await auth.logout();
    isUserDropdownOpen.value = false;
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

// 打开个人设置弹窗
const goToSettings = () => {
  isUserDropdownOpen.value = false;
  isSettingsModalOpen.value = true;
};

// 点击外部关闭下拉菜单
const closeDropdown = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.user-dropdown')) {
    isUserDropdownOpen.value = false;
  }
};

// 添加全局点击监听
window.addEventListener('click', closeDropdown);

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('click', closeDropdown);
});
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
        <nav class="flex items-center gap-2 bg-stone-200/50 dark:bg-stone-800/50 p-1 rounded-lg" v-if="isAuthenticated">
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
          <button
            v-if="userRole === 'ADMIN'"
            @click="router.push('/admin')"
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
            :class="route.path === '/admin'
              ? (currentTheme === 'dark' ? 'bg-stone-700 text-white shadow-sm' : 'bg-white text-stone-900 shadow-sm')
              : (currentTheme === 'dark' ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-700')"
          >
            {{ t('adminNav') }}
          </button>
        </nav>
      </div>
      
      <div class="flex items-center gap-4">
        <button @click="switchLang" class="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors" :title="t('language')">
          <Globe class="w-5 h-5" />
        </button>
        <button @click="toggleTheme" class="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors" :title="currentTheme === 'dark' ? t('themeLight') : t('themeDark')">
          <Sun v-if="currentTheme === 'dark'" class="w-5 h-5" />
          <Moon v-else class="w-5 h-5" />
        </button>

        <!-- 用户区域 -->
        <div class="relative user-dropdown">
          <div v-if="isAuthenticated">
            <button
              @click="isUserDropdownOpen = !isUserDropdownOpen"
              class="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {{ auth.usernameInitial }}
              </div>
              <span class="font-medium text-sm hidden sm:block">{{ auth.username }}</span>
              <ChevronDown class="w-4 h-4" />
            </button>

            <!-- 下拉菜单 -->
            <div
              v-if="isUserDropdownOpen"
              class="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border overflow-hidden z-50"
              :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'"
            >
              <!-- 用户信息摘要 -->
              <div class="p-4 border-b" :class="currentTheme === 'dark' ? 'border-stone-700' : 'border-stone-100'">
                <p class="font-medium text-sm">{{ auth.username }}</p>
                <p class="text-xs opacity-60 mt-1">等级分: {{ userRating }}</p>
              </div>

              <!-- 菜单项 -->
              <button
                @click="goToSettings"
                class="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'"
              >
                <Settings class="w-4 h-4" />
                <span class="text-sm">{{ t('settings') }}</span>
              </button>
              <button
                @click="handleLogout"
                class="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-red-600 dark:text-red-400"
              >
                <LogOut class="w-4 h-4" />
                <span class="text-sm">{{ t('logout') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col w-full">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <keep-alive :include="['AgentView', 'GameView', 'AdminView']">
            <component :is="Component" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <!-- 个人设置弹窗组件 -->
    <SettingsModal :open="isSettingsModalOpen" @update:open="isSettingsModalOpen = $event" @close="isSettingsModalOpen = false" />
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

