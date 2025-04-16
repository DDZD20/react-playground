import { io } from "socket.io-client";
import { EventEmitter } from 'events';
import { 
  UserRole, 
  WebSocketMessage,
  ChatMessage,
  JoinRoomRequest,
  JoinRoomResponse
} from '../../api/types';

// =====================
// 类型定义
// =====================

export interface User {
  userId: string;
  userName: string;
  role?: UserRole;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
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

// SocketService各命名空间
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
  CONNECT_ERROR = 'connect_error',
  
  // 认证事件
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  
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
  [SocketEvent.CONNECT_ERROR]: Error;
  [SocketEvent.AUTHENTICATED]: JoinRoomResponse;
  'userJoined': { userId: string; userName: string; role?: UserRole };
  'userLeft': { userId: string; userName: string; role?: UserRole };
  'roomStatus': RoomStatus;
  'allReady': RoomStatus;
  'newMessage': ChatMessage;
  'newNotification': WebSocketMessage;
}

/**
 * Socket服务类 - 处理WebSocket通信
 */
class SocketService {
  private sockets = new Map<SocketNamespace, any>();
  private events = new EventEmitter();
  private userId: string | null = null;
  private userName: string | null = null;
  private baseUrl = '';
  
  constructor() {
    this.events.setMaxListeners(50);
  }
  
  /**
   * 连接到WebSocket服务器
   */
  public connect(baseUrl: string, options: { autoConnect?: boolean } = {}): this {
    this.baseUrl = baseUrl;
    
    // 创建主连接
    const mainSocket = io(baseUrl, {
      autoConnect: options.autoConnect !== false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    
    this.sockets.set(SocketNamespace.MAIN, mainSocket);
    
    // 设置事件监听器
    mainSocket.on(SocketEvent.CONNECT, () => {
      console.log('Socket连接成功');
      this.events.emit(SocketEvent.CONNECT);
      
      // 自动重新认证
      if (this.userId && this.userName) {
        this.authenticate(this.userId, this.userName)
          .catch(err => console.error('自动重新认证失败:', err));
      }
    });
    
    mainSocket.on(SocketEvent.DISCONNECT, (reason: string) => {
      console.log(`Socket断开连接: ${reason}`);
      this.events.emit(SocketEvent.DISCONNECT, reason);
    });
    
    mainSocket.on(SocketEvent.CONNECT_ERROR, (error: Error) => {
      console.error('Socket连接错误:', error.message);
      this.events.emit(SocketEvent.CONNECT_ERROR, error);
    });
    
    mainSocket.on(SocketEvent.AUTHENTICATED, (response: JoinRoomResponse) => {
      console.log('认证结果:', response.success);
      this.events.emit(SocketEvent.AUTHENTICATED, response);
      
      if (response.success) {
        this.connectNamespaces();
      }
    });
    
    return this;
  }
  
  /**
   * 连接到其他命名空间
   */
  private connectNamespaces(): void {
    const authData = { userId: this.userId, userName: this.userName };
    
    // 连接其他命名空间并设置监听器
    [
      { ns: SocketNamespace.INTERVIEW, name: 'interview' },
      { ns: SocketNamespace.CHAT, name: 'chat' },
      { ns: SocketNamespace.NOTIFICATION, name: 'notification' }
    ].forEach(({ ns, name }) => {
      const socket = io(`${this.baseUrl}${ns}`, { auth: authData });
      this.sockets.set(ns, socket);
      this.setupSocketListeners(socket, name);
    });
  }
  
  /**
   * 设置命名空间的事件监听器
   */
  private setupSocketListeners(socket: any, namespace: string): void {
    // 用户加入/离开事件
    socket.on(SocketEvent.USER_JOINED, (data: any) => {
      this.events.emit('userJoined', data);
    });
    
    socket.on(SocketEvent.USER_LEFT, (data: any) => {
      this.events.emit('userLeft', data);
    });
    
    // 面试特有事件
    if (namespace === 'interview') {
      socket.on(SocketEvent.ROOM_STATUS, (data: RoomStatus) => {
        this.events.emit('roomStatus', data);
      });
      
      socket.on(SocketEvent.ALL_READY, (data: RoomStatus) => {
        this.events.emit('allReady', data);
      });
    }
    
    // 聊天特有事件
    if (namespace === 'chat') {
      socket.on(SocketEvent.NEW_MESSAGE, (data: ChatMessage) => {
        this.events.emit('newMessage', data);
      });
    }
    
    // 通知特有事件
    if (namespace === 'notification') {
      socket.on(SocketEvent.NEW_NOTIFICATION, (data: WebSocketMessage) => {
        this.events.emit('newNotification', data);
      });
    }
  }
  
  /**
   * 用户认证
   */
  public authenticate(userId: string, userName: string): Promise<boolean> {
    if (!this.isConnected()) {
      return Promise.reject(new Error('Socket未连接'));
    }
    
    this.userId = userId;
    this.userName = userName;
    
    const socket = this.getSocket(SocketNamespace.MAIN);
    socket.emit(SocketEvent.AUTHENTICATE, { userId, userName });
    
    return new Promise<boolean>((resolve) => {
      this.once(SocketEvent.AUTHENTICATED, (response: JoinRoomResponse) => {
        resolve(response.success);
      });
    });
  }
  
  /**
   * 检查Socket是否已连接
   */
  public isConnected(): boolean {
    const socket = this.sockets.get(SocketNamespace.MAIN);
    return !!socket && socket.connected;
  }
  
  /**
   * 获取指定命名空间的Socket
   */
  private getSocket(namespace: SocketNamespace): any {
    const socket = this.sockets.get(namespace);
    if (!socket) {
      throw new Error(`Socket命名空间'${namespace}'未连接`);
    }
    return socket;
  }
  
  /**
   * 加入房间
   */
  public joinRoom(roomId: string, role: UserRole): void {
    if (!this.userId || !this.userName) {
      throw new Error('用户未认证，无法加入房间');
    }
    
    const request: JoinRoomRequest = {
      roomId,
      userId: this.userId,
      role
    };
    
    this.getSocket(SocketNamespace.INTERVIEW).emit(SocketEvent.JOIN_ROOM, request);
  }
  
  /**
   * 离开房间
   */
  public leaveRoom(roomId: string): void {
    if (!this.userId) {
      throw new Error('用户未认证，无法离开房间');
    }
    
    this.getSocket(SocketNamespace.INTERVIEW).emit(SocketEvent.LEAVE_ROOM, {
      roomId,
      userId: this.userId
    });
  }
  
  /**
   * 标记准备就绪
   */
  public markReady(roomId: string): void {
    if (!this.userId) {
      throw new Error('用户未认证，无法标记准备就绪');
    }
    
    this.getSocket(SocketNamespace.INTERVIEW).emit(SocketEvent.MARK_READY, {
      roomId,
      userId: this.userId
    });
  }
  
  /**
   * 发送聊天消息
   */
  public sendMessage(roomId: string, content: string): void {
    if (!this.userId || !this.userName) {
      throw new Error('用户未认证，无法发送消息');
    }
    
    this.getSocket(SocketNamespace.CHAT).emit(SocketEvent.SEND_MESSAGE, {
      roomId,
      content,
      senderId: this.userId,
      senderName: this.userName,
      type: 'text'
    });
  }
  
  /**
   * 订阅通知
   */
  public subscribeToNotifications(): void {
    if (!this.userId) {
      throw new Error('用户未认证，无法订阅通知');
    }
    
    this.getSocket(SocketNamespace.NOTIFICATION).emit(SocketEvent.SUBSCRIBE, {
      userId: this.userId
    });
  }
  
  /**
   * 添加事件监听器
   */
  public on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this;
  public on(event: string, listener: (...args: any[]) => void): this {
    this.events.on(event, listener);
    return this;
  }
  
  /**
   * 添加一次性事件监听器
   */
  public once<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this;
  public once(event: string, listener: (...args: any[]) => void): this {
    this.events.once(event, listener);
    return this;
  }
  
  /**
   * 移除事件监听器
   */
  public off<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this;
  public off(event: string, listener: (...args: any[]) => void): this {
    this.events.off(event, listener);
    return this;
  }
  
  /**
   * 断开所有连接
   */
  public disconnect(): void {
    this.sockets.forEach((socket, namespace) => {
      console.log(`断开 ${namespace} 命名空间`);
      socket.disconnect();
    });
    
    this.sockets.clear();
    this.events.removeAllListeners();
  }
}

// 创建单例
export const socketService = new SocketService();
export default socketService;
