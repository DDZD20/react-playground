import { Allotment } from "allotment";
import "allotment/dist/style.css";
import Header from "./components/Header";
import CodeEditor from "./components/CodeEditor";
import RightPanel from "./components/RightPanel";
import { useContext, useEffect, useState } from "react";
import { PlaygroundContext } from "./PlaygroundContext";
import AISidebar from "./components/AISidebar";
// import VideoChat from "./components/VideoChat/index";
import { useSearchParams } from "react-router-dom";
import socketService from "./services/SocketService";
import { message } from "antd";
import { UserRole } from "../api/types";

import "./index.scss";

export default function ReactPlayground() {
  const { theme, showAISidebar, toggleAISidebar } =
    useContext(PlaygroundContext);
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId');
  const isHost = searchParams.get('isHost') === 'true';
  // const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  // 初始化socket连接
  useEffect(() => {
    // 检查必要参数
    if (!roomId) {
      setSocketError("房间ID缺失，无法建立连接");
      return;
    }

    // 获取用户信息 - 从localStorage的user_info中获取
    const userInfoStr = localStorage.getItem('user_info');
    // 获取认证令牌
    const token = localStorage.getItem('auth_token');
    
    if (!userInfoStr) {
      setSocketError("用户信息缺失，无法建立连接");
      return;
    }
    
    if (!token) {
      setSocketError("认证令牌缺失，无法建立连接");
      return;
    }

    try {
      const userInfo = JSON.parse(userInfoStr);
      const userId = userInfo.id;
      const userName = userInfo.username;

      if (!userId || !userName) {
        setSocketError("用户信息不完整，无法建立连接");
        return;
      }

      // 初始化socket连接
      const initializeSocket = async () => {
        try {
          // 连接到socket服务器，并传递token
          const connected = await socketService.connect(
            'ws://localhost:3000',
            userId,
            userName,
            token // 添加token参数
          );

          if (connected) {
            // setSocketConnected(true);
            console.log("已连接到服务器");

            // 加入房间
            socketService.joinRoom(
              roomId,
              isHost ? 'host' as UserRole : 'interviewer' as UserRole
            );
          } else {
            setSocketError("无法连接到服务器");
          }
        } catch (error) {
          setSocketError(`连接错误: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      };

      initializeSocket();
    } catch (error) {
      setSocketError("解析用户信息失败");
      console.error("解析用户信息失败:", error);
    }

    // 组件卸载时断开连接
    return () => {
      socketService.disconnect();
    };
  }, [roomId, isHost]);

  // 显示错误提示
  useEffect(() => {
    if (socketError) {
      message.error(socketError);
    }
  }, [socketError]);

  return (
    <div className={theme} style={{ height: "100vh" }}>
      <Header />
      <div style={{ position: "relative", height: "calc(100% - 50px)" }}>
        <Allotment defaultSizes={[100, 100]}>
          <Allotment.Pane minSize={0}>
            <CodeEditor />
          </Allotment.Pane>
          <Allotment.Pane minSize={0}>
            <RightPanel />
          </Allotment.Pane>
        </Allotment>

        {/* AI 侧栏切换按钮 */}
        <button
          className="ai-sidebar-toggle"
          onClick={toggleAISidebar}
          style={{
            position: "fixed" /* 使用fixed定位，与侧边栏保持一致 */,
            right: showAISidebar
              ? "min(33.33%, 500px)"
              : 0 /* 与侧栏宽度精确匹配 */,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 998 /* 置于侧边栏之下但高于其他元素 */,
            background: theme === "dark" ? "#333" : "#f0f0f0",
            border: "none",
            borderRadius: showAISidebar ? "4px 0 0 4px" : "4px",
            padding: "8px",
            cursor: "pointer",
            boxShadow: "0 0 5px rgba(0,0,0,0.2)",
            transition: "right 0.3s ease",
          }}
        >
          {showAISidebar ? ">" : "<"}
        </button>

        {/* 始终渲染 AI 侧栏，通过CSS控制显示隐藏 */}
        <AISidebar />
        {/* <VideoChat /> */}
      </div>
    </div>
  );
}
