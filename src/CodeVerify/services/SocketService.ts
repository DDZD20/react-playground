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
  private socket: any = null; 
  private events = new EventEmitter();
  private userId: string | null = null;
  private userName: string | null = null;
  private token: string | null = null;
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
  private logSocketEvent(type: 'SEND' | 'RECEIVE', event: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const direction = type === 'SEND' ? '发送 ' : '接收 ';
    console.log(`[${timestamp}] ${direction} ${event}`, data || '');
  }
  
  /**
   * 连接到WebSocket服务器
   */
  public async connect(baseUrl: string, userId: string, userName: string, token?: string): Promise<boolean> {
    this.baseUrl = baseUrl;
    this.userId = userId;
    this.userName = userName;
    this.token = token || null;
    
    try {
      await this.connectMainNamespace(token);
      return true;
    } catch (error) {
      console.error('Socket连接失败:', error);
      return false;
    }
  }
  
  /**
   * 连接主命名空间
   */
  private connectMainNamespace(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.baseUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 10000,
        query: {
          userId: this.userId,
          userName: this.userName
        },
        auth: {
          token: token
        }
      });
      
      this.socket.on(SocketEvent.CONNECT, () => {
        this.logSocketEvent('RECEIVE', SocketEvent.CONNECT);
        this.events.emit(SocketEvent.CONNECT);
        resolve();
      });
      
      this.socket.on(SocketEvent.DISCONNECT, (reason: string) => {
        this.logSocketEvent('RECEIVE', SocketEvent.DISCONNECT, { reason });
        this.events.emit(SocketEvent.DISCONNECT, reason);
        this.handleDisconnect(reason);
      });
      
      // 监听原生的connect_error事件，但触发我们自定义的CONNECTION_ERROR事件
      this.socket.on('connect_error', (error: Error) => {
        this.logSocketEvent('RECEIVE', 'connect_error', { error: error.message });
        this.events.emit(SocketEvent.CONNECTION_ERROR, error);
        reject(error);
      });
      
      // 设置超时
      setTimeout(() => {
        if (!this.socket.connected) {
          reject(new Error('连接超时'));
        }
      }, 10000);

      // 设置所有事件监听器
      this.setupSocketListeners();
    });
  }
  
  /**
   * 处理断开连接
   */
  private handleDisconnect(reason: string): void {
    // 如果是服务器主动断开或网络问题，尝试重连
    if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.reconnect();
      } else {
        console.error('重连失败，已达到最大重试次数');
        this.events.emit('reconnect_failed');
      }
    }
  }
  
  /**
   * 重新连接
   */
  private async reconnect(): Promise<void> {
    try {
      await this.connectMainNamespace(this.token || undefined);
      
      // 如果之前在 房间中，重新加入
      if (this.currentRoomId && this.currentRole) {
        this.joinRoom(this.currentRoomId, this.currentRole);
      }
      
      console.log('重连成功');
      this.events.emit('reconnect_success');
    } catch (error) {
      console.error('重连失败:', error);
      this.events.emit('reconnect_error', error);
    }
  }
  
  /**
   * 设置Socket的事件监听器
   */
  private setupSocketListeners(): void {
    // 用户加入房间
    this.socket.on(SocketEvent.USER_JOINED, (data: any) => {
      this.logSocketEvent('RECEIVE', SocketEvent.USER_JOINED, data);
      this.events.emit(SocketEvent.USER_JOINED, data);
    });
    
    // 用户离开房间
    this.socket.on(SocketEvent.USER_LEFT, (data: any) => {
      this.logSocketEvent('RECEIVE', SocketEvent.USER_LEFT, data);
      this.events.emit(SocketEvent.USER_LEFT, data);
    });
    
    // 房间状态更新
    this.socket.on(SocketEvent.ROOM_STATUS, (data: any) => {
      this.logSocketEvent('RECEIVE', SocketEvent.ROOM_STATUS, data);
      this.events.emit(SocketEvent.ROOM_STATUS, data);
    });
    
    // 所有人准备就绪
    this.socket.on(SocketEvent.ALL_READY, (data: any) => {
      this.logSocketEvent('RECEIVE', SocketEvent.ALL_READY, data);
      this.events.emit(SocketEvent.ALL_READY, data);
    });
    
    // 新消息
    this.socket.on(SocketEvent.NEW_MESSAGE, (data: any) => {
      this.logSocketEvent('RECEIVE', SocketEvent.NEW_MESSAGE, data);
      this.events.emit(SocketEvent.NEW_MESSAGE, data);
    });
    
    // 新通知
    this.socket.on(SocketEvent.NEW_NOTIFICATION, (data: any) => {
      this.logSocketEvent('RECEIVE', SocketEvent.NEW_NOTIFICATION, data);
      this.events.emit(SocketEvent.NEW_NOTIFICATION, data);
    });
    
    // WebRTC信令
    ['videoOffer', 'videoAnswer', 'iceCandidate'].forEach(event => {
      this.socket.on(event, (data: any) => {
        this.logSocketEvent('RECEIVE', event, data);
        this.events.emit(event, data);
      });
    });
  }
  
  /**
   * 检查Socket是否已连接
   */
  public isConnected(): boolean {
    return this.socket && this.socket.connected;
  }
  
  /**
   * 获取Socket实例
   */
  private getSocket(): any {
    if (!this.socket) {
      throw new Error('Socket未初始化');
    }
    return this.socket;
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
      roomId: roomId,
      userId: this.userId!,
      role
    };
    
    this.logSocketEvent('SEND', SocketEvent.JOIN_ROOM, request);
    this.getSocket().emit(SocketEvent.JOIN_ROOM, request);
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
    
    this.logSocketEvent('SEND', SocketEvent.LEAVE_ROOM, request);
    this.getSocket().emit(SocketEvent.LEAVE_ROOM, request);
    
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
    
    this.logSocketEvent('SEND', SocketEvent.MARK_READY, request);
    this.getSocket().emit(SocketEvent.MARK_READY, request);
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
    
    this.logSocketEvent('SEND', SocketEvent.SEND_MESSAGE, message);
    this.getSocket().emit(SocketEvent.SEND_MESSAGE, message);
  }
  
  /**
   * 发送WebRTC信令（videoOffer、videoAnswer、iceCandidate）
   * @param event 事件名
   * @param data  信令数据
   */
  public sendSignaling(event: 'videoOffer' | 'videoAnswer' | 'iceCandidate', data: any): void {
    // 事件名安全校验
    if (!["videoOffer", "videoAnswer", "iceCandidate"].includes(event)) {
      throw new Error('不支持的WebRTC信令事件');
    }
    this.logSocketEvent('SEND', event, data);
    this.getSocket().emit(event, data);
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
    
    this.logSocketEvent('SEND', SocketEvent.SUBSCRIBE, request);
    this.getSocket().emit(SocketEvent.SUBSCRIBE, request);
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
    if (this.socket) {
      console.log('断开Socket连接');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.events.removeAllListeners();
    this.currentRoomId = null;
    this.currentRole = null;
    this.reconnectAttempts = 0;
  }
}

// 创建单例
export const socketService = new SocketService();
export default socketService;
