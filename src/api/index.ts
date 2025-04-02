/**
 * API模块索引文件
 * 
 * 该文件导出所有API服务，便于统一导入
 */

// 导出API配置
import apiConfig from './config';
export { apiConfig };
export { API_ENDPOINTS, WS_EVENTS } from './config';

// 导出用户相关API
import * as userApi from './user';
export { userApi };

// 导出类型定义
export * from './types';

// 默认导出
export default {
  apiConfig,
  userApi,
}; 