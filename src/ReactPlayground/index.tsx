import { Allotment } from "allotment";
import "allotment/dist/style.css";
import Header from "./components/Header";
import CodeEditor from "./components/CodeEditor";
import RightPanel from "./components/RightPanel";
import { useContext } from "react";
import { PlaygroundContext } from "./PlaygroundContext";
import AISidebar from "./components/AISidebar";

import "./index.scss";

export default function ReactPlayground() {
  const { theme, showAISidebar, toggleAISidebar } =
    useContext(PlaygroundContext);

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
      </div>
    </div>
  );
}
