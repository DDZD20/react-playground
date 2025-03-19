import { useContext, useRef } from "react";
import Editor from "./Editor";
import FileNameList from "./FileNameList";
import { PlaygroundContext } from "../../PlaygroundContext";
import { debounce } from 'lodash-es';
import * as monaco from 'monaco-editor';

export default function CodeEditor() {
    const { 
        theme,
        files, 
        setFiles, 
        selectedFileName,
        isDiffMode,
        pendingCode,
        setDiffMode
    } = useContext(PlaygroundContext);

    const file = files[selectedFileName];
    
    // 创建对编辑器实例的引用
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    function onEditorChange(value?: string) {
        if (!isDiffMode) {
            files[file.name].value = value!;
            setFiles({ ...files });
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
            }, 50); // 短暂延迟以确保编辑器挂载
        }
    };
    
    // 取消差异编辑器中的更改
    const cancelChanges = () => {
        // 直接退出差异模式，不应用更改
        setDiffMode(false, null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <FileNameList/>
            
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
            />
        </div>
    );
}
