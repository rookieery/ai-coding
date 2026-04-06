// API配置
import { API_BASE_URL } from '../config';

/**
 * 用户类型
 */
export interface User {
  id: string;
  phone: string;
  email?: string;
  username: string;
  avatar?: string;
  rating: number;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 认证响应
 */
export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

/**
 * 注册请求参数
 */
export interface RegisterRequest {
  phone: string;
  email?: string;
  username: string;
  password: string;
  avatar?: string;
}

/**
 * 登录请求参数
 */
export interface LoginRequest {
  phone: string;
  password: string;
}

/**
 * 更新用户信息请求参数
 */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  avatar?: string;
}

/**
 * 修改密码请求参数
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * API响应格式
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * 认证API服务
 */
export class AuthApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取请求头（附带认证token）
   */
  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * 处理响应
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.message || result.error || 'Request failed');
    }

    return result.data!;
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    return this.handleResponse<AuthResponse>(response);
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    return this.handleResponse<AuthResponse>(response);
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  /**
   * 更新当前用户信息
   */
  async updateUser(data: UpdateUserRequest): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<User>(response);
  }

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<void>(response);
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    return this.handleResponse<void>(response);
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * 获取当前用户的token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * 获取当前用户信息（从localStorage）
   */
  getCurrentUserFromStorage(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * 清除本地认证信息
   */
  clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * 保存认证信息到本地
   */
  saveAuth(user: User, token: string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * 检查后端连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 创建默认实例
export const authApi = new AuthApiService();