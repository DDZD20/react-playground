import React, { useState } from 'react';
import { Input, Button, Avatar } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import styles from './styles.module.scss';

interface Message {
  id: number;
  sender: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
}

interface ChatProps {
  // 后续可添加实际功能需要的props
}

const Chat: React.FC<ChatProps> = () => {
  const [inputValue, setInputValue] = useState('');
  // 模拟一些聊天消息
  const [messages] = useState<Message[]>([
    {
      id: 1,
      sender: 'interviewer',
      content: '你好！欢迎参加今天的面试。请先简单介绍一下自己吧。',
      timestamp: '10:00'
    },
    {
      id: 2,
      sender: 'candidate',
      content: '您好！我是一名前端开发工程师，有5年React开发经验，熟悉TypeScript和现代前端工具链。',
      timestamp: '10:01'
    },
    {
      id: 3,
      sender: 'interviewer',
      content: '很好！你能谈谈你在之前的项目中遇到的一些挑战和解决方案吗？',
      timestamp: '10:02'
    },
    {
      id: 4,
      sender: 'candidate',
      content: '在我之前的项目中，我们面临的最大挑战是大规模应用的状态管理和性能优化问题。我们通过引入Redux和React Query解决了状态管理问题，并通过代码分割和虚拟列表优化了性能。',
      timestamp: '10:03'
    }
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      // 这里只是演示，实际实现时会添加消息到列表
      console.log('Sending message:', inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <div className={styles.interviewInfo}>
          <h3>技术面试聊天</h3>
          <span className={styles.status}>在线</span>
        </div>
      </div>
      
      <div className={styles.messageContainer}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`${styles.messageWrapper} ${message.sender === 'candidate' ? styles.outgoing : styles.incoming}`}
          >
            <Avatar 
              className={styles.avatar}
              style={{ 
                backgroundColor: message.sender === 'interviewer' ? '#1677ff' : '#52c41a' 
              }}
            >
              {message.sender === 'interviewer' ? 'I' : 'C'}
            </Avatar>
            <div className={styles.messageContent}>
              <div className={styles.message}>{message.content}</div>
              <div className={styles.messageTime}>{message.timestamp}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={styles.inputArea}>
        <Input.TextArea
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          className={styles.input}
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend}
          className={styles.sendButton}
        />
      </div>
    </div>
  );
};

export default Chat; 