import { io } from "socket.io-client";
import { EventEmitter } from 'events';
import { 
  UserRole, 
  WebSocketMessage,
  ChatMessage,
  JoinRoomRequest,
} from '../../api/types';
import {
  RoomStatus,
  SocketNamespace,
  SocketEvent,
  EventMap
} from './type';

/**
 * Socket服务类 - 处理WebSocket通信
 */
class SocketService {
  private sockets = new Map<SocketNamespace, any>();
  private events = new EventEmitter();
  private userId: string | null = null;
  private userName: string | null = null;
  private baseUrl = '';
  private currentRoomId: string | null = null;
  private currentRole: UserRole | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  
  constructor() {
    this.events.setMaxListeners(50);
  }
  
  /**
   * 记录 Socket 事件
   */
  private logSocketEvent(type: 'SEND' | 'RECEIVE', namespace: string, event: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const direction = type === 'SEND' ? '发送 ➡️' : '接收 ⬅️';
    console.log(`[${timestamp}] ${direction} [${namespace}] ${event}`, data || '');
  }
  
  /**
   * 连接到WebSocket服务器
   */
  public async connect(baseUrl: string, userId: string, userName: string): Promise<boolean> {
    this.baseUrl = baseUrl;
    this.userId = userId;
    this.userName = userName;
    
    try {
      await this.connectMainNamespace();
      this.connectOtherNamespaces();
      return true;
    } catch (error) {
      console.error('Socket连接失败:', error);
      return false;
    }
  }
  
  /**
   * 连接主命名空间
   */
  private connectMainNamespace(): Promise<void> {
    return new Promise((resolve, reject) => {
      const mainSocket = io(this.baseUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 10000,
        query: {
          userId: this.userId,
          userName: this.userName
        }
      });
      
      this.sockets.set(SocketNamespace.MAIN, mainSocket);
      
      mainSocket.on(SocketEvent.CONNECT, () => {
        this.logSocketEvent('RECEIVE', 'MAIN', SocketEvent.CONNECT);
        this.events.emit(SocketEvent.CONNECT);
        resolve();
      });
      
      mainSocket.on(SocketEvent.DISCONNECT, (reason: string) => {
        this.logSocketEvent('RECEIVE', 'MAIN', SocketEvent.DISCONNECT, { reason });
        this.events.emit(SocketEvent.DISCONNECT, reason);
        this.handleDisconnect(reason);
      });
      
      mainSocket.on(SocketEvent.CONNECT_ERROR, (error: Error) => {
        this.logSocketEvent('RECEIVE', 'MAIN', SocketEvent.CONNECT_ERROR, { error: error.message });
        this.events.emit(SocketEvent.CONNECT_ERROR, error);
        reject(error);
      });
      
      // 设置超时
      setTimeout(() => {
        if (!mainSocket.connected) {
          reject(new Error('连接超时'));
        }
      }, 10000);
    });
  }
  
  /**
   * 连接其他命名空间
   */
  private connectOtherNamespaces(): void {
    const query = { userId: this.userId, userName: this.userName };
    
    [
      { ns: SocketNamespace.INTERVIEW, name: 'interview' },
      { ns: SocketNamespace.CHAT, name: 'chat' },
      { ns: SocketNamespace.NOTIFICATION, name: 'notification' }
    ].forEach(({ ns, name }) => {
      const socket = io(`${this.baseUrl}${ns}`, { query });
      this.sockets.set(ns, socket);
      this.setupSocketListeners(socket, name);
      this.logSocketEvent('SEND', name, 'connect', query);
    });
  }
  
  /**
   * 处理断开连接
   */
  private handleDisconnect(reason: string): void {
    // 如果是服务器主动断开或网络问题，尝试重连
    if (reason === 'io server disconnect' || reason === 'transport close') {
      this.reconnectAttempts++;
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.reconnect(), 1000);
      } else {
        console.error('达到最大重连次数');
        this.events.emit('maxReconnectAttemptsReached');
      }
    }
  }
  
  /**
   * 重新连接
   */
  private async reconnect(): Promise<void> {
    try {
      await this.connect(this.baseUrl, this.userId!, this.userName!);
      // 如果之前在房间中，重新加入
      if (this.currentRoomId && this.currentRole) {
        this.joinRoom(this.currentRoomId, this.currentRole);
      }
    } catch (error) {
      console.error('重连失败:', error);
    }
  }
  
  /**
   * 设置命名空间的事件监听器
   */
  private setupSocketListeners(socket: any, namespace: string): void {
    // 用户加入/离开事件
    socket.on(SocketEvent.USER_JOINED, (data: any) => {
      this.logSocketEvent('RECEIVE', namespace, SocketEvent.USER_JOINED, data);
      this.events.emit('userJoined', data);
    });
    
    socket.on(SocketEvent.USER_LEFT, (data: any) => {
      this.logSocketEvent('RECEIVE', namespace, SocketEvent.USER_LEFT, data);
      this.events.emit('userLeft', data);
    });
    
    // 面试特有事件
    if (namespace === 'interview') {
      socket.on(SocketEvent.ROOM_STATUS, (data: RoomStatus) => {
        this.logSocketEvent('RECEIVE', namespace, SocketEvent.ROOM_STATUS, data);
        this.events.emit('roomStatus', data);
      });
      
      socket.on(SocketEvent.ALL_READY, (data: RoomStatus) => {
        this.logSocketEvent('RECEIVE', namespace, SocketEvent.ALL_READY, data);
        this.events.emit('allReady', data);
      });
    }
    
    // 聊天特有事件
    if (namespace === 'chat') {
      socket.on(SocketEvent.NEW_MESSAGE, (data: ChatMessage) => {
        this.logSocketEvent('RECEIVE', namespace, SocketEvent.NEW_MESSAGE, data);
        this.events.emit('newMessage', data);
      });
    }
    
    // 通知特有事件
    if (namespace === 'notification') {
      socket.on(SocketEvent.NEW_NOTIFICATION, (data: WebSocketMessage) => {
        this.logSocketEvent('RECEIVE', namespace, SocketEvent.NEW_NOTIFICATION, data);
        this.events.emit('newNotification', data);
      });
    }
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
    if (!this.isConnected()) {
      throw new Error('Socket未连接');
    }
    
    this.currentRoomId = roomId;
    this.currentRole = role;
    
    const request: JoinRoomRequest = {
      roomId,
      userId: this.userId!,
      role
    };
    
    this.logSocketEvent('SEND', 'interview', SocketEvent.JOIN_ROOM, request);
    this.getSocket(SocketNamespace.INTERVIEW).emit(SocketEvent.JOIN_ROOM, request);
  }
  
  /**
   * 离开房间
   */
  public leaveRoom(): void {
    if (!this.currentRoomId) {
      return;
    }
    
    const request = {
      roomId: this.currentRoomId,
      userId: this.userId
    };
    
    this.logSocketEvent('SEND', 'interview', SocketEvent.LEAVE_ROOM, request);
    this.getSocket(SocketNamespace.INTERVIEW).emit(SocketEvent.LEAVE_ROOM, request);
    
    this.currentRoomId = null;
    this.currentRole = null;
  }
  
  /**
   * 标记准备就绪
   */
  public markReady(): void {
    if (!this.currentRoomId) {
      throw new Error('未加入房间');
    }
    
    const request = {
      roomId: this.currentRoomId,
      userId: this.userId
    };
    
    this.logSocketEvent('SEND', 'interview', SocketEvent.MARK_READY, request);
    this.getSocket(SocketNamespace.INTERVIEW).emit(SocketEvent.MARK_READY, request);
  }
  
  /**
   * 发送聊天消息
   */
  public sendMessage(content: string): void {
    if (!this.currentRoomId) {
      throw new Error('未加入房间');
    }
    
    const message = {
      roomId: this.currentRoomId,
      content,
      senderId: this.userId,
      senderName: this.userName,
      type: 'text'
    };
    
    this.logSocketEvent('SEND', 'chat', SocketEvent.SEND_MESSAGE, message);
    this.getSocket(SocketNamespace.CHAT).emit(SocketEvent.SEND_MESSAGE, message);
  }
  
  /**
   * 订阅通知
   */
  public subscribeToNotifications(): void {
    if (!this.isConnected()) {
      throw new Error('Socket未连接');
    }
    
    const request = {
      userId: this.userId
    };
    
    this.logSocketEvent('SEND', 'notification', SocketEvent.SUBSCRIBE, request);
    this.getSocket(SocketNamespace.NOTIFICATION).emit(SocketEvent.SUBSCRIBE, request);
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
    this.currentRoomId = null;
    this.currentRole = null;
    this.reconnectAttempts = 0;
  }
}

// 创建单例
export const socketService = new SocketService();
export default socketService;
