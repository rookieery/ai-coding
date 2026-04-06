// API配置
import { API_BASE_URL } from '../config';

/**
 * 用户信息（管理员视图）
 */
export interface AdminUser {
  id: string;
  phone: string;
  email?: string;
  username: string;
  avatar?: string;
  rating: number;
  role: string;
  privateGameCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
  message?: string;
  error?: string;
}

/**
 * 管理员API服务
 */
export class AdminApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取请求头（附带认证token）
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
   * 获取所有用户列表（仅管理员）
   */
  async getUsers(page: number = 1, pageSize: number = 20): Promise<{
    users: AdminUser[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/admin/users?page=${page}&pageSize=${pageSize}`,
        {
          headers: this.getHeaders(),
          credentials: 'include',
        }
      );

      const result: PaginatedResponse<AdminUser> = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to fetch users');
      }

      return {
        users: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * 删除用户（仅管理员）
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

// 创建默认实例
export const adminApi = new AdminApiService();