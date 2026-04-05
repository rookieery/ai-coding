<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { adminApi, type AdminUser } from '../api/admin-api';
import { Trash2, AlertCircle, ChevronLeft, ChevronRight, Loader } from 'lucide-vue-next';
import { currentTheme, t } from '../i18n';

const router = useRouter();
const auth = useAuth();

// 状态
const users = ref<AdminUser[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const deleteError = ref<string | null>(null);
const userToDelete = ref<string | null>(null);

// 分页
const currentPage = ref(1);
const pageSize = ref(20);
const totalUsers = ref(0);
const totalPages = ref(1);

// 检查用户是否为管理员
const isAdmin = computed(() => auth.user?.value?.role === 'ADMIN');

// 监听管理员权限变化，如果没有权限则重定向到首页
watch(isAdmin, (newIsAdmin) => {
  if (!newIsAdmin) {
    router.push('/');
  }
}, { immediate: true });

// 获取用户列表
const fetchUsers = async () => {
  if (!isAdmin.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const result = await adminApi.getUsers(currentPage.value, pageSize.value);
    users.value = result.users;
    totalUsers.value = result.pagination.total;
    totalPages.value = result.pagination.totalPages;
  } catch (err: any) {
    console.error('Failed to fetch users:', err);
    error.value = err.message || '获取用户列表失败';
  } finally {
    isLoading.value = false;
  }
};

// 删除用户
const deleteUser = async (userId: string) => {
  if (!isAdmin.value) return;

  deleteError.value = null;

  try {
    await adminApi.deleteUser(userId);
    // 删除成功后重新获取用户列表
    fetchUsers();
    userToDelete.value = null;
  } catch (err: any) {
    console.error('Failed to delete user:', err);
    deleteError.value = err.message || '删除用户失败';
  }
};

// 确认删除
const confirmDelete = (userId: string) => {
  userToDelete.value = userId;
};

// 取消删除
const cancelDelete = () => {
  userToDelete.value = null;
  deleteError.value = null;
};

// 分页控制
const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchUsers();
};

// 初始化
onMounted(() => {
  if (isAdmin.value) {
    fetchUsers();
  }
});
</script>

<template>
  <div :class="currentTheme === 'dark' ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-800'" class="min-h-screen py-8 font-sans transition-colors duration-300">
    <div class="container mx-auto px-4 max-w-6xl">
      <!-- 页面标题 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2 dark:text-stone-300">权限设置</h1>
        <p class="opacity-70 dark:text-stone-400">管理所有普通用户账号，可查看用户信息和删除账号</p>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="mb-6 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 flex items-center gap-3">
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
        <span>{{ error }}</span>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <Loader class="w-8 h-8 animate-spin text-indigo-500" />
      </div>

      <!-- 用户表格 -->
      <div v-else-if="users.length > 0" class="bg-white dark:bg-stone-800 rounded-xl shadow-lg overflow-hidden border dark:border-stone-700">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b dark:border-stone-700">
                <th class="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider dark:text-stone-300">用户名</th>
                <th class="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider dark:text-stone-300">密码</th>
                <th class="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider dark:text-stone-300">私有棋谱数量</th>
                <th class="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider dark:text-stone-300">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y dark:divide-stone-700">
              <tr v-for="user in users" :key="user.id" class="hover:bg-stone-50 dark:hover:bg-stone-750 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex flex-col">
                    <span class="font-medium dark:text-stone-300">{{ user.username }}</span>
                    <span class="text-xs opacity-60 dark:text-stone-400">{{ user.phone }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-mono dark:text-stone-300">••••••••</span>
                  <p class="text-xs opacity-60 mt-1 dark:text-stone-400">密码已加密存储</p>
                </td>
                <td class="px-6 py-4">
                  <span class="font-medium dark:text-stone-300">{{ user.privateGameCount }}</span>
                  <p class="text-xs opacity-60 mt-1 dark:text-stone-400">个私有棋谱</p>
                </td>
                <td class="px-6 py-4">
                  <button
                    @click="confirmDelete(user.id)"
                    class="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/80 transition-colors flex items-center gap-2"
                  >
                    <Trash2 class="w-4 h-4" />
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页控件 -->
        <div v-if="totalPages > 1" class="px-6 py-4 border-t dark:border-stone-700 flex items-center justify-between">
          <div class="text-sm opacity-70 dark:text-stone-400">
            显示 {{ Math.min((currentPage - 1) * pageSize + 1, totalUsers) }} - {{ Math.min(currentPage * pageSize, totalUsers) }} 条，共 {{ totalUsers }} 条
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'"
            >
              <ChevronLeft class="w-5 h-5" />
            </button>

            <div class="flex items-center gap-1">
              <button
                v-for="page in Math.min(5, totalPages)"
                :key="page"
                @click="goToPage(page)"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                :class="[
                  currentPage === page
                    ? 'bg-indigo-600 text-white'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                ]"
              >
                {{ page }}
              </button>
              <span v-if="totalPages > 5" class="px-2 opacity-50 dark:text-stone-500">...</span>
            </div>

            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'"
            >
              <ChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-center py-12">
        <div class="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center mx-auto mb-4">
          <AlertCircle class="w-8 h-8 opacity-50 dark:text-stone-400" />
        </div>
        <h3 class="text-xl font-semibold mb-2 dark:text-stone-300">暂无用户</h3>
        <p class="opacity-70 dark:text-stone-400">当前没有其他用户注册</p>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="userToDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-md p-6 rounded-2xl shadow-xl transition-colors" :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'">
        <div class="mb-6">
          <h3 class="text-xl font-bold mb-2">确认删除用户</h3>
          <p class="opacity-70">删除后此用户的所有数据（包括棋谱）将被永久删除，且需要重新注册才能使用系统。</p>
          <p class="opacity-70 mt-2">此操作不可撤销，请谨慎操作。</p>
        </div>

        <!-- 删除错误提示 -->
        <div v-if="deleteError" class="mb-4 p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-sm">
          {{ deleteError }}
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="cancelDelete"
            class="px-4 py-2 rounded-lg font-medium transition-colors"
            :class="currentTheme === 'dark' ? 'bg-stone-700 hover:bg-stone-600 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'"
          >
            取消
          </button>
          <button
            @click="deleteUser(userToDelete)"
            class="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dark .dark\:bg-stone-750 {
  background-color: rgb(41 37 36 / 0.5);
}
</style>