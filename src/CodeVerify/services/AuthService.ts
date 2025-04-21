/**
 * 认证服务
 * 
 * 管理用户认证状态、Token存储和有效期检查等
 */

import apiService from './ApiService';
import { User } from '../../api/types';

// Token存储键名
const TOKEN_KEY = 'auth_token';
const USER_INFO_KEY = 'user_info';
const TOKEN_EXPIRY_KEY = 'token_expiry';

/**
 * 认证服务类
 */
class AuthService {
  /**
   * 保存认证信息
   * 
   * @param token JWT令牌
   * @param user 用户信息
   * @param expiryInSeconds 过期时间（秒）
   */
  saveAuthInfo(token: string, user: User, expiryInSeconds: number = 604800): void {
    // 保存token到localStorage
    localStorage.setItem(TOKEN_KEY, token);
    
    // 保存用户信息
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    
    // 计算并保存过期时间
    const expiryTime = new Date().getTime() + expiryInSeconds * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    // 设置API请求的认证头
    apiService.setAuthToken(token);
  }
  
  /**
   * 获取当前用户信息
   * 
   * @returns 当前用户信息，未登录则返回null
   */
  getCurrentUser(): User | null {
    // 检查token是否有效
    if (!this.isAuthenticated()) {
      return null;
    }
    
    // 从localStorage获取用户信息
    const userJson = localStorage.getItem(USER_INFO_KEY);
    if (!userJson) {
      return null;
    }
    
    try {
      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error('解析用户信息失败:', error);
      return null;
    }
  }
  
  /**
   * 检查用户是否已认证（token是否有效）
   * 
   * @returns 是否已认证
   */
  isAuthenticated(): boolean {
    // 检查token是否存在
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return false;
    }
    
    // 检查token是否过期
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryTime) {
      return false;
    }
    
    // 比较过期时间和当前时间
    const now = new Date().getTime();
    return now < parseInt(expiryTime, 10);
  }
  
  /**
   * 获取当前token
   * 
   * @returns 当前token，未登录则返回null
   */
  getToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
  }
  
  /**
   * 退出登录
   */
  logout(): void {
    // 清除localStorage中的认证信息
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    
    // 清除API请求的认证头
    apiService.clearAuthToken();
  }
  
  /**
   * 从JWT令牌解析过期时间
   * 
   * @param token JWT令牌
   * @returns 过期时间（秒）
   */
  getTokenExpiryFromJWT(token: string): number {
    try {
      // JWT由三部分组成，以点分隔
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      // 解码payload部分（第二部分）
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // 如果有exp声明，返回过期时间
      if (payload.exp) {
        return payload.exp - Math.floor(Date.now() / 1000);
      }
      
      // 默认为7天
      return 7 * 24 * 60 * 60;
    } catch (error) {
      console.error('解析JWT令牌失败:', error);
      return 7 * 24 * 60 * 60; // 默认为7天
    }
  }
}

// 创建单例实例
const authService = new AuthService();

export default authService; 