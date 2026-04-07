/**
 * 密码验证工具函数
 */

// 密码验证正则表达式：必须包含大小写字母和数字，长度8-20位，不能包含空格
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,20}$/;

/**
 * 密码验证结果类型
 */
export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    hasMinLength: boolean;
    hasMaxLength: boolean;
    hasLowerCase: boolean;
    hasUpperCase: boolean;
    hasNumber: boolean;
    noSpaces: boolean;
  };
}

/**
 * 验证密码复杂度
 * @param password 密码字符串
 * @returns 验证结果
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      isValid: false,
      error: '密码不能为空',
      details: {
        hasMinLength: false,
        hasMaxLength: false,
        hasLowerCase: false,
        hasUpperCase: false,
        hasNumber: false,
        noSpaces: true, // 空字符串也算无空格
      },
    };
  }

  const details = {
    hasMinLength: password.length >= 8,
    hasMaxLength: password.length <= 20,
    hasLowerCase: /[a-z]/.test(password),
    hasUpperCase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    noSpaces: !/\s/.test(password),
  };

  const isValid = details.hasMinLength &&
                  details.hasMaxLength &&
                  details.hasLowerCase &&
                  details.hasUpperCase &&
                  details.hasNumber &&
                  details.noSpaces;

  if (isValid) {
    return { isValid: true, details };
  }

  // 构建具体的错误信息
  const errors: string[] = [];
  if (!details.hasMinLength) errors.push('至少8个字符');
  if (!details.hasMaxLength) errors.push('最多20个字符');
  if (!details.hasLowerCase) errors.push('至少一个小写字母');
  if (!details.hasUpperCase) errors.push('至少一个大写字母');
  if (!details.hasNumber) errors.push('至少一个数字');
  if (!details.noSpaces) errors.push('不能包含空格');

  const error = `密码不符合要求：${errors.join('，')}`;

  return {
    isValid: false,
    error,
    details,
  };
}

/**
 * 使用正则表达式快速验证密码格式
 * @param password 密码字符串
 * @returns 是否通过验证
 */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}