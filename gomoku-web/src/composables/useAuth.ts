import { ref, computed } from 'vue';
import { authApi, type User } from '../api/auth-api';
import { useRouter } from 'vue-router';

/**
 * 认证状态管理
 */
export function useAuth() {
  const router = useRouter();

  // 状态
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 初始化：从localStorage加载
  const init = () => {
    token.value = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        // 验证用户对象结构
        if (
          parsedUser &&
          typeof parsedUser === 'object' &&
          typeof parsedUser.id === 'string' &&
          typeof parsedUser.username === 'string' &&
          typeof parsedUser.phone === 'string'
        ) {
          user.value = parsedUser;
        } else {
          console.warn('Invalid user data structure in localStorage, clearing auth');
          clearAuth();
        }
      } catch {
        // 解析失败，清除本地存储
        console.warn('Failed to parse user data from localStorage, clearing auth');
        clearAuth();
      }
    }

    // 如果有token，异步验证其有效性
    if (token.value) {
      // 使用setTimeout避免阻塞初始化
      setTimeout(() => {
        fetchCurrentUser().catch(() => {
          // 静默处理错误，fetchCurrentUser内部已处理清理
        });
      }, 0);
    }
  };

  // 计算属性
  const isAuthenticated = computed(() => !!user.value && !!token.value);
  const username = computed(() => {
    const name = user.value?.username;
    return typeof name === 'string' ? name : '';
  });
  const userAvatar = computed(() => user.value?.avatar || '');
  const usernameInitial = computed(() => {
    const name = username.value;
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '';
  });

  // 登录
  const login = async (phone: string, password: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await authApi.login({ phone, password });
      user.value = response.user;
      token.value = response.token;
      authApi.saveAuth(response.user, response.token);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 注册
  const register = async (userData: {
    phone: string;
    email?: string;
    username: string;
    password: string;
    avatar?: string;
  }) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await authApi.register(userData);
      user.value = response.user;
      token.value = response.token;
      authApi.saveAuth(response.user, response.token);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 登出
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  // 更新用户信息
  const updateUser = async (data: {
    username?: string;
    email?: string;
    avatar?: string;
  }) => {
    isLoading.value = true;
    error.value = null;

    try {
      const updatedUser = await authApi.updateUser(data);
      user.value = updatedUser;
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 修改密码
  const changePassword = async (oldPassword: string, newPassword: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      await authApi.changePassword({ oldPassword, newPassword });
    } catch (err) {
      error.value = err instanceof Error ? err.message : '修改密码失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 获取当前用户信息（从服务器刷新）
  const fetchCurrentUser = async () => {
    if (!authApi.isLoggedIn()) {
      clearAuth();
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const currentUser = await authApi.getCurrentUser();
      user.value = currentUser;
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (err) {
      // 如果获取失败，可能是token过期，清除认证信息
      if (err instanceof Error && (err.message.includes('Unauthorized') || err.message.includes('Invalid'))) {
        clearAuth();
      }
      error.value = err instanceof Error ? err.message : '获取用户信息失败';
    } finally {
      isLoading.value = false;
    }
  };

  // 清除认证信息
  const clearAuth = () => {
    user.value = null;
    token.value = null;
    authApi.clearAuth();
  };

  // 初始化
  init();

  // 监听路由变化，检查认证状态（可选）
  // 这里可以添加路由守卫逻辑

  return {
    // 状态
    user,
    token,
    isLoading,
    error,

    // 计算属性
    isAuthenticated,
    username,
    userAvatar,
    usernameInitial,

    // 方法
    login,
    register,
    logout,
    updateUser,
    changePassword,
    fetchCurrentUser,
    clearAuth,
  };
}

// 全局单例（可选）
let authInstance: ReturnType<typeof useAuth> | null = null;

export function useGlobalAuth() {
  if (!authInstance) {
    authInstance = useAuth();
  }
  return authInstance;
}