/**
 * 面试聊天API
 * 
 * 提供面试过程中的文字聊天功能
 */

import { ChatService } from '../CodeVerify/services/ChatService';
import { ApiResponse, ChatMessage } from './types';
import { mockGetChatMessages, mockSendMessage } from './mockData';

// 导入getCurrentUser函数
import { getCurrentUser } from './user';

// 确定当前环境
const IS_DEV = import.meta.env.DEV || import.meta.env.MODE === 'development';

// 存储活跃的聊天服务实例
const activeChatServices: Record<string, ChatService> = {};

/**
 * 初始化面试聊天服务
 * @param interviewId 面试ID（作为聊天室ID）
 * @returns 返回是否成功初始化
 */
export const initializeInterviewChat = async (interviewId: string): Promise<ApiResponse<boolean>> => {
  try {
    // 检查是否已经初始化
    if (activeChatServices[interviewId]) {
      console.log(`聊天服务已为面试${interviewId}初始化`);
      return {
        code: 200,
        success: true,
        message: '聊天服务已初始化',
        data: true
      };
    }

    // 获取当前用户信息
    const currentUser = await getCurrentUser();
    if (!currentUser.success || !currentUser.data) {
      return {
        code: 401,
        success: false,
        message: '用户未登录，无法初始化聊天服务',
        data: false
      };
    }

    // 创建聊天服务实例
    const chatService = new ChatService(currentUser.data.id, currentUser.data.username);
    
    // 初始化WebSocket连接
    const initialized = await chatService.initialize();
    if (!initialized) {
      return {
        code: 500,
        success: false,
        message: '初始化聊天服务失败',
        data: false
      };
    }

    // 加入面试聊天室
    const joined = await chatService.joinRoom(interviewId);
    if (!joined) {
      chatService.disconnect();
      return {
        code: 500,
        success: false,
        message: '加入面试聊天室失败',
        data: false
      };
    }

    // 保存活跃的聊天服务
    activeChatServices[interviewId] = chatService;

    return {
      code: 200,
      success: true,
      message: '聊天服务初始化成功',
      data: true
    };
  } catch (error) {
    console.error('初始化面试聊天服务失败:', error);
    return {
      code: 500,
      success: false,
      message: `初始化聊天服务失败: ${error instanceof Error ? error.message : '未知错误'}`,
      data: false
    };
  }
};

/**
 * 获取面试聊天消息
 * @param interviewId 面试ID
 * @param before 获取此消息之前的消息（可选）
 * @param limit 获取消息数量限制（默认20）
 * @returns 聊天消息列表
 */
export const getInterviewMessages = async (
  interviewId: string,
  before?: string,
  limit: number = 20
): Promise<ApiResponse<{list: ChatMessage[], total: number}>> => {
  // 开发环境使用模拟数据
  if (IS_DEV) {
    const response = mockGetChatMessages(interviewId, before, limit);
    return {
      code: response.code,
      success: response.success,
      message: response.message,
      data: response.data
    };
  }

  // 生产环境实现
  // 检查聊天服务是否已初始化
  if (!activeChatServices[interviewId]) {
    console.warn(`获取消息前聊天服务未初始化，将尝试初始化面试${interviewId}的聊天服务`);
    const initResult = await initializeInterviewChat(interviewId);
    if (!initResult.success) {
      return {
        code: 500,
        success: false,
        message: '获取消息失败：聊天服务未初始化',
        data: {list: [], total: 0}
      };
    }
  }

  // 这里实际项目中应该通过API获取历史消息
  // 当前版本使用模拟数据
  const response = mockGetChatMessages(interviewId, before, limit);
  return {
    code: response.code,
    success: response.success,
    message: response.message,
    data: response.data
  };
};

/**
 * 发送面试聊天消息
 * @param interviewId 面试ID
 * @param content 消息内容
 * @param type 消息类型（默认为文本）
 * @returns 发送结果
 */
export const sendInterviewMessage = async (
  interviewId: string,
  content: string,
  type: 'text' | 'image' | 'file' = 'text'
): Promise<ApiResponse<ChatMessage>> => {
  try {
    // 检查聊天服务是否已初始化
    if (!activeChatServices[interviewId]) {
      console.warn(`发送消息前聊天服务未初始化，将尝试初始化面试${interviewId}的聊天服务`);
      const initResult = await initializeInterviewChat(interviewId);
      if (!initResult.success) {
        return {
          code: 500,
          success: false,
          message: '发送消息失败：聊天服务未初始化',
          data: {} as ChatMessage  // 使用类型断言避免null
        };
      }
    }

    const chatService = activeChatServices[interviewId];
    
    // 开发环境使用模拟数据
    if (IS_DEV) {
      // 获取当前用户
      const currentUser = await getCurrentUser();
      const senderId = currentUser.success && currentUser.data ? currentUser.data.id : '1';  // 默认为测试用户ID
      
      // 使用模拟函数发送消息
      const response = mockSendMessage(interviewId, content, senderId, type);
      
      // 同时通过WebSocket发送（模拟）
      if (chatService) {
        await chatService.sendMessage(content, type);
      }
      
      return {
        code: response.code,
        success: response.success,
        message: response.message,
        data: response.data
      };
    }

    // 生产环境通过WebSocket发送消息
    const message = await chatService.sendMessage(content, type);
    if (!message) {
      return {
        code: 500,
        success: false,
        message: '发送消息失败',
        data: {} as ChatMessage  // 使用类型断言避免null
      };
    }

    return {
      code: 201,
      success: true,
      message: '发送消息成功',
      data: message
    };
  } catch (error) {
    console.error('发送面试聊天消息失败:', error);
    return {
      code: 500,
      success: false,
      message: `发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`,
      data: {} as ChatMessage  // 使用类型断言避免null
    };
  }
};

/**
 * 关闭面试聊天
 * @param interviewId 面试ID
 */
export const closeInterviewChat = (interviewId: string): void => {
  const chatService = activeChatServices[interviewId];
  if (chatService) {
    chatService.disconnect();
    delete activeChatServices[interviewId];
    console.log(`已关闭面试${interviewId}的聊天服务`);
  }
};

/**
 * 订阅面试聊天消息
 * @param interviewId 面试ID
 * @param callback 消息回调函数
 */
export const subscribeToInterviewMessages = async (
  interviewId: string,
  callback: (message: ChatMessage) => void
): Promise<boolean> => {
  // 检查聊天服务是否已初始化
  if (!activeChatServices[interviewId]) {
    console.warn(`订阅消息前聊天服务未初始化，将尝试初始化面试${interviewId}的聊天服务`);
    const initResult = await initializeInterviewChat(interviewId);
    if (!initResult.success) {
      return false;
    }
  }

  const chatService = activeChatServices[interviewId];
  chatService.onMessage(callback);
  return true;
};

/**
 * 监听连接状态变化
 * @param interviewId 面试ID
 * @param callback 状态回调函数
 */
export const onChatConnectionChange = async (
  interviewId: string,
  callback: (connected: boolean) => void
): Promise<boolean> => {
  // 检查聊天服务是否已初始化
  if (!activeChatServices[interviewId]) {
    console.warn(`监听连接状态前聊天服务未初始化，将尝试初始化面试${interviewId}的聊天服务`);
    const initResult = await initializeInterviewChat(interviewId);
    if (!initResult.success) {
      return false;
    }
  }

  const chatService = activeChatServices[interviewId];
  chatService.onConnectionChange(callback);
  return true;
}; 