/**
 * API 类型定义文件
 */

// 通用响应结构
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}

// 分页请求参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页响应结构
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 用户相关接口
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// 项目相关接口
export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  isPublic: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

// 文件相关接口
export interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFileRequest {
  name: string;
  path: string;
  content: string;
  projectId: string;
}

export interface UpdateFileRequest {
  content: string;
}

// 协同编辑相关接口
export interface YjsAwarenessState {
  clientId: number;
  user: {
    name: string;
    color: string;
    avatar?: string;
  };
  cursor?: {
    index: number;
    length: number;
  };
}

export interface CollaborationSession {
  id: string;
  fileId: string;
  participants: string[]; // 用户ID列表
  startedAt: string;
  endedAt?: string;
}

// WebSocket消息类型
export enum WebSocketMessageType {
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  UPDATE_AWARENESS = 'UPDATE_AWARENESS',
  SYNC_UPDATE = 'SYNC_UPDATE',
  ERROR = 'ERROR',
}

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  roomId: string;
  senderId: string;
  data: T;
  timestamp: number;
} 