/**
 * 模拟数据文件
 * 
 * 本文件包含用于开发和测试的模拟数据
 * 仅用于开发环境，生产环境应从后端API获取真实数据
 */

import { User, ChatMessage, ChatRoom } from './types';

// 测试账号信息
export const TEST_USER = {
  username: 'testuser',
  password: 'Test@123',
  email: 'test@example.com',
};

// 模拟用户数据
export const mockUsers: User[] = [
  {
    id: '1',
    username: TEST_USER.username,
    email: TEST_USER.email,
    avatar: 'https://avatars.githubusercontent.com/u/1',
    role: 'Candidate',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 使用测试账号的登录模拟函数
export const mockLogin = (username: string, password: string) => {
  if (username === TEST_USER.username && password === TEST_USER.password) {
    return {
      success: true,
      data: mockUsers[0],
      token: 'mock-jwt-token-for-development',
      message: '登录成功',
    };
  }
  
  return {
    success: false,
    message: '用户名或密码错误',
  };
};

// 使用测试账号的注册模拟函数
export const mockRegister = (username: string, email: string /* password: string */) => {
  // 检查是否已存在同名用户
  if (username === TEST_USER.username) {
    return {
      success: false,
      message: '用户名已存在',
    };
  }
  
  // 检查是否已存在同邮箱用户
  if (email === TEST_USER.email) {
    return {
      success: false,
      message: '邮箱已被注册',
    };
  }
  
  // 模拟注册成功
  return {
    success: true,
    data: {
      id: '2',
      username,
      email,
      avatarUrl: 'https://avatars.githubusercontent.com/u/2',
      name: username,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    message: '注册成功',
  };
};

// 模拟聊天室数据
export const mockChatRooms: ChatRoom[] = [
  {
    id: 'room1',
    name: '面试官聊天室',
    participants: ['1', '2'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'room2',
    name: '技术讨论组',
    participants: ['1', '3', '4'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// 模拟聊天消息数据
export const mockChatMessages: Record<string, ChatMessage[]> = {
  'room1': [
    {
      id: 'msg1',
      roomId: 'room1',
      senderId: '2',
      senderName: '面试官',
      content: '你好，欢迎参加今天的面试！',
      type: 'text',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1小时前
    },
    {
      id: 'msg2',
      roomId: 'room1',
      senderId: '1',
      senderName: '测试用户',
      content: '谢谢！我已准备好了。',
      type: 'text',
      createdAt: new Date(Date.now() - 3500000).toISOString(), // 58分钟前
    },
    {
      id: 'msg3',
      roomId: 'room1',
      senderId: '2',
      senderName: '面试官',
      content: '请先介绍一下你自己吧。',
      type: 'text',
      createdAt: new Date(Date.now() - 3400000).toISOString(), // 56分钟前
    }
  ],
  'room2': [
    {
      id: 'msg4',
      roomId: 'room2',
      senderId: '3',
      senderName: '技术总监',
      content: '今天我们讨论一下新项目的架构。',
      type: 'text',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1天前
    },
    {
      id: 'msg5',
      roomId: 'room2',
      senderId: '1',
      senderName: '测试用户',
      content: '我认为我们应该使用React和TypeScript。',
      type: 'text',
      createdAt: new Date(Date.now() - 86000000).toISOString(), // 23小时前
    }
  ]
};

// 模拟获取聊天室列表
export const mockGetChatRooms = () => {
  return {
    code: 200,
    success: true,
    message: '获取聊天室列表成功',
    data: mockChatRooms,
  };
};

// 模拟获取聊天室详情
export const mockGetChatRoomById = (roomId: string) => {
  const room = mockChatRooms.find(r => r.id === roomId);
  
  if (!room) {
    return {
      code: 404,
      success: false,
      message: '聊天室不存在',
      data: null,
    };
  }
  
  return {
    code: 200,
    success: true,
    message: '获取聊天室成功',
    data: room,
  };
};

// 模拟获取聊天消息
export const mockGetChatMessages = (roomId: string, before?: string, limit: number = 20) => {
  const messages = mockChatMessages[roomId] || [];
  
  // 根据before参数过滤消息
  let filteredMessages = [...messages];
  if (before) {
    const beforeIndex = messages.findIndex(msg => msg.id === before);
    if (beforeIndex > 0) {
      filteredMessages = messages.slice(0, beforeIndex);
    }
  }
  
  // 按照创建时间降序排序
  filteredMessages.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // 限制返回数量
  const limitedMessages = filteredMessages.slice(0, limit);
  
  return {
    code: 200,
    success: true,
    message: '获取消息成功',
    data: {
      list: limitedMessages,
      total: messages.length,
      page: 1,
      pageSize: limit,
      totalPages: Math.ceil(messages.length / limit),
    },
  };
};

// 模拟发送消息
let messageIdCounter = 10; // 从10开始，避免和初始数据冲突
export const mockSendMessage = (roomId: string, content: string, senderId: string = '1', type: 'text' | 'image' | 'file' = 'text') => {
  const room = mockChatRooms.find(r => r.id === roomId);
  
  // 创建一个新消息对象（即使房间不存在也创建，以避免返回null）
  const newMessage: ChatMessage = {
    id: `msg${messageIdCounter++}`,
    roomId,
    senderId,
    senderName: '未知用户',
    content,
    type,
    createdAt: new Date().toISOString(),
  };
  
  if (!room) {
    // 即使房间不存在，也返回消息对象，但标记为失败
    return {
      code: 404,
      success: false,
      message: '聊天室不存在，但消息已创建（测试模式）',
      data: newMessage // 返回消息对象而不是null
    };
  }
  
  // 查找发送者信息
  const sender = mockUsers.find(u => u.id === senderId);
  if (sender) {
    newMessage.senderName = sender.username;
  }
  
  // 添加到消息列表
  if (!mockChatMessages[roomId]) {
    mockChatMessages[roomId] = [];
  }
  mockChatMessages[roomId].push(newMessage);
  
  return {
    code: 201,
    success: true,
    message: '发送消息成功',
    data: newMessage,
  };
}; 