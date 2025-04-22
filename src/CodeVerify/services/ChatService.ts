/**
 * 聊天服务
 * 
 * 管理WebSocket连接和聊天相关的事件处理
 * 作为面试过程中聊天功能的核心服务
 */

import { apiConfig } from '../../api';
import { ChatMessage } from '../../api/types';

// 在生产环境中需要安装socket.io-client
// 为避免类型错误，先定义一个简化的Socket接口
interface Socket {
  id: string;
  connected: boolean;
  on: (event: string, callback: any) => void;
  emit: (event: string, ...args: any[]) => any;
  disconnect: () => void;
}

// 模拟io函数，实际项目中需要从socket.io-client导入
const io = (_url: string, _options?: any): Socket => {
  console.warn('使用模拟socket.io实现，实际项目中请安装socket.io-client');
  return {
    id: `mock-socket-${Date.now()}`,
    connected: true,
    on: (event: string, _callback: any) => {
      console.log(`[模拟Socket] 监听事件: ${event}`);
    },
    emit: (event: string, ...args: any[]) => {
      console.log(`[模拟Socket] 发送事件: ${event}`, args);
      return true;
    },
    disconnect: () => {
      console.log('[模拟Socket] 断开连接');
    }
  };
};

/**
 * 事件回调类型定义
 */
type MessageCallback = (message: ChatMessage) => void;
type ConnectionCallback = (status: boolean) => void;
type ErrorCallback = (error: Error) => void;

/**
 * 聊天服务类
 * 管理与面试房间相关的WebSocket连接和事件处理
 */
export class ChatService {
  private socket: Socket | null = null;
  private readonly url: string;
  private roomId: string | null = null;
  private userId: string;
  private username: string;
  private connected: boolean = false;
//   private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private reconnecting: boolean = false;
  private manualDisconnect: boolean = false;
  
  // 回调函数存储
  private onMessageCallbacks: MessageCallback[] = [];
  private onConnectionCallbacks: ConnectionCallback[] = [];
  private onErrorCallbacks: ErrorCallback[] = [];
  
  /**
   * 构造函数
   * @param userId 用户ID
   * @param username 用户名
   */
  constructor(userId: string, username: string) {
    this.url = apiConfig.WS_BASE_URL; // 修正属性名
    this.userId = userId;
    this.username = username;
  }
  
  /**
   * 初始化WebSocket连接
   * @returns 返回连接状态的Promise
   */
  public async initialize(): Promise<boolean> {
    try {
      if (this.socket) {
        console.log('ChatService: WebSocket连接已存在，将重用现有连接');
        return this.connected;
      }
      
      console.log(`ChatService: 正在连接到WebSocket服务器 ${this.url}`);
      
      this.socket = io(this.url, {
        transports: ['websocket'],
        query: {
          userId: this.userId,
          username: this.username
        },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });
      
      this.setupEventListeners();
      
      return new Promise((resolve) => {
        // 设置5秒超时
        const timeout = setTimeout(() => {
          if (!this.connected) {
            console.error('ChatService: WebSocket连接超时');
            resolve(false);
          }
        }, 5000);
        
        // 连接成功回调
        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          this.connected = true;
          console.log('ChatService: WebSocket连接成功');
          this.notifyConnectionCallbacks(true);
          resolve(true);
        });
        
        // 连接错误回调 - 使用原生socket.io的事件名，但不再作为自定义事件发送
        this.socket!.on('connect_error', (error: any) => {
          clearTimeout(timeout);
          console.error(`ChatService: WebSocket连接失败: ${error.message}`);
          this.notifyErrorCallbacks(new Error(`连接失败: ${error.message}`));
          resolve(false);
        });
      });
    } catch (error) {
      console.error('ChatService: 初始化WebSocket时发生错误', error);
      this.notifyErrorCallbacks(error instanceof Error ? error : new Error('未知错误'));
      return false;
    }
  }
  
  /**
   * 加入聊天房间
   * @param roomId 聊天房间ID（面试ID）
   * @returns 返回是否成功的Promise
   */
  public async joinRoom(roomId: string): Promise<boolean> {
    if (!this.socket || !this.connected) {
      console.error('ChatService: 尝试加入房间前需要先连接WebSocket');
      return false;
    }
    
    try {
      console.log(`ChatService: 正在加入房间 ${roomId}`);
      
      return new Promise((resolve) => {
        this.socket!.emit('join_room', { roomId }, (response: { success: boolean; error?: string }) => {
          if (response.success) {
            this.roomId = roomId;
            console.log(`ChatService: 成功加入房间 ${roomId}`);
            resolve(true);
          } else {
            console.error(`ChatService: 加入房间失败: ${response.error || '未知错误'}`);
            resolve(false);
          }
        });
        
        // 设置超时
        setTimeout(() => {
          if (!this.roomId) {
            console.error('ChatService: 加入房间请求超时');
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('ChatService: 加入房间时发生错误', error);
      return false;
    }
  }
  
  /**
   * 发送消息
   * @param content 消息内容
   * @param type 消息类型
   * @returns 返回是否成功的Promise
   */
  public async sendMessage(content: string, type: 'text' | 'image' | 'file' = 'text'): Promise<ChatMessage | null> {
    if (!this.socket || !this.connected) {
      console.error('ChatService: 尝试发送消息前需要先连接WebSocket');
      return null;
    }
    
    if (!this.roomId) {
      console.error('ChatService: 尝试发送消息前需要先加入房间');
      return null;
    }
    
    try {
      const messageData = {
        roomId: this.roomId,
        senderId: this.userId,
        senderName: this.username,
        content,
        type,
        createdAt: new Date().toISOString(),
      };
      
      return new Promise((resolve) => {
        this.socket!.emit('send_message', messageData, (response: { success: boolean; message?: ChatMessage; error?: string }) => {
          if (response.success && response.message) {
            console.log('ChatService: 消息发送成功', response.message);
            resolve(response.message);
          } else {
            console.error(`ChatService: 消息发送失败: ${response.error || '未知错误'}`);
            resolve(null);
          }
        });
        
        // 设置超时
        setTimeout(() => {
          console.error('ChatService: 发送消息请求超时');
          resolve(null);
        }, 5000);
      });
    } catch (error) {
      console.error('ChatService: 发送消息时发生错误', error);
      return null;
    }
  }
  
  /**
   * 离开当前房间
   */
  public leaveCurrentRoom(): void {
    if (!this.socket || !this.connected || !this.roomId) {
      return;
    }
    
    console.log(`ChatService: 正在离开房间 ${this.roomId}`);
    this.socket.emit('leave_room', { roomId: this.roomId });
    this.roomId = null;
  }
  
  /**
   * 添加消息接收回调
   * @param callback 回调函数
   */
  public onMessage(callback: MessageCallback): void {
    this.onMessageCallbacks.push(callback);
  }
  
  /**
   * 添加连接状态变化回调
   * @param callback 回调函数
   */
  public onConnectionChange(callback: ConnectionCallback): void {
    this.onConnectionCallbacks.push(callback);
  }
  
  /**
   * 添加错误处理回调
   * @param callback 回调函数
   */
  public onError(callback: ErrorCallback): void {
    this.onErrorCallbacks.push(callback);
  }
  
  /**
   * 断开WebSocket连接
   */
  public disconnect(): void {
    if (this.socket) {
      this.manualDisconnect = true; // 标记为手动断开
      this.connected = false;
      this.socket.disconnect();
      this.socket = null;
      this.roomId = null;
      this.notifyConnectionCallbacks(false);
      console.log('ChatService: WebSocket连接已断开');
    }
  }
  
  /**
   * 手动重新连接WebSocket
   * 当自动重连失败后可以调用此方法
   */
  public async reconnect(): Promise<boolean> {
    if (this.reconnecting) {
      console.log('ChatService: 已经在尝试重连中');
      return false;
    }

    this.reconnecting = true;
    this.manualDisconnect = false; // 重置手动断开标记
    
    try {
      console.log('ChatService: 尝试手动重新连接');
      const result = await this.initialize();
      
      // 如果重连成功且之前在某个房间，则重新加入
      if (result && this.roomId) {
        await this.joinRoom(this.roomId);
      }
      
      this.reconnecting = false;
      return result;
    } catch (error) {
      console.error('ChatService: 手动重连失败', error);
      this.reconnecting = false;
      this.notifyErrorCallbacks(error instanceof Error ? error : new Error('手动重连失败'));
      return false;
    }
  }
  
  /**
   * 设置WebSocket事件监听器
   */
  private setupEventListeners(): void {
    if (!this.socket) return;
    
    // 接收新消息
    this.socket.on('new_message', (message: ChatMessage) => {
      console.log('ChatService: 收到新消息', message);
      this.notifyMessageCallbacks(message);
    });
    
    // 断开连接
    this.socket.on('disconnect', (reason: string) => { // 添加类型
      this.connected = false;
      console.log(`ChatService: WebSocket连接断开: ${reason}`);
      
      // 根据断开原因确定是否需要手动重连
      // 'io client disconnect' - 客户端手动断开
      // 'io server disconnect' - 服务器断开连接，需要手动重连
      // 'ping timeout' - 心跳超时，可能是网络问题
      // 'transport close' - 传输层关闭，网络问题
      if (reason === 'io server disconnect') {
        // 服务器主动断开，需要手动重连
        console.log('ChatService: 服务器断开连接，需要手动重连');
        if (!this.manualDisconnect) {
          setTimeout(() => this.reconnect(), 1000);
        }
      } else if (this.manualDisconnect) {
        // 用户手动断开，不自动重连
        console.log('ChatService: 用户手动断开，不自动重连');
      }
      
      this.notifyConnectionCallbacks(false);
    });
    
    // 重新连接
    this.socket.on('reconnect', (attemptNumber: number) => { // 添加类型
      this.connected = true;
      console.log(`ChatService: WebSocket重新连接成功，尝试次数: ${attemptNumber}`);
      this.notifyConnectionCallbacks(true);
      
      // 如果之前在房间中，重新加入
      if (this.roomId) {
        this.joinRoom(this.roomId);
      }
    });
    
    // 重新连接尝试
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`ChatService: 正在尝试重新连接，第${attemptNumber}次尝试`);
      // 可以向用户显示重连进度
    });
    
    // 重新连接错误
    this.socket.on('reconnect_error', (error: any) => {
      console.error(`ChatService: 重新连接发生错误: ${error.message || '未知错误'}`);
      // 不向外部发送事件，只在内部处理
    });
    
    // 重新连接失败
    this.socket.on('reconnect_failed', () => {
      console.error('ChatService: WebSocket重新连接失败，已达到最大尝试次数');
      this.notifyErrorCallbacks(new Error('重新连接失败，已达到最大尝试次数'));
    });
    
    // 错误处理
    this.socket.on('error', (error: any) => { // 添加类型
      console.error('ChatService: WebSocket错误', error);
      this.notifyErrorCallbacks(new Error(error.message || '未知WebSocket错误'));
    });
  }
  
  /**
   * 通知所有消息回调
   * @param message 消息对象
   */
  private notifyMessageCallbacks(message: ChatMessage): void {
    this.onMessageCallbacks.forEach(callback => callback(message));
  }
  
  /**
   * 通知所有连接状态回调
   * @param status 连接状态
   */
  private notifyConnectionCallbacks(status: boolean): void {
    this.onConnectionCallbacks.forEach(callback => callback(status));
  }
  
  /**
   * 通知所有错误回调
   * @param error 错误对象
   */
  private notifyErrorCallbacks(error: Error): void {
    this.onErrorCallbacks.forEach(callback => callback(error));
  }
} 