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
  createdAt?: string;
  updatedAt?: string;
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
  CHAT_MESSAGE = 'CHAT_MESSAGE',
}

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  roomId: string;
  senderId: string;
  data: T;
  timestamp: number;
}

// 聊天相关接口
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  createdAt: string;
  attachmentUrl?: string; // 可选的附件URL，用于图片或文件
}

export interface SendMessageRequest {
  roomId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  attachmentUrl?: string;
}

export interface GetMessagesRequest {
  roomId: string;
  before?: string; // 分页：获取此消息ID之前的消息
  limit?: number; // 分页：每页消息数量
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: string[]; // 参与者ID数组
  createdAt: string;
  updatedAt: string;
  lastMessage?: ChatMessage; // 最后一条消息（可选）
}

// 用户角色类型
export type UserRole = 'host' | 'interviewer';

// 创建房间请求参数
export interface CreateRoomRequest {
  userId: string;
}

// 创建房间响应
export interface CreateRoomResponse {
  success: boolean;
  roomId: string;
  message?: string;
}

// 加入房间请求参数
export interface JoinRoomRequest {
  roomId: string;
  userId: string;
  role: UserRole;
}

// 加入房间响应
export interface JoinRoomResponse {
  success: boolean;
  message?: string;
}

// 销毁房间请求参数
export interface DestroyRoomRequest {
  roomId: string;
  userId: string;
  role: UserRole;
}

// 销毁房间响应
export interface DestroyRoomResponse {
  success: boolean;
  message?: string;
}

// WebRTC相关接口
export interface RTCConfig {
  iceServers: RTCIceServer[];
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface RTCSignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  roomId: string;
  senderId: string;
  receiverId: string;
  data: any;
}

export interface RTCConnectionState {
  roomId: string;
  userId: string;
  state: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
  timestamp: number;
}

export interface RTCMediaStream {
  userId: string;
  streamId: string;
  hasAudio: boolean;
  hasVideo: boolean;
  timestamp: number;
} 