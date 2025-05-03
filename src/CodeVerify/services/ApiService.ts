import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * API服务配置接口
 */
interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * 简单的API服务类
 */
class ApiService {
  private instance: AxiosInstance;

  /**
   * 构造函数
   * @param config API配置
   */
  constructor(config: ApiConfig) {
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 15000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });

    // 请求拦截器：每次请求自动加 token
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // 你后端如果需要 Bearer 前缀，这里可以加上
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 添加响应拦截器处理错误
    this.instance.interceptors.response.use(
      response => response, // 直接返回响应
      error => {
        // 处理错误
        console.error('API请求失败:', error.response || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 设置请求头
   * @param headers 请求头对象
   */
  public setHeaders(headers: Record<string, string>): void {
    Object.keys(headers).forEach(key => {
      this.instance.defaults.headers.common[key] = headers[key];
    });
  }

  /**
   * 设置认证令牌
   * @param token 认证令牌
   */
  public setAuthToken(token: string): void {
    this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * 清除认证令牌
   */
  public clearAuthToken(): void {
    delete this.instance.defaults.headers.common['Authorization'];
  }

  /**
   * 发送GET请求
   * @param url 请求URL
   * @param params 查询参数
   * @param config 请求配置
   * @returns Promise
   */
  public async get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get(url, { params, ...config });
    return response.data;
  }

  /**
   * 发送POST请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  /**
   * 发送PUT请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  /**
   * 发送DELETE请求
   * @param url 请求URL
   * @param config 请求配置
   * @returns Promise
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }
}

// 创建默认实例
const apiService = new ApiService({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
});

export default apiService; 