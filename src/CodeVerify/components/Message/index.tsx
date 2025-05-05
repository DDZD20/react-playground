import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import './index.css';

// 消息类型定义
export type MessageType = 'info' | 'success' | 'error' | 'warning';

interface MessageItem {
  id: number;
  content: React.ReactNode;
  type: MessageType;
}

interface MessageContextProps {
  addMessage: (content: React.ReactNode, type: MessageType, duration?: number) => void;
}

const MessageContext = createContext<MessageContextProps | null>(null);

let globalAddMessage: MessageContextProps['addMessage'] | null = null;

// Provider 组件
export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const idRef = useRef(0);

  // 添加消息
  const addMessage = useCallback((content: React.ReactNode, type: MessageType, duration = 2000) => {
    const id = idRef.current++;
    setMessages(msgs => [...msgs, { id, content, type }]);
    setTimeout(() => {
      setMessages(msgs => msgs.filter(msg => msg.id !== id));
    }, duration);
  }, []);

  // 使全局 message.xxx 可用
  useEffect(() => {
    globalAddMessage = addMessage;
    return () => {
      globalAddMessage = null;
    };
  }, [addMessage]);

  return (
    <MessageContext.Provider value={{ addMessage }}>
      {children}
      <div className="custom-message-container">
        {messages.map(msg => (
          <div key={msg.id} className={`custom-message custom-message-${msg.type}`}>
            {msg.content}
          </div>
        ))}
      </div>
    </MessageContext.Provider>
  );
};

// 自定义 hook
export function useMessage() {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error('useMessage 必须在 <MessageProvider> 内使用');
  return ctx;
}

// 全局 message 对象，API 与 antd.message 类似
export const message = {
  info(content: React.ReactNode, duration?: number) {
    globalAddMessage && globalAddMessage(content, 'info', duration);
  },
  success(content: React.ReactNode, duration?: number) {
    globalAddMessage && globalAddMessage(content, 'success', duration);
  },
  error(content: React.ReactNode, duration?: number) {
    globalAddMessage && globalAddMessage(content, 'error', duration);
  },
  warning(content: React.ReactNode, duration?: number) {
    globalAddMessage && globalAddMessage(content, 'warning', duration);
  }
};

export default message;
