import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Avatar, Spin, message } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import styles from './styles.module.scss';
import { ChatService } from '../../services/ChatService';
import { ChatMessage } from '../../../api/types';
import { formatTime } from '../../utils';
import { mockGetChatMessages } from '../../../api/mockData';
import { getCurrentUser } from '../../../api/user';

interface ChatProps {
  interviewId: string;
  interviewerName?: string;
}

const Chat: React.FC<ChatProps> = ({ 
  interviewId, 
  interviewerName = '面试官' 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // 初始化聊天和获取历史消息
  useEffect(() => {
    let isMounted = true;
    
    const setupChat = async () => {
      try {
        setLoading(true);
        
        // 获取当前用户信息
        const userResponse = await getCurrentUser();
        if (!userResponse.success || !userResponse.data) {
          message.error('无法获取当前用户信息，请先登录');
          return;
        }
        
        const user = userResponse.data;
        
        // 创建并初始化ChatService实例
        const service = new ChatService(user.id, user.username);
        
        // 初始化WebSocket连接
        const initialized = await service.initialize();
        if (!initialized) {
          message.error('无法初始化聊天连接');
          return;
        }
        
        // 加入面试聊天室
        const joined = await service.joinRoom(interviewId);
        if (!joined) {
          message.error('无法加入聊天室');
          service.disconnect();
          return;
        }
        
        if (isMounted) {
          setChatService(service);
          setConnected(true);
        }
        
        // 获取历史消息（使用模拟数据）
        const historyResponse = mockGetChatMessages(interviewId);
        if (historyResponse.success && isMounted) {
          setMessages(historyResponse.data.list);
        }
        
        // 订阅新消息
        service.onMessage((newMessage) => {
          if (isMounted) {
            setMessages(prev => [...prev, newMessage]);
          }
        });
        
        // 监听连接状态
        service.onConnectionChange((status) => {
          if (isMounted) {
            setConnected(status);
            if (status) {
              message.success('聊天已连接');
            } else {
              message.warning('聊天已断开');
            }
          }
        });
        
        // 监听错误
        service.onError((error) => {
          if (isMounted) {
            message.error(`聊天错误: ${error.message}`);
          }
        });
      } catch (error) {
        if (isMounted) {
          message.error(`聊天初始化错误: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    setupChat();
    
    // 组件卸载时清理资源
    return () => {
      isMounted = false;
      if (chatService) {
        chatService.disconnect();
      }
    };
  }, [interviewId]);
  
  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };
  
  // 发送消息
  const handleSend = async () => {
    if (inputValue.trim() && chatService) {
      try {
        const sentMessage = await chatService.sendMessage(inputValue);
        if (!sentMessage) {
          message.error('发送消息失败');
        }
        setInputValue('');
      } catch (error) {
        message.error(`发送消息错误: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  };
  
  // 键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // 判断消息发送者类型
  const getSenderType = (senderId: string): 'interviewer' | 'candidate' => {
    // 根据实际业务逻辑判断是否为面试官
    // 这里简单示例：非"1"的ID被视为面试官
    return senderId !== '1' ? 'interviewer' : 'candidate';
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <div className={styles.interviewInfo}>
          <h3>面试聊天</h3>
          <span className={`${styles.status} ${connected ? styles.online : styles.offline}`}>
            {connected ? '在线' : '离线'}
          </span>
        </div>
      </div>
      
      <div className={styles.messageContainer} ref={messageContainerRef}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin tip="加载消息中..." />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>还没有消息，开始聊天吧！</p>
          </div>
        ) : (
          messages.map((msg) => {
            const senderType = getSenderType(msg.senderId);
            return (
              <div 
                key={msg.id} 
                className={`${styles.messageWrapper} ${senderType === 'candidate' ? styles.outgoing : styles.incoming}`}
              >
                <Avatar 
                  className={styles.avatar}
                  style={{ 
                    backgroundColor: senderType === 'interviewer' ? '#1677ff' : '#52c41a' 
                  }}
                  icon={<UserOutlined />}
                >
                  {senderType === 'interviewer' ? 'I' : 'C'}
                </Avatar>
                <div className={styles.messageContent}>
                  <div className={styles.senderName}>
                    {senderType === 'interviewer' ? interviewerName : msg.senderName}
                  </div>
                  <div className={styles.message}>{msg.content}</div>
                  <div className={styles.messageTime}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className={styles.inputArea}>
        <Input.TextArea
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          className={styles.input}
          disabled={!connected || loading}
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend}
          className={styles.sendButton}
          disabled={!connected || loading || !inputValue.trim()}
        />
      </div>
    </div>
  );
};

export default Chat; 