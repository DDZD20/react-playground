import { useContext, useRef, useState, useEffect } from "react";
import Editor from "./Editor";
import FileNameList from "./FileNameList";
import { PlaygroundContext } from "../../PlaygroundContext";
import { debounce } from 'lodash-es';
import * as monaco from 'monaco-editor';
import { Button, Tooltip, Switch } from 'antd';
import { PlayCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import styles from './styles.module.scss';
import socketService from "../../services/SocketService";
import { SocketEvent } from "../../services/type";
import { mergeActions } from "../../services/CodeAnalysisService";

export default function CodeEditor() {
    const { 
        theme,
        files, 
        setFiles, 
        selectedFileName,
        isDiffMode,
        pendingCode,
        setDiffMode,
        autoCompile,
        setAutoCompile,
        needsCompile,
        setNeedsCompile,
        compileCode
    } = useContext(PlaygroundContext);

    const file = files[selectedFileName];
    // socket连接状态
    const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
    
    // 创建对编辑器实例的引用
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    // 创建对获取行为片段函数的引用
    const getCodingActionsRef = useRef<(() => any[]) | null>(null);

    // 监听socket连接状态
    useEffect(() => {
        // 立即检查当前连接状态
        setIsSocketConnected(socketService.isConnected());
        
        // 订阅连接事件
        const handleConnect = () => {
            setIsSocketConnected(true);
        };
        
        // 订阅断开事件
        const handleDisconnect = () => {
            setIsSocketConnected(false);
        };
        
        socketService.on(SocketEvent.CONNECT, handleConnect);
        socketService.on(SocketEvent.DISCONNECT, handleDisconnect);
        
        return () => {
            socketService.off(SocketEvent.CONNECT, handleConnect);
            socketService.off(SocketEvent.DISCONNECT, handleDisconnect);
        };
    }, []);

    function onEditorChange(value?: string) {
        if (!isDiffMode) {
            files[file.name].value = value!;
            // 只更新文件内容，不触发编译
            setFiles({ ...files });
            
            // 如果开启了自动编译，则直接编译；否则标记为需要编译
            if (autoCompile) {
                compileCode();
            } else {
                setNeedsCompile(true);
            }
        }
    }
    
    // 处理编辑器挂载
    const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;
    };

    // 应用差异编辑器中的更改
    const applyChanges = () => {
        if (pendingCode !== null && selectedFileName) {
            // 退出差异模式
            setDiffMode(false, null);
            
            // 等待下一个渲染周期，确保普通编辑器已挂载
            setTimeout(() => {
                if (editorRef.current && editorRef.current.getModel()) {
                    // 使用编辑器的 API 应用更改，这样会记录在撤销栈中
                    editorRef.current.executeEdits('ai-apply', [
                        {
                            range: editorRef.current.getModel()!.getFullModelRange(),
                            text: pendingCode,
                            forceMoveMarkers: true
                        }
                    ]);
                    
                    // 设置焦点以便用户可以立即使用 Ctrl+Z
                    editorRef.current.focus();
                } else {
                    // 如果编辑器还没准备好，回退到状态更新方式
                    const currentFile = files[selectedFileName];
                    setFiles({
                        ...files,
                        [selectedFileName]: {
                            ...currentFile,
                            value: pendingCode
                        }
                    });
                }
                
                // 标记为需要编译
                setNeedsCompile(true);
            }, 50); // 短暂延迟以确保编辑器挂载
        }
    };
    
    // 取消差异编辑器中的更改
    const cancelChanges = () => {
        // 直接退出差异模式，不应用更改
        setDiffMode(false, null);
    };
    
    // 处理自动编译开关切换
    const handleAutoCompileToggle = (checked: boolean) => {
        setAutoCompile(checked);
        // 如果打开自动编译且当前有需要编译的代码，立即编译
        if (checked && needsCompile) {
            compileCode();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <FileNameList/>
            
            <div className={styles.editorContainer}>
                <Editor 
                    file={file} 
                    onChange={debounce(onEditorChange, 500)} 
                    options={{
                        theme: `vs-${theme}`
                    }}
                    onMount={handleEditorDidMount}
                    isDiffMode={isDiffMode}
                    originalCode={file.value}
                    pendingCode={pendingCode || ''}
                    onApplyChanges={applyChanges}
                    onCancelChanges={cancelChanges}
                    onGetCodingActions={(getActions) => {
                        getCodingActionsRef.current = getActions;
                    }}
                />
                
                {/* 底部工具栏 */}
                <div className={styles.editorToolbar}>
                    <div className={styles.toolbarLeft}>
                        <Tooltip title={autoCompile ? "自动编译已启用" : "自动编译已禁用"}>
                            <span className={styles.autoCompileToggle}>
                                <ThunderboltOutlined className={autoCompile ? styles.active : ''} />
                                <Switch 
                                    size="small" 
                                    checked={autoCompile} 
                                    onChange={handleAutoCompileToggle}
                                    className={styles.compileSwitch}
                                />
                                <span className={styles.toggleLabel}>自动编译</span>
                            </span>
                        </Tooltip>
                        
                        {/* Socket连接状态指示器 */}
                        <Tooltip title={isSocketConnected ? "Socket已连接" : "Socket已断开"}>
                            <div className={`${styles.socketIndicator} ${isSocketConnected ? styles.connected : styles.disconnected}`}></div>
                        </Tooltip>
                    </div>
                    
                    <div className={styles.toolbarRight}>
                        <Button 
                            type="primary" 
                            icon={<PlayCircleOutlined />}
                            onClick={() => {
                                // 获取并打印行为片段
                                if (getCodingActionsRef.current) {
                                    const actions = getCodingActionsRef.current();
                                    console.log('用户编码行为片段:', mergeActions(actions) );
                                }
                                // 执行编译
                                compileCode();
                            }}
                            className={needsCompile ? styles.needsCompile : ''}
                            disabled={autoCompile && !needsCompile}
                        >
                            编译并运行
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
