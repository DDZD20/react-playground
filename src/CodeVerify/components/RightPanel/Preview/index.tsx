import { useContext, useEffect, useRef, useState } from "react";
import { PlaygroundContext } from "../../../PlaygroundContext";
import iframeRaw from "./iframe.html?raw";
import { IMPORT_MAP_FILE_NAME } from "../../../files";
import CompilerWorker from "./compiler.worker?worker";

interface MessageData {
  data: {
    type: string;
    message?: string;
    logType?: 'log' | 'info' | 'warn' | 'error';
    content?: string;
  };
}

export default function Preview() {
  const { files, autoCompile, addConsoleLog, forceCompileCounter } = useContext(PlaygroundContext);
  const [compiledCode, setCompiledCode] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);

  const compilerWorkerRef = useRef<Worker>();
  const prevFilesRef = useRef(files);
  const prevForceCompileCounterRef = useRef(forceCompileCounter);
  // 记录是否已经执行过初始编译
  const initialCompileRef = useRef(false);

  useEffect(() => {
    if (!compilerWorkerRef.current) {
      compilerWorkerRef.current = new CompilerWorker();
      compilerWorkerRef.current.addEventListener("message", ({ data }) => {
        console.log("worker", data);
        if (data.type === "COMPILED_CODE") {
          setCompiledCode(data.data);
          setIsCompiling(false);
        } else {
          // console.log('error', data);
          setIsCompiling(false);
        }
      });
      
      // 在worker初始化完成后立即执行首次编译
      if (!initialCompileRef.current) {
        initialCompileRef.current = true;
        setIsCompiling(true);
        compilerWorkerRef.current.postMessage(files);
      }
    }
  }, []);

  // 文件更新时，根据autoCompile状态决定是否编译
  useEffect(() => {
    // 条件1：文件内容变化且自动编译已开启
    const shouldCompileOnChange = files !== prevFilesRef.current && autoCompile;
    // 条件2：强制编译计数器变化（手动点击编译按钮）
    const shouldCompileForced = forceCompileCounter !== prevForceCompileCounterRef.current;
    
    // 更新引用
    prevFilesRef.current = files;
    prevForceCompileCounterRef.current = forceCompileCounter;
    
    // 如果需要编译
    if (shouldCompileOnChange || shouldCompileForced) {
      // 显示编译中状态
      setIsCompiling(true);
      
      // 发送编译请求
      compilerWorkerRef.current?.postMessage(files);
    }
  }, [files, autoCompile, forceCompileCounter]);

  const getIframeUrl = () => {
    const res = iframeRaw
      .replace(
        '<script type="importmap"></script>',
        `<script type="importmap">${files[IMPORT_MAP_FILE_NAME].value}</script>`
      )
      .replace(
        '<script type="module" id="appSrc"></script>',
        `<script type="module" id="appSrc">${compiledCode}</script>`
      );
    return URL.createObjectURL(new Blob([res], { type: "text/html" }));
  };

  useEffect(() => {
    setIframeUrl(getIframeUrl());
  }, [files[IMPORT_MAP_FILE_NAME].value, compiledCode]);

  const [iframeUrl, setIframeUrl] = useState(getIframeUrl());

  const handleMessage = (msg: MessageData) => {
    const { type, message, logType, content } = msg.data;
    
    if (type === "ERROR") {
      // 将错误添加到控制台日志
      if (message) {
        addConsoleLog({
          type: 'error',
          content: message
        });
      }
    } else if (type === "CONSOLE" && logType && content) {
      // 处理console输出消息
      addConsoleLog({
        type: logType,
        content
      });
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // 发送初始日志，表示应用已启动
  useEffect(() => {
    if (compiledCode) {
      addConsoleLog({
        type: 'info',
        content: '应用已重新编译并加载'
      });
    }
  }, [compiledCode]);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {isCompiling && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "8px 16px",
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          zIndex: 100,
          textAlign: "center",
          fontSize: "14px"
        }}>
          编译中...
        </div>
      )}
      <iframe
        src={iframeUrl}
        style={{
          width: "100%",
          height: "100%",
          padding: 0,
          border: "none",
        }}
      />
    </div>
  );
}
