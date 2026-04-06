<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogIn, UserPlus, Phone, Lock, User, Mail, Eye, EyeOff } from 'lucide-vue-next';
import { currentTheme, t } from '../i18n';
import { useGlobalAuth } from '../composables/useAuth';

const router = useRouter();
const auth = useGlobalAuth();

// 登录/注册表单数据
const isLoginMode = ref(true); // true: 登录, false: 注册
const phone = ref('');
const email = ref('');
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const avatar = ref('');

// 状态
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// 密码可见性
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// 表单验证
const validateForm = () => {
  errorMessage.value = '';

  if (!phone.value || !password.value) {
    errorMessage.value = t('errorPhoneRequired');
    return false;
  }

  // 手机号格式验证
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone.value)) {
    errorMessage.value = t('errorPhoneInvalid');
    return false;
  }

  if (!isLoginMode.value) {
    // 注册额外验证
    if (!username.value) {
      errorMessage.value = t('errorUsernameRequired');
      return false;
    }
    if (username.value.length < 3 || username.value.length > 50) {
      errorMessage.value = t('errorUsernameLength');
      return false;
    }
    if (password.value.length < 6) {
      errorMessage.value = t('errorPasswordLength');
      return false;
    }
    if (password.value !== confirmPassword.value) {
      errorMessage.value = t('errorPasswordMismatch');
      return false;
    }
  }

  return true;
};

// 提交表单
const submitForm = async () => {
  if (!validateForm()) return;

  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    if (isLoginMode.value) {
      // 登录 - 使用全局auth实例
      await auth.login(phone.value, password.value);

      successMessage.value = t('loginSuccess');
      setTimeout(() => {
        router.push('/'); // 跳转到智能体首页
      }, 1000);
    } else {
      // 注册 - 使用全局auth实例
      await auth.register({
        phone: phone.value,
        email: email.value || undefined,
        username: username.value,
        password: password.value,
        avatar: avatar.value || undefined,
      });

      successMessage.value = t('registerSuccess');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    }
  } catch (error: any) {
    console.error('Auth error:', error);
    errorMessage.value = error.response?.data?.message || error.message || t('requestFailed');
  } finally {
    isLoading.value = false;
  }
};

// 切换登录/注册模式
const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value;
  errorMessage.value = '';
  successMessage.value = '';
};
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] px-4">
    <div class="w-full max-w-md">
      <!-- Logo/标题 -->
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <span class="text-3xl text-white font-bold">五</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight" :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'">
          五林
        </h1>
        <p class="mt-2" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
          {{ isLoginMode ? t('loginSubtitleLogin') : t('loginSubtitleRegister') }}
        </p>
      </div>

      <!-- 表单卡片 -->
      <div class="rounded-2xl shadow-lg overflow-hidden transition-all duration-300"
           :class="currentTheme === 'dark' ? 'bg-stone-800/50 border border-stone-700' : 'bg-white/50 border border-stone-200'">
        <div class="p-8">
          <!-- 错误/成功消息 -->
          <div v-if="errorMessage"
               class="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {{ errorMessage }}
          </div>
          <div v-if="successMessage"
               class="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
            {{ successMessage }}
          </div>

          <form @submit.prevent="submitForm">
            <!-- 手机号 -->
            <div class="mb-6">
              <label class="block text-sm font-medium mb-2"
                     :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">
                {{ t('phoneLabel') }}
              </label>
              <div class="relative">
                <Phone class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                       :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'" />
                <input
                  v-model="phone"
                  type="tel"
                  :placeholder="t('phonePlaceholder')"
                  class="w-full pl-12 pr-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  :class="currentTheme === 'dark'
                    ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder-stone-500'
                    : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400'"
                />
              </div>
            </div>

            <!-- 密码 -->
            <div class="mb-6">
              <label class="block text-sm font-medium mb-2"
                     :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">
                {{ t('passwordLabel') }}
              </label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                      :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'" />
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="isLoginMode ? t('passwordPlaceholderLogin') : t('passwordPlaceholderRegister')"
                  class="w-full pl-12 pr-12 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  :class="currentTheme === 'dark'
                    ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder-stone-500'
                    : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400'"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                  :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
                  :title="showPassword ? t('hidePassword') : t('showPassword')"
                >
                  <EyeOff v-if="showPassword" class="w-5 h-5" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- 注册额外字段 -->
            <div v-if="!isLoginMode">
              <!-- 用户名 -->
              <div class="mb-6">
                <label class="block text-sm font-medium mb-2"
                       :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">
                  {{ t('usernameLabel') }}
                </label>
                <div class="relative">
                  <User class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                        :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'" />
                  <input
                    v-model="username"
                    type="text"
                    :placeholder="t('usernamePlaceholder')"
                    class="w-full pl-12 pr-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    :class="currentTheme === 'dark'
                      ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder-stone-500'
                      : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400'"
                  />
                </div>
              </div>

              <!-- 确认密码 -->
              <div class="mb-6">
                <label class="block text-sm font-medium mb-2"
                       :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">
                  {{ t('confirmPasswordLabel') }}
                </label>
                <div class="relative">
                  <Lock class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                        :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'" />
                  <input
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    :placeholder="t('confirmPasswordPlaceholder')"
                    class="w-full pl-12 pr-12 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    :class="currentTheme === 'dark'
                      ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder-stone-500'
                      : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400'"
                  />
                  <button
                    type="button"
                    @click="showConfirmPassword = !showConfirmPassword"
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                    :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
                    :title="showConfirmPassword ? t('hidePassword') : t('showPassword')"
                  >
                    <EyeOff v-if="showConfirmPassword" class="w-5 h-5" />
                    <Eye v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>

              <!-- 邮箱（可选） -->
              <div class="mb-6">
                <label class="block text-sm font-medium mb-2"
                       :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">
                  {{ t('emailLabel') }}
                </label>
                <div class="relative">
                  <Mail class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                        :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'" />
                  <input
                    v-model="email"
                    type="email"
                    :placeholder="t('emailPlaceholder')"
                    class="w-full pl-12 pr-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    :class="currentTheme === 'dark'
                      ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder-stone-500'
                      : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400'"
                  />
                </div>
              </div>
            </div>

            <!-- 提交按钮 -->
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              :class="isLoading
                ? 'bg-indigo-400 cursor-not-allowed text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'"
            >
              <LogIn v-if="isLoginMode" class="w-5 h-5" />
              <UserPlus v-else class="w-5 h-5" />
              {{ isLoading ? t('processing') : (isLoginMode ? t('loginButton') : t('registerButton')) }}
            </button>
          </form>

          <!-- 切换模式 -->
          <div class="mt-8 text-center">
            <p class="text-sm" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
              {{ isLoginMode ? t('toggleLoginPrompt') : t('toggleRegisterPrompt') }}
              <button
                @click="toggleMode"
                class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                {{ isLoginMode ? t('toggleLoginAction') : t('toggleRegisterAction') }}
              </button>
            </p>
          </div>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="mt-8 text-center text-sm" :class="currentTheme === 'dark' ? 'text-stone-500' : 'text-stone-400'">
        <p>{{ t('loginHint') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义样式 */
input:focus {
  outline: none;
}
</style>