/**
 * 用户相关API服务
 * 
 * 该模块提供用户认证和个人信息管理相关的API请求函数
 */

import apiService from '../CodeVerify/services/ApiService';
import { API_ENDPOINTS } from './config';
import { 
  User, 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  ApiResponse 
} from './types';
import { mockLogin, mockRegister, TEST_USER } from './mockData';

// 是否为开发模式
const IS_DEV = import.meta.env.DEV;
// 是否使用模拟数据（仅在开发模式下可用）
const USE_MOCK_DATA = IS_DEV && true; // 设置为true启用本地测试账号

/**
 * 用户登录
 * 
 * @param {LoginRequest} data - 登录请求数据，包含用户名和密码
 * @returns {Promise<ApiResponse<LoginResponse>>} - 返回包含用户信息和认证token的响应
 * 
 * @example
 * // 登录请求示例
 * login({
 *   username: 'example_user',
 *   password: 'securePassword123'
 * })
 * 
 * // 期望的成功响应
 * {
 *   code: 200,
 *   success: true,
 *   message: '登录成功',
 *   data: {
 *     token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *     user: {
 *       id: '1234',
 *       username: 'example_user',
 *       email: 'user@example.com',
 *       role: 'user',
 *       // 其他用户信息
 *     }
 *   }
 * }
 */
export const login = async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  // 使用测试账号登录（开发模式）
  if (USE_MOCK_DATA) {
    console.log('使用测试账号登录模式', data);
    const mockResponse = mockLogin(data.username, data.password);
    
    if (mockResponse.success && mockResponse.data) {
      // 保存mock token
      apiService.setAuthToken(mockResponse.token as string);
      localStorage.setItem('refreshToken', mockResponse.token as string);
      
      // 构造登录响应格式
      return {
        code: 200,
        success: true,
        message: '登录成功（测试模式）',
        data: {
          token: mockResponse.token as string,
          user: mockResponse.data
        }
      };
    }
    
    // 错误响应需要提供空的LoginResponse对象
    return {
      code: 401,
      success: false,
      message: mockResponse.message || '用户名或密码错误',
      data: {
        token: '',
        user: {} as User // 类型断言为空用户对象
      }
    };
  }
  
  // 使用真实API登录
  const response = await apiService.post<ApiResponse<LoginResponse>>(
    API_ENDPOINTS.AUTH.LOGIN, 
    data
  );
  
  // 如果登录成功，保存token
  if (response.success && response.data) {
    apiService.setAuthToken(response.data.token);
    // 可以在这里存储refreshToken如果后端返回的话
    localStorage.setItem('refreshToken', response.data.token);
  }
  
  return response;
};

/**
 * 用户注册
 * 
 * @param {RegisterRequest} data - 注册请求数据，包含用户名、邮箱和密码
 * @returns {Promise<ApiResponse<User>>} - 返回包含新创建用户信息的响应
 * 
 * @example
 * // 注册请求示例
 * register({
 *   username: 'new_user',
 *   email: 'new_user@example.com',
 *   password: 'securePassword123'
 * })
 * 
 * // 期望的成功响应
 * {
 *   code: 201,
 *   success: true,
 *   message: '注册成功',
 *   data: {
 *     id: '5678',
 *     username: 'new_user',
 *     email: 'new_user@example.com',
 *     role: 'user',
 *     createdAt: '2023-01-01T00:00:00Z',
 *     updatedAt: '2023-01-01T00:00:00Z'
 *   }
 * }
 */
export const register = async (data: RegisterRequest): Promise<ApiResponse<User>> => {
  // 使用测试账号注册（开发模式）
  if (USE_MOCK_DATA) {
    console.log('使用测试账号注册模式', data);
    const mockResponse = mockRegister(data.username, data.email);
    
    if (!mockResponse.success) {
      return {
        code: 400,
        success: false,
        message: mockResponse.message || '注册失败',
        data: {} as User // 类型断言为空用户对象
      };
    }
    
    // 确保有数据
    if (mockResponse.data) {
      return {
        code: 201,
        success: true,
        message: '注册成功（测试模式）',
        data: mockResponse.data
      };
    }
  }
  
  // 使用真实API注册
  return await apiService.post<ApiResponse<User>>(
    API_ENDPOINTS.AUTH.REGISTER, 
    data
  );
};

/**
 * 获取当前登录用户的个人信息
 * 
 * @returns {Promise<ApiResponse<User>>} - 返回包含用户信息的响应
 * 
 * @example
 * // 获取个人信息请求示例
 * getCurrentUser()
 * 
 * // 期望的成功响应
 * {
 *   code: 200,
 *   success: true,
 *   message: '获取用户信息成功',
 *   data: {
 *     id: '1234',
 *     username: 'example_user',
 *     email: 'user@example.com',
 *     avatar: 'https://example.com/avatars/user.jpg',
 *     role: 'user',
 *     createdAt: '2023-01-01T00:00:00Z',
 *     updatedAt: '2023-01-01T00:00:00Z'
 *   }
 * }
 */
export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  // 开发模式：检查是否有mock token
  if (USE_MOCK_DATA) {
    // 从localStorage获取token
    const token = localStorage.getItem('refreshToken');
    if (token === 'mock-jwt-token-for-development') {
      console.log('返回测试用户信息');
      return {
        code: 200,
        success: true,
        message: '获取用户信息成功（测试模式）',
        data: {
          id: '1',
          username: TEST_USER.username,
          email: TEST_USER.email,
          avatar: 'https://avatars.githubusercontent.com/u/1',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    }
  }
  
  // 使用真实API获取用户信息
  return await apiService.get<ApiResponse<User>>(API_ENDPOINTS.AUTH.CURRENT_USER);
};

/**
 * 更新用户个人信息
 * 
 * @param {Partial<User>} data - 要更新的用户信息字段
 * @returns {Promise<ApiResponse<User>>} - 返回包含更新后用户信息的响应
 * 
 * @example
 * // 更新个人信息请求示例
 * updateUserProfile({
 *   username: 'updated_username',
 *   avatar: 'https://example.com/new-avatar.jpg'
 * })
 * 
 * // 期望的成功响应
 * {
 *   code: 200,
 *   success: true,
 *   message: '个人信息更新成功',
 *   data: {
 *     id: '1234',
 *     username: 'updated_username',
 *     email: 'user@example.com',
 *     avatar: 'https://example.com/new-avatar.jpg',
 *     role: 'user',
 *     createdAt: '2023-01-01T00:00:00Z',
 *     updatedAt: '2023-01-02T00:00:00Z'
 *   }
 * }
 */
export const updateUserProfile = async (data: Partial<User>): Promise<ApiResponse<User>> => {
  return await apiService.put<ApiResponse<User>>(API_ENDPOINTS.USERS.PROFILE, data);
};

/**
 * 上传用户头像
 * 
 * @param {File} file - 头像图片文件
 * @param {(percentage: number) => void} [onProgress] - 上传进度回调函数
 * @returns {Promise<ApiResponse<{avatarUrl: string}>>} - 返回包含头像URL的响应
 * 
 * @example
 * // 上传头像请求示例
 * const fileInput = document.getElementById('avatar-input');
 * if (fileInput.files.length > 0) {
 *   uploadAvatar(fileInput.files[0], (progress) => {
 *     console.log(`上传进度: ${progress}%`);
 *   });
 * }
 * 
 * // 期望的成功响应
 * {
 *   code: 200,
 *   success: true,
 *   message: '头像上传成功',
 *   data: {
 *     avatarUrl: 'https://example.com/avatars/user-1234.jpg'
 *   }
 * }
 */
export const uploadAvatar = async (
  file: File, 
  // onProgress?: (percentage: number) => void
): Promise<ApiResponse<{avatarUrl: string}>> => {
  // 创建FormData对象
  const formData = new FormData();
  formData.append('file', file);
  
  // 直接使用apiService的post方法上传文件
  return await apiService.post<ApiResponse<{avatarUrl: string}>>(
    `${API_ENDPOINTS.USERS.PROFILE}/avatar`,
    formData
  );
};

/**
 * 修改密码
 * 
 * @param {Object} data - 修改密码所需数据
 * @param {string} data.oldPassword - 当前密码
 * @param {string} data.newPassword - 新密码
 * @returns {Promise<ApiResponse<{success: boolean}>>} - 返回密码修改结果
 * 
 * @example
 * // 修改密码请求示例
 * changePassword({
 *   oldPassword: 'currentPassword123',
 *   newPassword: 'newSecurePassword456'
 * })
 * 
 * // 期望的成功响应
 * {
 *   code: 200,
 *   success: true,
 *   message: '密码修改成功',
 *   data: {
 *     success: true
 *   }
 * }
 */
export const changePassword = async (data: {
  oldPassword: string;
  newPassword: string;
}): Promise<ApiResponse<{success: boolean}>> => {
  return await apiService.put<ApiResponse<{success: boolean}>>(
    `${API_ENDPOINTS.USERS.PROFILE}/password`,
    data
  );
};

/**
 * 退出登录
 * 
 * @returns {Promise<ApiResponse<{success: boolean}>>} - 返回登出结果
 * 
 * @example
 * // 退出登录请求示例
 * logout()
 * 
 * // 期望的成功响应
 * {
 *   code: 200,
 *   success: true,
 *   message: '退出登录成功',
 *   data: {
 *     success: true
 *   }
 * }
 */
export const logout = async (): Promise<ApiResponse<{success: boolean}>> => {
  const response = await apiService.post<ApiResponse<{success: boolean}>>(API_ENDPOINTS.AUTH.LOGOUT);
  
  // 无论后端返回什么结果，都清除本地token
  apiService.clearAuthToken();
  
  return response;
}; 