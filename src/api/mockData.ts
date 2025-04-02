/**
 * 模拟数据文件
 * 
 * 本文件包含用于开发和测试的模拟数据
 * 仅用于开发环境，生产环境应从后端API获取真实数据
 */

import { User } from './types';

// 测试账号信息
export const TEST_USER = {
  username: 'testuser',
  password: 'Test@123',
  email: 'test@example.com',
};

// 模拟用户数据
export const mockUsers: User[] = [
  {
    id: '1',
    username: TEST_USER.username,
    email: TEST_USER.email,
    avatarUrl: 'https://avatars.githubusercontent.com/u/1',
    name: '测试用户',
    role: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 使用测试账号的登录模拟函数
export const mockLogin = (username: string, password: string) => {
  if (username === TEST_USER.username && password === TEST_USER.password) {
    return {
      success: true,
      data: mockUsers[0],
      token: 'mock-jwt-token-for-development',
      message: '登录成功',
    };
  }
  
  return {
    success: false,
    message: '用户名或密码错误',
  };
};

// 使用测试账号的注册模拟函数
export const mockRegister = (username: string, email: string, password: string) => {
  // 检查是否已存在同名用户
  if (username === TEST_USER.username) {
    return {
      success: false,
      message: '用户名已存在',
    };
  }
  
  // 检查是否已存在同邮箱用户
  if (email === TEST_USER.email) {
    return {
      success: false,
      message: '邮箱已被注册',
    };
  }
  
  // 模拟注册成功
  return {
    success: true,
    data: {
      id: '2',
      username,
      email,
      avatarUrl: 'https://avatars.githubusercontent.com/u/2',
      name: username,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    message: '注册成功',
  };
}; 