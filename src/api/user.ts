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
  // // 使用测试账号登录（开发模式）
  // if (USE_MOCK_DATA) {
  //   console.log('使用测试账号登录模式', data);
  //   const mockResponse = mockLogin(data.username, data.password);
    
  //   if (mockResponse.success && mockResponse.data) {
  //     // 构造登录响应格式
  //     return {
  //       code: 200,
  //       success: true,
  //       message: '登录成功（测试模式）',
  //       data: {
  //         token: mockResponse.token as string,
  //         user: mockResponse.data
  //       }
  //     };
  //   }
    
  //   // 错误响应需要提供空的LoginResponse对象
  //   return {
  //     code: 401,
  //     success: false,
  //     message: mockResponse.message || '用户名或密码错误',
  //     data: {
  //       token: '',
  //       user: {} as User // 类型断言为空用户对象
  //     }
  //   };
  // }
  
  // 使用真实API登录
  return await apiService.post<ApiResponse<LoginResponse>>(
    API_ENDPOINTS.AUTH.LOGIN, 
    data
  );
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
  // 使用真实API注册
  return await apiService.post<ApiResponse<User>>(
    API_ENDPOINTS.AUTH.REGISTER, 
    data
  );
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
 * @param {File} file - 要上传的图片文件
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
  file: File
): Promise<ApiResponse<{avatarUrl: string}>> => {
  // 创建FormData对象
  const formData = new FormData();
  formData.append('avatar', file);
  
  // 配置请求头
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  };
  
  return await apiService.post<ApiResponse<{avatarUrl: string}>>(
    `${API_ENDPOINTS.USERS.PROFILE}/avatar`,
    formData,
    config
  );
};

/**
 * 修改密码
 * 
 * @param {Object} data - 包含旧密码和新密码的对象
 * @returns {Promise<ApiResponse<{success: boolean}>>} - 返回操作结果
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
 * 用户退出登录
 * 
 * @returns {Promise<ApiResponse<{success: boolean}>>} - 返回操作结果
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
  // 在这里，我们只需要清除本地存储的token，不需要向服务器发送请求
  // 因为服务器端不保存登录状态
  
  // 客户端清除认证信息
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  localStorage.removeItem('token_expiry');
  apiService.clearAuthToken();
  
  return {
    code: 200,
    success: true,
    message: '退出成功',
    data: { success: true }
  };
}; 