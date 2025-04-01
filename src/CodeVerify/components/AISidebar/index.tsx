import React, { useState, useRef, useEffect, useContext, memo } from "react";
import { PlaygroundContext } from "../../PlaygroundContext";
import aiService from "../../services/AIService";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./style.scss";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const AISidebar = () => {
  const { files, selectedFileName, theme, showAISidebar } =
    useContext(PlaygroundContext);

  // 在组件挂载时打印调试信息并确保初始状态是关闭的
  useEffect(() => {
    console.log("AISidebar组件已挂载，showAISidebar状态：", showAISidebar);
    // 确保初始渲染时CSS正确应用
    const wrapper = document.querySelector(".ai-sidebar-wrapper");
    if (wrapper) {
      wrapper.classList.remove("show");
      console.log("确保移除show类");
    }
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 自动调整输入框高度
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(
        inputRef.current.scrollHeight,
        150
      )}px`;
    }
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "" || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      role: "user",
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // 创建一个临时的 assistant 消息用于流式更新
      const tempAssistantMessage: Message = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, tempAssistantMessage]);

      // 获取当前文件内容作为上下文
      const currentFile = files[selectedFileName];
      const fileContext = currentFile
        ? `文件名: ${currentFile.name}\n内容:\n${currentFile.value}`
        : "";

      // 定义更新回调函数
      const handleUpdate = (content: string) => {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content = content;
          }
          return newMessages;
        });
      };

      // 调用 AI API 获取流式响应
      await aiService.getAssistantResponse(
        userMessage.content,
        fileContext,
        messages.map(({ role, content }) => ({ role, content })),
        handleUpdate
      );

    } catch (error) {
      console.error("获取 AI 回答失败:", error);
      // 添加错误消息
      const errorMessage: Message = {
        role: "assistant",
        content: "抱歉，获取回答时出现错误，请稍后再试。",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除所有对话记录
  const clearConversation = () => {
    setMessages([]);
  };

  // 完全重置侧边栏 - 清除所有对话和输入
  const resetSidebar = () => {
    setMessages([]);
    setInputValue("");
    // 把输入框重置为默认高度
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    console.log("侧边栏已重置");
  };

  // 使用 ReactMarkdown 渲染消息内容
  const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const { files, selectedFileName, setDiffMode } = useContext(PlaygroundContext);
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");
    
    // 检查是否有选中文件且文件扩展名与代码语言匹配
    const canApply = () => {
      if (!selectedFileName || !files[selectedFileName]) return false;
      
      // 获取文件扩展名和代码语言
      const fileExt = selectedFileName.split('.').pop() || '';
      const codeLanguage = match ? match[1] : '';
      
      // 检查语言匹配
      // 针对常见语言进行匹配
      // 如 ts/tsx 对应 typescript/typescriptreact
      // js/jsx 对应 javascript/javascriptreact 等
      if (
        (fileExt === 'ts' && (codeLanguage === 'typescript' || codeLanguage === 'ts')) ||
        (fileExt === 'tsx' && (codeLanguage === 'typescriptreact' || codeLanguage === 'tsx')) ||
        (fileExt === 'js' && (codeLanguage === 'javascript' || codeLanguage === 'js')) ||
        (fileExt === 'jsx' && (codeLanguage === 'javascriptreact' || codeLanguage === 'jsx')) ||
        fileExt === codeLanguage
      ) {
        return true;
      }
      
      // 默认允许应用
      return true;
    };
    
    // 处理应用代码到编辑器
    const handleApplyCode = () => {
      if (!selectedFileName || !files[selectedFileName]) return;
      
      const currentFile = files[selectedFileName];
      
      // 获取当前内容和新内容
      const currentCode = currentFile.value;
      const newCode = code;
      
      // 如果内容相同，不需要更新
      if (currentCode === newCode) {
        alert("代码没有变化，无需应用");
        return;
      }
      
      // 设置差异编辑模式，并传入待应用的代码
      setDiffMode(true, newCode);
    };

    // 如果有语言标识，则渲染为代码块
    if (match) {
      return (
        <>
          <div className="code-block-wrapper">
            <div className="code-header">
              <span>{match[1]}</span>
              <div className="code-actions">
                <button
                  className="copy-button"
                  onClick={() => navigator.clipboard.writeText(code)}
                  title="复制代码"
                >
                  复制
                </button>
                {selectedFileName && canApply() && (
                  <button
                    className="apply-button"
                    onClick={handleApplyCode}
                    title={`应用到 ${selectedFileName}`}
                  >
                    应用
                  </button>
                )}
              </div>
            </div>
            <pre className="code-block">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          </div>
        </>
      );
    }

    // 否则渲染为内联代码
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  // 格式化消息内容（支持全部markdown格式）
  const formatMessage = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          // 其他自定义组件可以在这里添加
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`ai-sidebar-wrapper ${showAISidebar ? "show" : ""}`}>
      <div className={`ai-sidebar ${theme}`}>
        <div className="ai-sidebar-header">
          <div className="title-with-refresh">
            <h3>AI 助手</h3>
            <button
              className="title-refresh-button"
              onClick={resetSidebar}
              title="重置侧边栏"
            >
              <span className="refresh-icon">↻</span>
            </button>
          </div>
          <div className="header-buttons">
            {messages.length > 0 && (
              <button
                className="clear-button"
                onClick={clearConversation}
                title="清除当前对话"
              >
                清除对话
              </button>
            )}
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>向 AI 助手提问，获取编程帮助</p>
              <div className="suggestion-chips">
                <button onClick={() => setInputValue("解释这段代码的作用")}>
                  解释这段代码的作用
                </button>
                <button onClick={() => setInputValue("如何优化这个组件")}>
                  如何优化这个组件
                </button>
                <button onClick={() => setInputValue("帮我找出代码中的问题")}>
                  帮我找出代码中的问题
                </button>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.role === "user" ? "user-message" : "assistant-message"
                }`}
              >
                <div className="message-header">
                  <span className="message-role">
                    {message.role === "user" ? "你" : "AI 助手"}
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
            disabled={inputValue.trim() === "" || isLoading}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

// 使用React.memo包装组件以保持组件状态
export default memo(AISidebar);
