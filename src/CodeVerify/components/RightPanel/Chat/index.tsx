import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Avatar, Spin, message } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import styles from './styles.module.scss';
import { ChatService } from '../../../services/ChatService';
import { ChatMessage } from '../../../../api/types';
import { formatTime } from '../../../utils';
import ConnectionStatus from '../ConnectionStatus';
import { getInterviewMessages } from '../../../../api/textChat';

interface ChatProps {
  interviewId: string;
  interviewerName?: string;
  userId: string;
  username: string;
}

const Chat: React.FC<ChatProps> = ({ 
  interviewId, 
  interviewerName = '面试官',
  userId,
  username
}) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | undefined>(undefined);
  const [service, setService] = useState<ChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // 初始化聊天和获取历史消息
  useEffect(() => {
    if (!interviewId || !userId || !username) return;

    const initChat = async () => {
      try {
        setLoading(true);
        
        // 创建聊天服务实例，传递正确的参数
        const newService = new ChatService(userId, username);
        
        // 添加连接状态回调
        newService.onConnectionChange((status: boolean) => {
          setConnected(status);
          if (status) {
            setReconnecting(false);
            setConnectionError(undefined);
          }
        });
        
        // 添加错误处理回调
        newService.onError((error: Error) => {
          console.error('Chat error:', error);
          setConnectionError(error.message);
        });
        
        await newService.initialize();
        await newService.joinRoom(interviewId);
        setService(newService);
        
        // 添加消息回调
        newService.onMessage((message: ChatMessage) => {
          setMessages(prevMessages => [...prevMessages, message]);
        });
        
        // 获取历史消息
        const response = await getInterviewMessages(interviewId);
        if (response.success && response.data) {
          setMessages(response.data.list);
        }
        
        setConnected(true);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setConnectionError(error instanceof Error ? error.message : '初始化聊天失败');
        setLoading(false);
      }
    };

    initChat();

    return () => {
      if (service) {
        service.disconnect();
      }
    };
  }, [interviewId, userId, username]);
  
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
    if (inputValue.trim() && service) {
      try {
        const sentMessage = await service.sendMessage(inputValue);
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

  const handleReconnect = async () => {
    if (!service) return;
    
    setReconnecting(true);
    try {
      const success = await service.reconnect();
      if (!success) {
        setConnectionError('重连失败，请稍后再试');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : '重连失败');
    } finally {
      if (!connected) {
        setReconnecting(false);
      }
    }
  };

  return (
    <div className={styles.chatContainer}>
      <ConnectionStatus 
        connected={connected} 
        reconnecting={reconnecting}
        onReconnect={handleReconnect}
        connectionError={connectionError}
      />
      
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