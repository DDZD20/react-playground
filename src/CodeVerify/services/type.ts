import * as monaco from 'monaco-editor';
import { UserRole, WebSocketMessage, ChatMessage } from '../../api/types';

// AI模型接口
export interface AIModel {
  id: string;
  name: string;
  description: string;
}

// 消息接口
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// AI 聊天请求接口
export interface AIChatRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// 代码补全请求接口
export interface CodeCompletionRequest {
  code: string;
  position: monaco.Position;
  wordAtPosition?: {
    word: string;
    startColumn: number;
    endColumn: number;
  };
}

// diff 类型
// 差异块接口
export interface DiffBlock {
  id: string;
  startLine: number;
  endLine: number;
  content: string;
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  decorationIds: string[];
}

// 差异处理上下文接口
export interface DiffContext {
  editor: monaco.editor.IStandaloneCodeEditor;
  monaco: typeof monaco;
}

// 差异块操作处理回调接口
export interface DiffActionCallbacks {
  onDiffBlocksChanged: (blocks: DiffBlock[]) => void;
  onWidgetsUpdated: (widgets: HTMLDivElement[]) => void;
}

// 装饰器应用选项
export interface DecorationOptions {
  isWholeLine: boolean;
  className: string;
  glyphMarginClassName?: string;
  zIndex?: number;
}

// 接受/拒绝操作结果接口
export interface DiffActionResult {
  newBlocks: DiffBlock[];
  removedBlockId: string;
  affectedLineRange?: {
      startLine: number;
      endLine: number;
      linesToRemove?: number;
  };
}

// 控件位置接口
export interface WidgetPosition {
  top: number;
  blockId: string;
}

// =====================
// Socket 类型定义
// =====================

export interface User {
  userId: string;
  userName: string;
  role?: UserRole;
}

export interface RoomStatus {
  roomId: string;
  participants: Array<{
    userId: string;
    userName: string;
    role: UserRole;
    ready: boolean;
  }>;
  hostReady: boolean;
  candidateReady: boolean;
  allReady: boolean;
}

export interface UserJoinedEvent {
  userId: string;
  userName: string;
  role?: UserRole;
  timestamp?: number;
}

export interface UserLeftEvent {
  userId: string;
  userName: string;
  role?: UserRole;
  timestamp?: number;
}

// Socket命名空间
export enum SocketNamespace {
  MAIN = '/',            // 主命名空间
  INTERVIEW = '/interview', // 面试相关
  CHAT = '/chat',         // 聊天相关
  NOTIFICATION = '/notification' // 通知相关
}

// 事件类型定义
export enum SocketEvent {
  // 通用事件
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECTION_ERROR = 'connection_error',
  
  // 房间事件
  JOIN_ROOM = 'joinRoom',
  LEAVE_ROOM = 'leaveRoom',
  USER_JOINED = 'userJoined',
  USER_LEFT = 'userLeft',
  MARK_READY = 'markReady',
  ROOM_STATUS = 'roomStatus',
  ALL_READY = 'allReady',
  
  // 聊天事件
  SEND_MESSAGE = 'sendMessage',
  NEW_MESSAGE = 'newMessage',
  
  // 通知事件
  SUBSCRIBE = 'subscribe',
  NEW_NOTIFICATION = 'newNotification'
}

// 事件映射类型
export interface EventMap {
  [SocketEvent.CONNECT]: void;
  [SocketEvent.DISCONNECT]: string;
  [SocketEvent.CONNECTION_ERROR]: Error;
  'userJoined': { userId: string; userName: string; role?: UserRole };
  'userLeft': { userId: string; userName: string; role?: UserRole };
  'roomStatus': RoomStatus;
  'allReady': RoomStatus;
  'newMessage': ChatMessage;
  'newNotification': WebSocketMessage;
  // === WebRTC 信令事件 ===
  'videoOffer': any;      // 可根据实际信令结构细化类型
  'videoAnswer': any;
  'iceCandidate': any;
} 