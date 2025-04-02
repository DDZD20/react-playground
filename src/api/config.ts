/**
 * API 配置文件
 */

// 从环境变量获取API基础URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 30000; // 默认30秒超时
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3000';

// API端点配置
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',
    CURRENT_USER: '/auth/me',
  },
  
  // 用户相关
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    PROFILE: '/users/profile',
  },
  
  // 项目相关
  PROJECTS: {
    BASE: '/projects',
    BY_ID: (id: string) => `/projects/${id}`,
    FILES: (projectId: string) => `/projects/${projectId}/files`,
  },
  
  // 文件相关
  FILES: {
    BASE: '/files',
    BY_ID: (id: string) => `/files/${id}`,
    CONTENT: (id: string) => `/files/${id}/content`,
  },
  
  // 协同编辑相关
  COLLABORATION: {
    SESSIONS: '/collaboration/sessions',
    SESSION_BY_ID: (id: string) => `/collaboration/sessions/${id}`,
    JOIN: (fileId: string) => `/collaboration/files/${fileId}/join`,
  },
};

// WebSocket事件类型
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SYNC_UPDATE: 'sync_update',
  AWARENESS_UPDATE: 'awareness_update',
};

// 导出配置
export default {
  API_BASE_URL,
  API_TIMEOUT,
  WS_BASE_URL,
  API_ENDPOINTS,
  WS_EVENTS,
}; 