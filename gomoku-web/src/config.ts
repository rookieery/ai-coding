/**
 * 应用配置文件
 * 从环境变量读取配置，提供默认值
 */

// API配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

// 应用配置
export const config = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: 30000, // 30秒超时
    credentials: 'include' as RequestCredentials,
  },
  app: {
    name: 'Gomoku AI',
    version: '1.0.0',
  },
  logging: {
    enabled: import.meta.env.DEV, // 开发环境下启用日志
  },
};

/**
 * 获取完整的API URL
 * @param endpoint API端点路径（例如：'/auth/login'）
 * @returns 完整的URL
 */
export function getApiUrl(endpoint: string): string {
  // 确保endpoint以斜杠开头
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // 确保baseUrl不以斜杠结尾
  const baseUrl = config.api.baseUrl.endsWith('/')
    ? config.api.baseUrl.slice(0, -1)
    : config.api.baseUrl;

  return `${baseUrl}${normalizedEndpoint}`;
}

/**
 * 获取默认的fetch选项
 * @param includeAuth 是否包含认证头
 * @returns fetch选项
 */
export function getDefaultFetchOptions(includeAuth: boolean = true): RequestInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return {
    headers,
    credentials: config.api.credentials,
  };
}

/**
 * 检查后端连接状态
 * @returns 是否连接成功
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    const healthUrl = config.api.baseUrl.replace('/api', '/health');
    const response = await fetch(healthUrl, {
      method: 'GET',
      credentials: 'omit', // 健康检查不需要凭证
    });
    return response.ok;
  } catch {
    return false;
  }
}