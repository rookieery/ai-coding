<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-vue-next';
import { currentTheme, t } from '@/src/i18n';
import { authApi } from '@/src/api/auth-api';
import { validatePassword, isPasswordValid } from '@/src/utils/password';

export interface Props {
  open: boolean;
}

export interface Emits {
  (e: 'update:open', value: boolean): void;
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 表单状态
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const passwordErrors = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const settingsError = ref('');
const settingsSuccess = ref('');
const isChangingPassword = ref(false);

// 密码可见性状态
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

// 关闭弹窗
const closeModal = () => {
  emit('update:open', false);
  emit('close');
};

// 重置表单状态
const resetForm = () => {
  settingsError.value = '';
  settingsSuccess.value = '';
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordErrors.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  showOldPassword.value = false;
  showNewPassword.value = false;
  showConfirmPassword.value = false;
};

// 监听open变化，打开时重置表单
watch(() => props.open, (newVal) => {
  if (newVal) {
    resetForm();
  }
});

// 验证密码表单
const validatePasswordForm = (): boolean => {
  let isValid = true;

  // 清空之前的错误
  passwordErrors.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  // 验证旧密码
  if (!passwordForm.value.oldPassword.trim()) {
    passwordErrors.value.oldPassword = t('settingsErrorOldPasswordRequired');
    isValid = false;
  }

  // 验证新密码
  if (!passwordForm.value.newPassword.trim()) {
    passwordErrors.value.newPassword = t('settingsErrorNewPasswordMinLength');
    isValid = false;
  } else {
    const result = validatePassword(passwordForm.value.newPassword);
    if (!result.isValid) {
      passwordErrors.value.newPassword = t('settingsErrorNewPasswordComplexity');
      isValid = false;
    }
  }

  // 验证确认密码
  if (!passwordForm.value.confirmPassword.trim()) {
    passwordErrors.value.confirmPassword = t('settingsErrorConfirmPasswordRequired');
    isValid = false;
  } else if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordErrors.value.confirmPassword = t('settingsErrorPasswordsMismatch');
    isValid = false;
  }

  return isValid;
};

// 修改密码提交
const changePassword = async () => {
  // 重置错误和成功消息
  settingsError.value = '';
  settingsSuccess.value = '';

  // 验证表单
  if (!validatePasswordForm()) {
    return;
  }

  // 设置加载状态
  isChangingPassword.value = true;

  try {
    // 调用API修改密码
    await authApi.changePassword({
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    });

    // 成功提示
    settingsSuccess.value = t('settingsPasswordChangeSuccess');

    // 2秒后关闭弹窗
    setTimeout(() => {
      closeModal();
    }, 2000);

  } catch (error) {
    if (error instanceof Error && error.message && (error.message.includes('不正确') || error.message.includes('incorrect') || error.message.includes('错误'))) {
      settingsError.value = t('settingsErrorCurrentPasswordIncorrect');
    } else {
      const errorMessage = error instanceof Error ? error.message : t('settingsPasswordChangeFailed');
      settingsError.value = errorMessage;
    }
  } finally {
    isChangingPassword.value = false;
  }
};

// 实时验证新密码
watch(() => passwordForm.value.newPassword, (newValue) => {
  if (!newValue.trim()) {
    passwordErrors.value.newPassword = t('settingsErrorNewPasswordMinLength');
    return;
  }
  const result = validatePassword(newValue);
  if (!result.isValid) {
    passwordErrors.value.newPassword = t('settingsErrorNewPasswordComplexity');
  } else {
    passwordErrors.value.newPassword = '';
  }
});

// 实时验证确认密码
watch(() => [passwordForm.value.newPassword, passwordForm.value.confirmPassword], () => {
  if (!passwordForm.value.confirmPassword.trim()) {
    passwordErrors.value.confirmPassword = t('settingsErrorConfirmPasswordRequired');
    return;
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordErrors.value.confirmPassword = t('settingsErrorPasswordsMismatch');
  } else {
    passwordErrors.value.confirmPassword = '';
  }
});

// 密码输入框类型计算属性
const oldPasswordType = computed(() => showOldPassword.value ? 'text' : 'password');
const newPasswordType = computed(() => showNewPassword.value ? 'text' : 'password');
const confirmPasswordType = computed(() => showConfirmPassword.value ? 'text' : 'password');

// 密码表单是否有效
const isPasswordFormValid = computed(() => {
  if (!passwordForm.value.oldPassword.trim()) return false;
  if (!passwordForm.value.newPassword.trim()) return false;
  if (!passwordForm.value.confirmPassword.trim()) return false;
  if (!isPasswordValid(passwordForm.value.newPassword)) return false;
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) return false;
  return true;
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="w-full max-w-md p-6 rounded-2xl shadow-xl transition-colors" :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold">{{ t('settingsTitle') }}</h3>
        <button @click="closeModal" class="p-1 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="settingsError" class="mb-6 p-4 rounded-lg flex items-center gap-3"
           :class="currentTheme === 'dark' ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700'">
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
        <span>{{ settingsError }}</span>
      </div>

      <!-- 成功提示 -->
      <div v-if="settingsSuccess" class="mb-6 p-4 rounded-lg flex items-center gap-3"
           :class="currentTheme === 'dark' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'">
        <Check class="w-5 h-5 flex-shrink-0" />
        <span>{{ settingsSuccess }}</span>
      </div>

      <!-- 修改密码表单 -->
      <div class="mb-6">
        <h4 class="text-lg font-semibold mb-4">{{ t('changePasswordTitle') }}</h4>

        <div class="space-y-4">
          <!-- 旧密码 -->
          <div>
            <label class="block text-sm font-medium mb-2" :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">
              {{ t('settingsOldPasswordLabel') }}
            </label>
            <div class="relative">
              <input
                v-model="passwordForm.oldPassword"
                :type="oldPasswordType"
                :placeholder="t('settingsOldPasswordPlaceholder')"
                :disabled="isChangingPassword"
                class="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                :class="[
                  currentTheme === 'dark' ? 'bg-stone-900 border-stone-700 text-stone-100' : 'bg-stone-50 border-stone-300 text-stone-900',
                  passwordErrors.oldPassword ? 'border-red-500 focus:ring-red-500' : ''
                ]"
                @keyup.enter="changePassword"
              />
              <button
                type="button"
                @click="showOldPassword = !showOldPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                :title="showOldPassword ? t('hidePassword') : t('showPassword')"
              >
                <EyeOff v-if="showOldPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
            <p v-if="passwordErrors.oldPassword" class="mt-2 text-sm text-red-500">
              {{ passwordErrors.oldPassword }}
            </p>
          </div>

          <!-- 新密码 -->
          <div>
            <label class="block text-sm font-medium mb-2" :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">
              {{ t('passwordLabel') }}
            </label>
            <div class="relative">
              <input
                v-model="passwordForm.newPassword"
                :type="newPasswordType"
                :placeholder="t('settingsNewPasswordPlaceholder')"
                :disabled="isChangingPassword"
                class="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                :class="[
                  currentTheme === 'dark' ? 'bg-stone-900 border-stone-700 text-stone-100' : 'bg-stone-50 border-stone-300 text-stone-900',
                  passwordErrors.newPassword ? 'border-red-500 focus:ring-red-500' : ''
                ]"
                @keyup.enter="changePassword"
              />
              <button
                type="button"
                @click="showNewPassword = !showNewPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                :title="showNewPassword ? t('hidePassword') : t('showPassword')"
              >
                <EyeOff v-if="showNewPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
            <p v-if="passwordErrors.newPassword" class="mt-2 text-sm text-red-500">
              {{ passwordErrors.newPassword }}
            </p>
          </div>

          <!-- 确认新密码 -->
          <div>
            <label class="block text-sm font-medium mb-2" :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">
              {{ t('confirmPasswordLabel') }}
            </label>
            <div class="relative">
              <input
                v-model="passwordForm.confirmPassword"
                :type="confirmPasswordType"
                :placeholder="t('settingsConfirmPasswordPlaceholder')"
                :disabled="isChangingPassword"
                class="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                :class="[
                  currentTheme === 'dark' ? 'bg-stone-900 border-stone-700 text-stone-100' : 'bg-stone-50 border-stone-300 text-stone-900',
                  passwordErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''
                ]"
                @keyup.enter="changePassword"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                :title="showConfirmPassword ? t('hidePassword') : t('showPassword')"
              >
                <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
            <p v-if="passwordErrors.confirmPassword" class="mt-2 text-sm text-red-500">
              {{ passwordErrors.confirmPassword }}
            </p>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-end gap-3">
        <button
          @click="closeModal"
          :disabled="isChangingPassword"
          class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="currentTheme === 'dark' ? 'bg-stone-700 hover:bg-stone-600 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'"
        >
          {{ t('cancel') }}
        </button>
        <button
          @click="changePassword"
          :disabled="isChangingPassword || !isPasswordFormValid"
          class="px-4 py-2 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Loader2 v-if="isChangingPassword" class="w-4 h-4 animate-spin" />
          <span>{{ isChangingPassword ? t('processing') : t('save') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>