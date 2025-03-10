import React, { useState, useRef, useEffect, useContext } from 'react';
import { PlaygroundContext } from '../../PlaygroundContext';
import aiService from '../../services/AIService';
import './style.scss';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function AISidebar() {
  const { files, selectedFileName, theme } = useContext(PlaygroundContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 自动调整输入框高度
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 获取当前文件内容作为上下文
      const currentFile = files[selectedFileName];
      const fileContext = currentFile ? `文件名: ${currentFile.name}\n内容:\n${currentFile.value}` : '';

      // 调用 AI API
      const response = await fetchAIResponse(userMessage.content, fileContext, messages);
      
      // 添加 AI 回复
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('获取 AI 回答失败:', error);
      // 添加错误消息
      const errorMessage: Message = {
        role: 'assistant',
        content: '抱歉，获取回答时出现错误，请稍后再试。',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  // 调用 AI 服务获取回答
  const fetchAIResponse = async (
    question: string,
    fileContext: string,
    previousMessages: Message[]
  ): Promise<string> => {
    try {
      // 使用 AI 服务获取回答
      return await aiService.getAssistantResponse(
        question,
        fileContext,
        previousMessages
      );
    } catch (error) {
      console.error('AI API 调用失败:', error);
      throw error;
    }
  };

  // 格式化消息内容（支持代码块等 markdown 格式）
  const formatMessage = (content: string) => {
    // 简单的代码块识别和格式化
    // 实际应用中可以使用 markdown 解析库如 marked 或 react-markdown
    return content.split('```').map((part, index) => {
      if (index % 2 === 0) {
        return <p key={index} className="message-text">{part}</p>;
      } else {
        const [language, ...codeLines] = part.split('\n');
        const code = codeLines.join('\n');
        return (
          <pre key={index} className="code-block">
            <div className="code-header">
              <span>{language || 'code'}</span>
              <button 
                className="copy-button"
                onClick={() => navigator.clipboard.writeText(code)}
              >
                复制
              </button>
            </div>
            <code>{code}</code>
          </pre>
        );
      }
    });
  };

  return (
    <div className={`ai-sidebar ${theme}`}>
      <div className="ai-sidebar-header">
        <h3>AI 助手</h3>
        {messages.length > 0 && (
          <button className="clear-button" onClick={clearConversation}>
            清除对话
          </button>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>向 AI 助手提问，获取编程帮助</p>
            <div className="suggestion-chips">
              <button onClick={() => setInputValue("解释这段代码的作用")}>解释这段代码的作用</button>
              <button onClick={() => setInputValue("如何优化这个组件")}>如何优化这个组件</button>
              <button onClick={() => setInputValue("帮我找出代码中的问题")}>帮我找出代码中的问题</button>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? '你' : 'AI 助手'}
                </span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">
                {formatMessage(message.content)}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message assistant-message">
            <div className="message-header">
              <span className="message-role">AI 助手</span>
            </div>
            <div className="message-content loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="向 AI 助手提问..."
          rows={1}
          disabled={isLoading}
        />
        <button 
          className="send-button" 
          onClick={handleSendMessage}
          disabled={inputValue.trim() === '' || isLoading}
        >
          发送
        </button>
      </div>
    </div>
  );
}